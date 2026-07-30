import type { MaybePromise } from "./types";

/**
 * Pluggable source for the partner access token.
 *
 * The token is read on **every** request, so pointing this at a file, database
 * or secret manager lets a long-running process pick up a newly issued token
 * without being rebuilt. All methods may be synchronous or return a promise.
 */
export interface TokenStore {
  getToken(): MaybePromise<string | null>;
  setToken(token: string | null): MaybePromise<void>;
  clear(): MaybePromise<void>;
}

/**
 * Optional extension: a store that can also persist the refresh token.
 *
 * Implementing this is not required — a {@link TokenStore} written against 1.0.x
 * keeps working. When the injected store does not implement it, the SDK holds the
 * refresh token in memory for the client's lifetime; the only consequence is that
 * a process restart needs a fresh `auth.connect` instead of `auth.refresh`.
 */
export interface RefreshTokenStore extends TokenStore {
  getRefreshToken(): MaybePromise<string | null>;
  setRefreshToken(token: string | null): MaybePromise<void>;
}

/** True when a store can persist the refresh token as well as the access token. */
export function isRefreshTokenStore(store: TokenStore): store is RefreshTokenStore {
  const candidate = store as Partial<RefreshTokenStore>;
  return typeof candidate.getRefreshToken === "function"
    && typeof candidate.setRefreshToken === "function";
}

/** In-memory token store (default). Tokens are lost when the process exits. */
export class MemoryTokenStore implements RefreshTokenStore {
  #token: string | null;
  #refreshToken: string | null;

  constructor(token?: string | null, refreshToken?: string | null) {
    this.#token = token ?? null;
    this.#refreshToken = refreshToken ?? null;
  }

  getToken(): string | null {
    return this.#token;
  }

  setToken(token: string | null): void {
    this.#token = token;
  }

  getRefreshToken(): string | null {
    return this.#refreshToken;
  }

  setRefreshToken(token: string | null): void {
    this.#refreshToken = token;
  }

  clear(): void {
    this.#token = null;
    this.#refreshToken = null;
  }
}
