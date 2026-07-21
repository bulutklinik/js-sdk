import type { HttpClient } from "../http";
import type { LabOrderInput } from "../models";

/** Patient laboratory results, the orderable test catalog, and test pre-ordering. */
export class LaboratoryResource {
  constructor(private readonly http: HttpClient) {}

  /** The patient's completed/in-progress lab results. `page` defaults to 1 server-side. */
  results(page?: number | string): Promise<unknown> {
    const path =
      page !== undefined
        ? `/patients/userLabTestList/${page}`
        : "/patients/userLabTestList";
    return this.http.request<unknown>({ method: "GET", path, auth: "bearer" });
  }

  /** One lab result. `testId` may be a plain id (`"123"`) or a `"<id>-lab"` TMC id. */
  resultDetail(testId: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "GET",
      path: `/patients/userLabTestDetail/${testId}`,
      auth: "bearer",
    });
  }

  /** The orderable test-group catalog. */
  catalog(): Promise<unknown> {
    return this.http.request<unknown>({
      method: "GET",
      path: "/patients/allLaboratoryTests",
      auth: "bearer",
    });
  }

  /** One catalog test group. */
  catalogDetail(id: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "GET",
      path: `/patients/laboratoryTestDetail/${id}`,
      auth: "bearer",
    });
  }

  /** Pre-order a lab test. Success → `{ preOrderId }`. */
  order(input: LabOrderInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/patients/addNewLaboratoryTest",
      auth: "bearer",
      body: {
        testId: input.testId,
        addressId: input.addressId,
        laboratoryId: input.laboratoryId,
      },
    });
  }
}
