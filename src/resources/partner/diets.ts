import type { HttpClient } from "../../http";
import type { DietListItem, PatientRef } from "../../models";

/**
 * Diet lists recorded for a patient **inside your own company**.
 * Lists written by other clinics are not visible here.
 */
export class PartnerDietsResource {
  constructor(private readonly http: HttpClient) {}

  /** Paginated diet lists — `{ foundDietsCount, foundDiets }`. */
  list(patient: PatientRef, page?: number | string): Promise<{ foundDietsCount: number; foundDiets: DietListItem[] }> {
    return this.http.request({
      method: "POST",
      path: "/outher/dietLists",
      auth: "partner",
      body: { patient, currentPage: page },
    });
  }

  /** Meal breakdown of one diet list. `listId` comes from `list`. */
  detail(patient: PatientRef, listId: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/diet",
      auth: "partner",
      body: { patient, listId },
    });
  }
}
