import type { HttpClient } from "../http";
import type { SlotScheduleInput, SlotSchedule } from "../models";

/** Doctor availability. */
export class SlotsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Bookable slots for a doctor. Either pass `scheduleDate`, or page through with
   * `scheduleStep` + `schedulePage`; the server requires one of the two forms.
   *
   * Returns a date-keyed map; `slotId` feeds `appointments.reserve`. An
   * `appointmentDate` elsewhere is the date key plus `slotStart` with the
   * seconds dropped (`"Y-m-d H:i"`).
   */
  schedule(input: SlotScheduleInput): Promise<SlotSchedule> {
    return this.http.request<SlotSchedule>({
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
