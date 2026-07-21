export { BulutklinikClient } from "./client";

export { MemoryTokenStore } from "./token-store";
export type { TokenStore } from "./token-store";

export { ENVIRONMENT_BASE_URLS } from "./config";
export type { ClientOptions, Environment, FetchLike } from "./config";

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

export { AuthResource } from "./resources/auth";
export { DoctorsResource } from "./resources/doctors";
export { SlotsResource } from "./resources/slots";
export { AppointmentsResource } from "./resources/appointments";
export { PaymentsResource } from "./resources/payments";
export { MeasuresResource } from "./resources/measures";
export { SkinResource } from "./resources/skin";
export { MealsResource } from "./resources/meals";
export { LaboratoryResource } from "./resources/laboratory";
export { DietsResource } from "./resources/diets";
export { AddressesResource } from "./resources/addresses";

export * from "./models";
