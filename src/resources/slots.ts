import type { HttpClient } from "../http";
import type { SchedulerInput, SchedulerResult } from "../models";

/** Doctor availability (materialized slots). */
export class SlotsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch a doctor's free slots. Returns a date-keyed map of slots. Build the
   * next step's `appointmentDate` as `"<date> <slotStart>"` (drop the seconds).
   */
  schedule(input: SchedulerInput): Promise<SchedulerResult> {
    return this.http.request<SchedulerResult>({
      method: "POST",
      path: "/patients/doctorScheduler",
      auth: "bearer",
      body: {
        doctorId: input.doctorId,
        scheduleDate: input.scheduleDate ?? null,
        scheduleStep: input.scheduleStep ?? "7",
        schedulePage: input.schedulePage ?? "1",
        listType: input.listType,
      },
    });
  }
}
