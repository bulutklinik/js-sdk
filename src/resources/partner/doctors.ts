import type { HttpClient } from "../../http";
import type { Branch, DoctorDetail, DoctorSearchInput, DoctorSearchResult, Location } from "../../models";

/**
 * Doctor discovery on the partner surface.
 *
 * Results are scoped to the doctors enabled for your integration (the server
 * filters on your partner slug), so a doctor returned here is one you can
 * actually book.
 */
export class PartnerDoctorsResource {
  constructor(private readonly http: HttpClient) {}

  /** Filtered doctor search. */
  search(input: DoctorSearchInput): Promise<DoctorSearchResult> {
    return this.http.request<DoctorSearchResult>({
      method: "POST",
      path: "/outher/search",
      auth: "partner",
      body: {
        searchParams: input.searchParams ?? {},
        orderParams: input.orderParams ?? [],
        currentPage: input.currentPage,
      },
    });
  }

  /** Branches available through your integration. */
  branches(): Promise<Branch[]> {
    return this.http.request<Branch[]>({
      method: "GET",
      path: "/outher/branches",
      auth: "partner",
    });
  }

  /** Detail of a single doctor. */
  detail(doctorId: number | string): Promise<DoctorDetail> {
    return this.http.request<DoctorDetail>({
      method: "GET",
      path: `/outher/doctorInfos/${doctorId}`,
      auth: "partner",
    });
  }

  /** City list. Global catalogue — not scoped to your company. */
  locations(): Promise<Location[]> {
    return this.http.request<Location[]>({
      method: "GET",
      path: "/outher/locations",
      auth: "partner",
    });
  }
}
