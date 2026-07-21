import type { HttpClient } from "../http";

/** The patient's diet lists (a dietitian's "Diyet Listesi"). */
export class DietsResource {
  constructor(private readonly http: HttpClient) {}

  /** The patient's diet lists. `page` defaults to 1 server-side (page size fixed to 10). */
  list(page?: number | string): Promise<unknown> {
    const path =
      page !== undefined ? `/patients/dietLists/${page}` : "/patients/dietLists";
    return this.http.request<unknown>({ method: "GET", path, auth: "bearer" });
  }

  /** One diet list. `listId` is a `list_id` from a `list` item. */
  detail(listId: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "GET",
      path: `/patients/diet/${listId}`,
      auth: "bearer",
    });
  }
}
