import { resolveConfig, type ClientOptions } from "./config";
import { HttpClient } from "./http";
import { AppointmentsResource } from "./resources/appointments";
import { AuthResource } from "./resources/auth";
import { DoctorsResource } from "./resources/doctors";
import { MeasuresResource } from "./resources/measures";
import { PaymentsResource } from "./resources/payments";
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
  }
}
