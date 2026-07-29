import type { HttpClient } from "../../http";
import type { PartnerSlotScheduleInput } from "../../models";

/** Doctor availability on the partner surface. */
export class PartnerSlotsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Bookable slots for a doctor. Either pass `scheduleDate`, or page through with
   * `scheduleStep` + `schedulePage`; the server requires one of the two forms.
   */
  schedule(input: PartnerSlotScheduleInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/doctorSlots",
      auth: "partner",
      body: {
        doctorId: input.doctorId,
        scheduleDate: input.scheduleDate,
        scheduleStep: input.scheduleStep,
        schedulePage: input.schedulePage,
      },
    });
  }
}
