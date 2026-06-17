import type { FetchLike, ResolvedConfig } from "./config";
import {
  TransportError,
  createApiError,
  type ApiError,
  type ApiErrorContext,
} from "./errors";
import type { TokenStore } from "./token-store";
import { ResultType, type Envelope, type Lang } from "./types";

export type AuthMode = "public" | "bearer" | "partner";

export interface RequestSpec {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  auth: AuthMode;
  body?: unknown;
  lang?: Lang;
}

/**
 * Low-level transport. Builds requests, unwraps the response envelope, maps
 * failures to typed errors, and performs a single silent token refresh + retry
 * on a 401 / `resultType 4`. Concurrent refreshes share one in-flight promise.
 */
export class HttpClient {
  readonly tokenStore: TokenStore;
  readonly clientId: string | undefined;
  readonly clientSecret: string | undefined;

  private readonly baseUrl: string;
  private readonly lang: Lang;
  private readonly partnerToken: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;
  private refreshInFlight: Promise<void> | null = null;

  constructor(config: ResolvedConfig) {
    this.baseUrl = config.baseUrl;
    this.lang = config.lang;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.partnerToken = config.partnerToken;
    this.tokenStore = config.tokenStore;
    this.timeoutMs = config.timeoutMs;
    this.fetchImpl = config.fetchImpl;
  }

  request<T>(spec: RequestSpec): Promise<T> {
    return this.send<T>(spec, false);
  }

  /** Force a token refresh using the stored refresh token. Throws on failure. */
  async refresh(): Promise<void> {
    await this.performRefresh();
  }

  private async send<T>(spec: RequestSpec, isRetry: boolean): Promise<T> {
    const response = await this.dispatch(spec);
    const envelope = await this.readEnvelope(response);

    if (response.ok && envelope.resultType === ResultType.Success) {
      return envelope.data as T;
    }

    const expired = response.status === 401 || envelope.resultType === ResultType.Refresh;
    if (spec.auth === "bearer" && expired && !isRetry) {
      const refreshed = await this.ensureRefreshed();
      if (refreshed) {
        return this.send<T>(spec, true);
      }
    }

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

    if (spec.auth === "bearer") {
      const token = await this.tokenStore.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } else if (spec.auth === "partner") {
      if (this.partnerToken) headers.Authorization = `Bearer ${this.partnerToken}`;
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

  private async ensureRefreshed(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.performRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }
    try {
      await this.refreshInFlight;
      return true;
    } catch {
      return false;
    }
  }

  private async performRefresh(): Promise<void> {
    const refreshToken = await this.tokenStore.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token available");
    if (!this.clientId || !this.clientSecret) {
      throw new Error("clientId and clientSecret are required to refresh tokens");
    }

    const response = await this.dispatch({
      method: "POST",
      path: "/general/refreshApi",
      auth: "public",
      body: { refreshToken, clientId: this.clientId, clientSecretKey: this.clientSecret },
    });
    const envelope = await this.readEnvelope(response);
    const data = envelope.data as { access_token?: string; refresh_token?: string } | undefined;

    if (!response.ok || envelope.resultType !== ResultType.Success || !data?.access_token) {
      await this.tokenStore.clear();
      throw new Error("Token refresh failed");
    }
    await this.tokenStore.setTokens(data.access_token, data.refresh_token ?? refreshToken);
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
