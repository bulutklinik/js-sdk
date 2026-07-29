import type { HttpClient } from "../../http";
import type {
  GraphPeriod,
  MeasureFields,
  MeasureRecord,
  MeasureType,
  PartnerHealthInput,
  PartnerPatient,
  PatientRef,
} from "../../models";

/**
 * Health measurements on the partner surface.
 *
 * **Scope:** measurements are written into and read from **your own company**.
 * Values the patient entered in the Bulutklinik mobile app live in the consumer
 * tenant and are *not* visible here — that is a consequence of tenant isolation,
 * not a bug.
 *
 * Writes take the full {@link PartnerPatient} (the patient is created inside your
 * company if absent); reads and edits take the lighter {@link PatientRef}.
 */
export class PartnerMeasuresResource {
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

  /** Paginated history of one type. */
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

  /** Write several measurements of mixed types in one transaction. */
  addList(patient: PartnerPatient, data: MeasureRecord[]): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/measures",
      auth: "partner",
      body: { patient, data },
    });
  }

  /** Write a single measurement. */
  add(patient: PartnerPatient, type: MeasureType, fields: MeasureFields): Promise<unknown> {
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
   * Legacy teusan bulk submission.
   *
   * @deprecated Writes into the shared consumer tenant rather than your own
   * company, so the values are not readable through `last` / `list`. Prefer
   * {@link addList}. Kept for existing teusan integrations.
   */
  healthInformation(input: PartnerHealthInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/healthInformation",
      auth: "partner",
      body: { identity: input.identity, phoneNumber: input.phoneNumber, data: input.data },
    });
  }
}
