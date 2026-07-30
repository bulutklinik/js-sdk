import { resolveConfig, type ClientOptions } from "./config";
import { HttpClient, type AuthMode, type RequestSpec } from "./http";
import type { Lang } from "./types";
import { AppointmentsResource } from "./resources/appointments";
import { AuthResource } from "./resources/auth";
import { DietsResource } from "./resources/diets";
import { DoctorsResource } from "./resources/doctors";
import { LaboratoryResource } from "./resources/laboratory";
import { MeasuresResource } from "./resources/measures";
import { SlotsResource } from "./resources/slots";
import type { TokenStore } from "./token-store";

/**
 * The Bulutklinik partner API client. Construct once and reuse; service groups
 * are exposed as properties.
 *
 * Every data call runs on the company-scoped `/outher` surface: you see the
 * patients of **your own company**, and the patient is named inline on each
 * request — there is no patient session.
 *
 * @example
 * ```ts
 * const client = new BulutklinikClient({
 *   environment: "test",
 *   clientId: process.env.BK_CLIENT_ID,
 *   clientSecret: process.env.BK_CLIENT_SECRET,
 * });
 *
 * await client.auth.connect({
 *   apiUserName: process.env.BK_SERVICE_IDENTITY!,
 *   apiUserPassword: process.env.BK_PASSWORD!,
 * });
 *
 * const branches = await client.doctors.branches();
 * const measures = await client.measures.last({ identityNumber: "12345678901" });
 * ```
 *
 * Already holding a token? Pass `partnerToken` instead and skip `auth.connect`.
 */
export class BulutklinikClient {
  /** Obtain, refresh and revoke the access token. */
  readonly auth: AuthResource;
  /** Doctor discovery: search, branches, detail, city list. */
  readonly doctors: DoctorsResource;
  /** Doctor availability (materialized slots). */
  readonly slots: SlotsResource;
  /** Reserve, confirm, free-form booking, cancel, list, lookup. */
  readonly appointments: AppointmentsResource;
  /** Health measurements for a named patient, read and write. */
  readonly measures: MeasuresResource;
  /** Lab results for a named patient + the orderable test catalog. */
  readonly laboratory: LaboratoryResource;
  /** Diet lists written by a dietitian, for a named patient. */
  readonly diets: DietsResource;
  /**
   * The active token store. Write a newly issued partner token here to rotate
   * the credential without rebuilding the client.
   */
  readonly tokenStore: TokenStore;

  private readonly http: HttpClient;

  constructor(options?: ClientOptions) {
    const config = resolveConfig(options);
    this.http = new HttpClient(config);
    this.tokenStore = config.tokenStore;

    this.auth = new AuthResource(this.http);
    this.doctors = new DoctorsResource(this.http);
    this.slots = new SlotsResource(this.http);
    this.appointments = new AppointmentsResource(this.http);
    this.measures = new MeasuresResource(this.http);
    this.laboratory = new LaboratoryResource(this.http);
    this.diets = new DietsResource(this.http);
  }

  /**
   * Escape hatch: call any Bulutklinik API endpoint that does not yet have a
   * typed resource method. The request still goes through the shared transport,
   * so default headers, the chosen `auth` mode (`partner` by default), envelope
   * unwrapping and typed errors all apply. Returns the unwrapped `data` payload.
   * Prefer a typed resource method when one exists.
   *
   * @example
   * ```ts
   * const branches = await client.request({ method: "GET", path: "/outher/branches" });
   *
   * // `public` reaches the handful of unauthenticated endpoints outside the
   * // partner surface — e.g. the city/district catalogue.
   * const config = await client.request({
   *   method: "GET",
   *   path: "/general/getConfig",
   *   auth: "public",
   * });
   * ```
   */
  request<T = unknown>(spec: {
    method: RequestSpec["method"];
    path: string;
    auth?: AuthMode;
    body?: unknown;
    lang?: Lang;
  }): Promise<T> {
    return this.http.request<T>({ auth: "partner", ...spec });
  }
}
