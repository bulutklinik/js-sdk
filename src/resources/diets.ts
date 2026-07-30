import type { HttpClient } from "../http";
import type { DietList, PatientRef } from "../models";

/**
 * Diet lists recorded for a patient **inside your own company**.
 * Lists written by other clinics are not visible here.
 */
export class DietsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Paginated diet lists — `{ foundDietsCount, foundDiets }`. Page size is fixed
   * to 20 server-side.
   */
  list(patient: PatientRef, page?: number | string): Promise<DietList> {
    return this.http.request<DietList>({
      method: "POST",
      path: "/outher/dietLists",
      auth: "partner",
      body: { patient, currentPage: page },
    });
  }

  /**
   * Meal breakdown of one diet list. `listId` comes from `list`; one that is not
   * this patient's fails with the same generic error as "not found".
   */
  detail(patient: PatientRef, listId: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/diet",
      auth: "partner",
      body: { patient, listId },
    });
  }
}
