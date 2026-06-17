import type { HttpClient } from "../http";
import type {
  GraphPeriod,
  MeasureFields,
  MeasureRecord,
  MeasureType,
  PartnerHealthInput,
} from "../models";

/** Health measurements: CRUD, latest, history list, graph and partner submission. */
export class MeasuresResource {
  constructor(private readonly http: HttpClient) {}

  /** Submit multiple measurements of any types in one call (primary entrypoint). */
  addList(records: MeasureRecord[]): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/patients/addNewUserMeasures",
      auth: "bearer",
      body: { data: records },
    });
  }

  /** Submit a single measurement of one type. */
  add(type: MeasureType, fields: MeasureFields): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: `/patients/addNewUserMeasures/${type}`,
      auth: "bearer",
      body: fields,
    });
  }

  update(
    type: MeasureType,
    input: { id: number | string } & MeasureFields,
  ): Promise<unknown> {
    return this.http.request<unknown>({
      method: "PUT",
      path: `/patients/updateUserMeasures/${type}`,
      auth: "bearer",
      body: input,
    });
  }

  delete(type: MeasureType, id: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "DELETE",
      path: `/patients/deleteUserMeasures/${type}`,
      auth: "bearer",
      body: { id },
    });
  }

  /** Latest value of each measurement type. */
  last(): Promise<Record<string, unknown>> {
    return this.http.request<Record<string, unknown>>({
      method: "GET",
      path: "/patients/measuresList",
      auth: "bearer",
    });
  }

  /** Paginated history for one type. `glucoseType` (0/1) applies only to glucose. */
  list(
    type: MeasureType,
    page: number | string,
    glucoseType?: 0 | 1,
  ): Promise<unknown> {
    const path =
      glucoseType !== undefined
        ? `/patients/userMeasuresList/${type}/${page}/${glucoseType}`
        : `/patients/userMeasuresList/${type}/${page}`;
    return this.http.request<unknown>({ method: "GET", path, auth: "bearer" });
  }

  /** Grouped graph data. `period`: 1=day, 2=week, 3=month, 4=year. */
  graph(
    type: MeasureType,
    period: GraphPeriod,
    page: number | string,
    glucoseType?: 0 | 1,
  ): Promise<unknown> {
    const path =
      glucoseType !== undefined
        ? `/patients/userMeasuresGraph/${type}/${period}/${page}/${glucoseType}`
        : `/patients/userMeasuresGraph/${type}/${period}/${page}`;
    return this.http.request<unknown>({ method: "GET", path, auth: "bearer" });
  }

  /** Partner (teusan) submission — uses the configured partner token. */
  partnerHealthInformation(input: PartnerHealthInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/healthInformation",
      auth: "partner",
      body: { identity: input.identity, phoneNumber: input.phoneNumber, data: input.data },
    });
  }
}
