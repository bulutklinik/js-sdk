import type { HttpClient } from "../../http";
import type { PartnerLabResultId, PatientRef } from "../../models";

/**
 * Laboratory catalogue and results on the partner surface.
 *
 * `catalog` / `catalogDetail` are global, static package definitions. `results` /
 * `resultDetail` are scoped to your own company and merge two sources: the
 * clinic's HBYS lab requests and TmcLab order groups. Results recorded by other
 * clinics are not visible.
 */
export class PartnerLaboratoryResource {
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
   * discount pass does not apply on the partner surface.
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

  /** One result. Pass the `id` from `results` unchanged. */
  resultDetail(patient: PatientRef, testId: PartnerLabResultId | number): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/laboratoryResult",
      auth: "partner",
      body: { patient, testId: String(testId) },
    });
  }
}
