import type { HttpClient } from "../http";
import type { LabResultId, PatientRef } from "../models";

/**
 * Laboratory catalogue and results.
 *
 * `catalog` / `catalogDetail` are global, static package definitions. `results` /
 * `resultDetail` are scoped to your own company and merge two sources: the
 * clinic's HBYS lab requests and TmcLab order groups. Results recorded by other
 * clinics are not visible.
 *
 * Ordering a test is not available here — it creates a financial record.
 */
export class LaboratoryResource {
  constructor(private readonly http: HttpClient) {}

  /** Orderable test packages. Static catalogue, no patient context. */
  catalog(): Promise<unknown> {
    return this.http.request<unknown>({
      method: "GET",
      path: "/outher/laboratoryCatalog",
      auth: "partner",
    });
  }

  /**
   * One catalogue package. Prices are the plain list prices — the patient-side
   * discount pass does not apply here.
   */
  catalogDetail(testId: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "GET",
      path: `/outher/laboratoryCatalog/${testId}`,
      auth: "partner",
    });
  }

  /**
   * Paginated results — `{ foundTestsCount, foundTests }`. Each item's `id` is
   * accepted verbatim by `resultDetail` (a `-lab` suffix marks a TmcLab group).
   */
  results(patient: PatientRef, page?: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/laboratoryResults",
      auth: "partner",
      body: { patient, currentPage: page },
    });
  }

  /** One result. Pass the `id` from `results` unchanged, suffix and all. */
  resultDetail(patient: PatientRef, testId: LabResultId | number): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/laboratoryResult",
      auth: "partner",
      body: { patient, testId: String(testId) },
    });
  }
}
