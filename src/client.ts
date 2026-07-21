import { resolveConfig, type ClientOptions } from "./config";
import { HttpClient, type AuthMode, type RequestSpec } from "./http";
import type { Lang } from "./types";
import { AppointmentsResource } from "./resources/appointments";
import { AuthResource } from "./resources/auth";
import { DietsResource } from "./resources/diets";
import { DoctorsResource } from "./resources/doctors";
import { LaboratoryResource } from "./resources/laboratory";
import { MealsResource } from "./resources/meals";
import { MeasuresResource } from "./resources/measures";
import { PaymentsResource } from "./resources/payments";
import { SkinResource } from "./resources/skin";
import { SlotsResource } from "./resources/slots";
import type { TokenStore } from "./token-store";

/**
 * The Bulutklinik API client. Construct once and reuse; service groups are
 * exposed as properties.
 *
 * @example
 * ```ts
 * const client = new BulutklinikClient({
 *   environment: "test",
 *   clientId: "…",
 *   clientSecret: "…",
 * });
 * await client.auth.connect({ apiUserName: "…", apiUserPassword: "…", loginMode: "email" });
 * const result = await client.doctors.quickSearch({ searchText: "kardiyo" });
 * ```
 */
export class BulutklinikClient {
  readonly auth: AuthResource;
  readonly doctors: DoctorsResource;
  readonly slots: SlotsResource;
  readonly appointments: AppointmentsResource;
  readonly payments: PaymentsResource;
  readonly measures: MeasuresResource;
  /** "Cildimde Neyim Var" — AI skin-lesion analysis. */
  readonly skin: SkinResource;
  /** AI meal-photo calorie/nutrition estimation. */
  readonly meals: MealsResource;
  /** Lab results, orderable test catalog, and test pre-ordering. */
  readonly laboratory: LaboratoryResource;
  /** The patient's diet lists (a dietitian's "Diyet Listesi"). */
  readonly diets: DietsResource;
  /** The active token store (also accepts a custom one via options). */
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
    this.payments = new PaymentsResource(this.http);
    this.measures = new MeasuresResource(this.http);
    this.skin = new SkinResource(this.http);
    this.meals = new MealsResource(this.http);
    this.laboratory = new LaboratoryResource(this.http);
    this.diets = new DietsResource(this.http);
  }

  /**
   * Escape hatch: call any Bulutklinik API endpoint that does not yet have a
   * typed resource method. The request still goes through the shared transport,
   * so default headers, the chosen `auth` mode (`bearer` by default), silent
   * token refresh + retry, envelope unwrapping and typed errors all apply.
   * Returns the unwrapped `data` payload. Prefer a typed resource method when
   * one exists.
   *
   * @example
   * ```ts
   * const branches = await client.request({ method: "GET", path: "/patients/allBranches" });
   * const created = await client.request({
   *   method: "POST",
   *   path: "/patients/someNewEndpoint",
   *   body: { foo: "bar" },
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
    return this.http.request<T>({ auth: "bearer", ...spec });
  }
}
