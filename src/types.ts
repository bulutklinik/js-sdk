/** Supported UI/content languages for the `lang` header. */
export type Lang = "tr" | "en" | "de" | "az";

/**
 * Envelope `resultType` state codes returned by the Bulutklinik API.
 * A call is successful only when HTTP is 2xx AND resultType === Success (0).
 */
export const ResultType = {
  Success: 0,
  Error: 1,
  Logout: 2,
  Update: 3,
  Refresh: 4,
} as const;

export type ResultTypeValue = (typeof ResultType)[keyof typeof ResultType];

/** The standard response envelope wrapping every API response. */
export interface Envelope<T = unknown> {
  resultType?: number;
  /** May be a string label or a numeric code depending on the endpoint. */
  errorType?: string | number;
  errorMessage?: string;
  successMessage?: string;
  data?: T;
}

export type MaybePromise<T> = T | Promise<T>;
