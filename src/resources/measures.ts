import type { HttpClient } from "../http";
import type {
  GraphPeriod,
  HealthInformationInput,
  MeasureFields,
  MeasureRecord,
  MeasureType,
  PatientInput,
  PatientRef,
} from "../models";

/**
 * Health measurements.
 *
 * **Scope:** measurements are written into and read from **your own company**.
 * Values the patient entered in the Bulutklinik mobile app live in the consumer
 * tenant and are *not* visible here — and a value you write does not appear in
 * their app. That is a consequence of tenant isolation, not a bug.
 *
 * Writes take the full {@link PatientInput} (the patient is created inside your
 * company if absent); reads and edits take the lighter {@link PatientRef}.
 */
export class MeasuresResource {
  constructor(private readonly http: HttpClient) {}

  /** Most recent value of every measurement type. */
  last(patient: PatientRef): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/lastMeasures",
      auth: "partner",
      body: { patient },
    });
  }

  /** Paginated history of one type. `glucoseType` applies to `glucose` only. */
  list(
    patient: PatientRef,
    type: MeasureType,
    page?: number | string,
    glucoseType?: 0 | 1,
  ): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: `/outher/measuresList/${type}`,
      auth: "partner",
      body: { patient, currentPage: page, glucoseType },
    });
  }

  /** Time-bucketed series. `period`: 1=day, 2=week, 3=month, 4=year. */
  graph(
    patient: PatientRef,
    type: MeasureType,
    period: GraphPeriod,
    page?: number | string,
    glucoseType?: 0 | 1,
  ): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: `/outher/measuresGraph/${type}/${period}`,
      auth: "partner",
      body: { patient, currentPage: page, glucoseType },
    });
  }

  /**
   * Write several measurements of mixed types in one transaction.
   * Capped at **200 items** per call by the server.
   */
  addList(patient: PatientInput, data: MeasureRecord[]): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/measures",
      auth: "partner",
      body: { patient, data },
    });
  }

  /** Write a single measurement. */
  add(patient: PatientInput, type: MeasureType, fields: MeasureFields): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: `/outher/measure/${type}`,
      auth: "partner",
      body: { patient, ...fields },
    });
  }

  /** Update one measurement row. `id` comes from `list`. */
  update(
    patient: PatientRef,
    type: MeasureType,
    id: number | string,
    fields: MeasureFields,
  ): Promise<unknown> {
    return this.http.request<unknown>({
      method: "PUT",
      path: `/outher/measure/${type}`,
      auth: "partner",
      body: { patient, id, ...fields },
    });
  }

  /** Delete one measurement row. */
  delete(patient: PatientRef, type: MeasureType, id: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "DELETE",
      path: `/outher/measure/${type}`,
      auth: "partner",
      body: { patient, id },
    });
  }

  /**
   * Legacy bulk submission for `teusan` integrations.
   *
   * @deprecated Requires the `teusan` scope instead of `apiouther`, takes a flat
   * `identity` + `phoneNumber` instead of `patient`, and writes into the shared
   * consumer tenant rather than your own company — so the values are not
   * readable through `last` / `list`. Prefer {@link addList}.
   */
  healthInformation(input: HealthInformationInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/healthInformation",
      auth: "partner",
      body: { identity: input.identity, phoneNumber: input.phoneNumber, data: input.data },
    });
  }
}
