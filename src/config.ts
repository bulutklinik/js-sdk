import { MemoryTokenStore, type TokenStore } from "./token-store";
import type { Lang } from "./types";

export type Environment = "production" | "test" | "local";

export const ENVIRONMENT_BASE_URLS: Record<Environment, string> = {
  production: "https://api.bulutklinik.com/api/v3",
  test: "https://apitest.bulutklinik.com/api/v3",
  local: "https://api-bulutklinik.test/api/v3",
};

export type FetchLike = typeof fetch;

export interface ClientOptions {
  /** Named environment preset. Ignored when `baseUrl` is provided. Default: `production`. */
  environment?: Environment;
  /** Explicit base URL (e.g. `https://api.bulutklinik.com/api/v3`). Overrides `environment`. */
  baseUrl?: string;
  /** Default `lang` header. Default: `tr`. */
  lang?: Lang;
  /** OAuth client id — used by `auth.connect` and for token refresh. */
  clientId?: string;
  /** OAuth client secret — used by `auth.connect` and for token refresh. */
  clientSecret?: string;
  /** Bearer token for the partner (`teusan`) endpoint. */
  partnerToken?: string;
  /** Pluggable token persistence. Default: in-memory. */
  tokenStore?: TokenStore;
  /** Per-request timeout in milliseconds. Default: 30000. */
  timeoutMs?: number;
  /** Injectable fetch implementation. Default: global `fetch`. */
  fetch?: FetchLike;
}

export interface ResolvedConfig {
  baseUrl: string;
  lang: Lang;
  clientId?: string;
  clientSecret?: string;
  partnerToken?: string;
  tokenStore: TokenStore;
  timeoutMs: number;
  fetchImpl: FetchLike;
}

export function resolveConfig(options: ClientOptions = {}): ResolvedConfig {
  const base = options.baseUrl ?? ENVIRONMENT_BASE_URLS[options.environment ?? "production"];
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
    partnerToken: options.partnerToken,
    tokenStore: options.tokenStore ?? new MemoryTokenStore(),
    timeoutMs: options.timeoutMs ?? 30_000,
    fetchImpl,
  };
}
