export interface ApiErrorContext {
  httpStatus: number;
  resultType?: number;
  errorType?: string | number;
  data?: unknown;
  method: string;
  path: string;
  retryAfter?: number;
}

/** Base class for every error thrown by the SDK. */
export class BulutklinikError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Network failure, timeout, DNS or TLS error — no HTTP response was received. */
export class TransportError extends BulutklinikError {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

/** An HTTP response was received but the call was not successful. */
export class ApiError extends BulutklinikError {
  readonly httpStatus: number;
  readonly resultType: number | undefined;
  readonly errorType: string | number | undefined;
  readonly data: unknown;
  readonly method: string;
  readonly path: string;

  constructor(message: string, ctx: ApiErrorContext) {
    super(message);
    this.httpStatus = ctx.httpStatus;
    this.resultType = ctx.resultType;
    this.errorType = ctx.errorType;
    this.data = ctx.data;
    this.method = ctx.method;
    this.path = ctx.path;
  }
}

/** 422 / errorType=validation. */
export class ValidationError extends ApiError {}
/** 401, a logout (resultType 2), or a failed token refresh. */
export class AuthenticationError extends ApiError {}
/** 403 — authenticated but not permitted / out of scope. */
export class AuthorizationError extends ApiError {}
/** 404. */
export class NotFoundError extends ApiError {}

/** 429 — throttled. Carries `retryAfter` (seconds) when the header is present. */
export class RateLimitError extends ApiError {
  readonly retryAfter: number | undefined;

  constructor(message: string, ctx: ApiErrorContext) {
    super(message, ctx);
    this.retryAfter = ctx.retryAfter;
  }
}

/**
 * Map an API failure to the most specific error type.
 * Precedence: logout (resultType 2) → errorType=validation → HTTP status.
 */
export function createApiError(ctx: ApiErrorContext, message: string): ApiError {
  if (ctx.resultType === 2) return new AuthenticationError(message, ctx);

  const type = typeof ctx.errorType === "string" ? ctx.errorType.toLowerCase() : undefined;
  if (type === "validation" || ctx.httpStatus === 422) {
    return new ValidationError(message, ctx);
  }

  switch (ctx.httpStatus) {
    case 401:
      return new AuthenticationError(message, ctx);
    case 403:
      return new AuthorizationError(message, ctx);
    case 404:
      return new NotFoundError(message, ctx);
    case 429:
      return new RateLimitError(message, ctx);
    default:
      return new ApiError(message, ctx);
  }
}
