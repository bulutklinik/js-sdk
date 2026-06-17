import type { MaybePromise } from "./types";

/**
 * Pluggable token persistence. The default is in-memory; provide a custom
 * implementation to persist tokens to a file, database or secure storage.
 * All methods may be synchronous or return a promise.
 */
export interface TokenStore {
  getAccessToken(): MaybePromise<string | null>;
  getRefreshToken(): MaybePromise<string | null>;
  setTokens(accessToken: string, refreshToken: string | null): MaybePromise<void>;
  clear(): MaybePromise<void>;
}

/** In-memory token store (default). Tokens are lost when the process exits. */
export class MemoryTokenStore implements TokenStore {
  #access: string | null;
  #refresh: string | null;

  constructor(seed?: { accessToken?: string | null; refreshToken?: string | null }) {
    this.#access = seed?.accessToken ?? null;
    this.#refresh = seed?.refreshToken ?? null;
  }

  getAccessToken(): string | null {
    return this.#access;
  }

  getRefreshToken(): string | null {
    return this.#refresh;
  }

  setTokens(accessToken: string, refreshToken: string | null): void {
    this.#access = accessToken;
    this.#refresh = refreshToken;
  }

  clear(): void {
    this.#access = null;
    this.#refresh = null;
  }
}
