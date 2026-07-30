export { BulutklinikClient } from "./client";

export { MemoryTokenStore, isRefreshTokenStore } from "./token-store";
export type { RefreshTokenStore, TokenStore } from "./token-store";

export { ENVIRONMENT_API_ROOTS, resolveBaseUrl } from "./config";
export type { ApiVersion, ClientOptions, Environment, FetchLike } from "./config";

export type { AuthMode, RequestSpec } from "./http";

export {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  BulutklinikError,
  NotFoundError,
  RateLimitError,
  TransportError,
  ValidationError,
} from "./errors";

export { ResultType } from "./types";
export type { Envelope, Lang, ResultTypeValue } from "./types";

export { AppointmentsResource } from "./resources/appointments";
export { AuthResource } from "./resources/auth";
export { DietsResource } from "./resources/diets";
export { DoctorsResource } from "./resources/doctors";
export { LaboratoryResource } from "./resources/laboratory";
export { MeasuresResource } from "./resources/measures";
export { SlotsResource } from "./resources/slots";

export * from "./models";
