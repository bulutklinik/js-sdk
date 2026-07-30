import { MemoryTokenStore, type TokenStore } from "./token-store";
import type { Lang } from "./types";

export type Environment = "production" | "test" | "local";

/** The API version segment appended to the environment's API root. */
export type ApiVersion = "v3" | "v4";

/**
 * API roots per environment. The base URL is `<root>/<apiVersion>` — see
 * {@link resolveBaseUrl}.
 */
export const ENVIRONMENT_API_ROOTS: Record<Environment, string> = {
  production: "https://api.bulutklinik.com/api",
  test: "https://apitest.bulutklinik.com/api",
  local: "https://api-bulutklinik.test/api",
};

/** Compose the base URL for an environment + API version. */
export function resolveBaseUrl(
  environment: Environment = "production",
  apiVersion: ApiVersion = "v3",
): string {
  return `${ENVIRONMENT_API_ROOTS[environment]}/${apiVersion}`;
}

export type FetchLike = typeof fetch;

export interface ClientOptions {
  /** Named environment preset. Ignored when `baseUrl` is provided. Default: `production`. */
  environment?: Environment;
  /**
   * API version segment. Ignored when `baseUrl` is provided. Default: `v3`.
   * The `/outher` surface is route-for-route identical on both versions.
   */
  apiVersion?: ApiVersion;
  /** Explicit base URL (e.g. `https://api.bulutklinik.com/api/v3`). Overrides `environment` + `apiVersion`. */
  baseUrl?: string;
  /** Default `lang` header. Default: `tr`. */
  lang?: Lang;
  /**
   * OAuth client id from your portal application. Required by `auth.connect`
   * and by the silent refresh.
   */
  clientId?: string;
  /** OAuth client secret from your portal application. */
  clientSecret?: string;
  /**
   * An already-minted partner access token, for callers who do not want the SDK
   * to log in. Seeds the default in-memory token store. Mutually exclusive with
   * `tokenStore`.
   */
  partnerToken?: string;
  /**
   * Pluggable token source, read on every request so a long-running process can
   * rotate the credential without being rebuilt. Mutually exclusive with
   * `partnerToken`. Default: in-memory.
   */
  tokenStore?: TokenStore;
  /** Per-request timeout in milliseconds. Default: 30000. */
  timeoutMs?: number;
  /** Injectable fetch implementation. Default: global `fetch`. */
  fetch?: FetchLike;
}

export interface ResolvedConfig {
  baseUrl: string;
  lang: Lang;
  clientId: string | undefined;
  clientSecret: string | undefined;
  tokenStore: TokenStore;
  timeoutMs: number;
  fetchImpl: FetchLike;
}

export function resolveConfig(options: ClientOptions = {}): ResolvedConfig {
  // Either the literal or the store is the source of truth for the credential.
  // Guessing which one the caller meant is how credential bugs get shipped.
  if (options.partnerToken !== undefined && options.tokenStore !== undefined) {
    throw new Error(
      "Pass either partnerToken or tokenStore, not both. " +
        "Seed your own store with the token if you need custom persistence.",
    );
  }

  const base =
    options.baseUrl ??
    resolveBaseUrl(options.environment ?? "production", options.apiVersion ?? "v3");
  // Use the caller's fetch as-is; bind the global default to `globalThis` so it
  // works when called detached from its receiver (browsers otherwise throw
  // "Illegal invocation"). Node's fetch is unaffected either way.
  const fetchImpl =
    options.fetch ??
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : undefined);
  if (typeof fetchImpl !== "function") {
    throw new Error(
      "No fetch implementation available. Provide options.fetch or run on Node >= 18.",
    );
  }
  return {
    baseUrl: base.replace(/\/+$/, ""),
    lang: options.lang ?? "tr",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    tokenStore: options.tokenStore ?? new MemoryTokenStore(options.partnerToken),
    timeoutMs: options.timeoutMs ?? 30_000,
    fetchImpl,
  };
}
