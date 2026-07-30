import type { MaybePromise } from "./types";

/**
 * Pluggable source for the partner token.
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

/** In-memory token store (default). The token is lost when the process exits. */
export class MemoryTokenStore implements TokenStore {
  #token: string | null;

  constructor(token?: string | null) {
    this.#token = token ?? null;
  }

  getToken(): string | null {
    return this.#token;
  }

  setToken(token: string | null): void {
    this.#token = token;
  }

  clear(): void {
    this.#token = null;
  }
}
