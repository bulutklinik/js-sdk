import type { FetchLike, ResolvedConfig } from "./config";
import {
  AuthenticationError,
  TransportError,
  createApiError,
  type ApiError,
  type ApiErrorContext,
} from "./errors";
import type { TokenStore } from "./token-store";
import { ResultType, type Envelope, type Lang } from "./types";

/**
 * `partner` sends the configured partner token; `public` sends no
 * `Authorization` header. Every endpoint in the SDK is `partner` — `public` is
 * only reachable through the escape hatch (`client.request`).
 */
export type AuthMode = "partner" | "public";

export interface RequestSpec {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  auth: AuthMode;
  body?: unknown;
  lang?: Lang;
}

/**
 * Low-level transport. Builds requests, unwraps the response envelope and maps
 * failures to typed errors.
 *
 * There is no silent refresh: a partner token is issued out of band and cannot
 * be renewed from here, so an expired one (`401` / `resultType 4`) surfaces as
 * an `AuthenticationError` instead of being retried.
 */
export class HttpClient {
  readonly tokenStore: TokenStore;

  private readonly baseUrl: string;
  private readonly lang: Lang;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(config: ResolvedConfig) {
    this.baseUrl = config.baseUrl;
    this.lang = config.lang;
    this.tokenStore = config.tokenStore;
    this.timeoutMs = config.timeoutMs;
    this.fetchImpl = config.fetchImpl;
  }

  async request<T>(spec: RequestSpec): Promise<T> {
    const response = await this.dispatch(spec);
    const envelope = await this.readEnvelope(response);

    if (response.ok && envelope.resultType === ResultType.Success) {
      return envelope.data as T;
    }

    // A revoked token is worth forgetting; an expired one is not, since the
    // caller may want to inspect it while installing a replacement.
    if (envelope.resultType === ResultType.Logout) {
      await this.tokenStore.clear();
    }

    throw this.toError(spec, response, envelope);
  }

  private async dispatch(spec: RequestSpec): Promise<Response> {
    const url = this.baseUrl + spec.path;
    const headers: Record<string, string> = {
      Accept: "application/json",
      lang: spec.lang ?? this.lang,
    };
    const hasBody = spec.body !== undefined && spec.method !== "GET";
    if (hasBody) headers["Content-Type"] = "application/json";

    if (spec.auth === "partner") {
      const token = await this.tokenStore.getToken();
      if (!token) {
        // Dispatching anyway would only come back as an opaque 401.
        throw new AuthenticationError("No partner token configured.", {
          httpStatus: 0,
          method: spec.method,
          path: spec.path,
        });
      }
      headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, {
        method: spec.method,
        headers,
        body: hasBody ? JSON.stringify(spec.body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new TransportError(
          `Request ${spec.method} ${spec.path} timed out after ${this.timeoutMs}ms`,
          error,
        );
      }
      throw new TransportError(`Network error on ${spec.method} ${spec.path}`, error);
    } finally {
      clearTimeout(timer);
    }
  }

  private async readEnvelope(response: Response): Promise<Envelope> {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as Envelope;
    } catch {
      // Non-JSON body — not expected for the covered endpoints.
      return { errorMessage: text };
    }
  }

  private toError(spec: RequestSpec, response: Response, envelope: Envelope): ApiError {
    const retryAfterHeader = response.headers.get("retry-after");
    const ctx: ApiErrorContext = {
      httpStatus: response.status,
      resultType: envelope.resultType,
      errorType: envelope.errorType,
      data: envelope.data,
      method: spec.method,
      path: spec.path,
      retryAfter: retryAfterHeader ? Number(retryAfterHeader) : undefined,
    };
    const message =
      envelope.errorMessage ??
      `Bulutklinik API request failed: ${spec.method} ${spec.path} (HTTP ${response.status})`;
    return createApiError(ctx, message);
  }
}
