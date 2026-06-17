import type { HttpClient } from "../http";
import type {
  Branch,
  DoctorDetail,
  DoctorSearchInput,
  DoctorSearchResult,
  Location,
  QuickSearchInput,
  QuickSearchResult,
} from "../models";

/** Branches, locations, quick/filtered doctor search and doctor detail. */
export class DoctorsResource {
  constructor(private readonly http: HttpClient) {}

  branches(): Promise<Branch[]> {
    return this.http.request<Branch[]>({
      method: "GET",
      path: "/patients/allBranches",
      auth: "bearer",
    });
  }

  locations(): Promise<Location[]> {
    return this.http.request<Location[]>({
      method: "GET",
      path: "/patients/allLocations",
      auth: "bearer",
    });
  }

  quickSearch(input: QuickSearchInput): Promise<QuickSearchResult> {
    return this.http.request<QuickSearchResult>({
      method: "POST",
      path: "/patients/quickSearch",
      auth: "bearer",
      body: {
        searchText: input.searchText,
        listType: input.listType ?? null,
        location: input.location ?? null,
      },
    });
  }

  search(input: DoctorSearchInput): Promise<DoctorSearchResult> {
    return this.http.request<DoctorSearchResult>({
      method: "POST",
      path: "/patients/filteredSearch",
      auth: "bearer",
      body: {
        searchParams: input.searchParams ?? {},
        orderParams: input.orderParams ?? [],
        otherParams: input.otherParams ?? [],
        currentPage: input.currentPage,
        perPageLimit: input.perPageLimit ?? 20,
      },
    });
  }

  detail(id: number | string, corporate?: number | string): Promise<DoctorDetail> {
    const path =
      corporate !== undefined
        ? `/patients/doctorDetail/${id}/${corporate}`
        : `/patients/doctorDetail/${id}`;
    return this.http.request<DoctorDetail>({ method: "GET", path, auth: "bearer" });
  }
}
