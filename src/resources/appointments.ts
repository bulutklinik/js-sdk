import type { HttpClient } from "../http";
import type { PhysicalAppointmentInput, ReserveInterviewInput } from "../models";

/** Online reservation, physical appointment and cancellation. */
export class AppointmentsResource {
  constructor(private readonly http: HttpClient) {}

  /** Reserve an online (interview) slot. Resolves to `null` on success. */
  reserveInterview(input: ReserveInterviewInput): Promise<null> {
    return this.http.request<null>({
      method: "POST",
      path: "/patients/addInterviewDateReservation",
      auth: "bearer",
      body: {
        doctorId: input.doctorId,
        appointmentDate: input.appointmentDate,
        appointmentType: input.appointmentType ?? "interview",
      },
    });
  }

  /** Create a physical appointment. */
  addPhysical(input: PhysicalAppointmentInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/patients/addNewAppointment",
      auth: "bearer",
      body: { doctorId: input.doctorId, appointmentDate: input.appointmentDate },
    });
  }

  /** Cancel an appointment by event id (`cln_events.id`). */
  cancel(eventId: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "DELETE",
      path: `/patients/deleteUserAppointment/${eventId}`,
      auth: "bearer",
    });
  }

  /**
   * The patient's appointments — `{ foundAppointmentsCount, foundAppointments }`.
   * Each item's `event_id` is the id to pass to `cancel`; rows with `event_id`
   * `"0"` are paid-order/refund entries and are not cancellable. Server paging is
   * disabled, so page 1 (the default) returns the full list.
   */
  list(page?: number | string): Promise<unknown> {
    const path =
      page !== undefined ? `/patients/userAppointments/${page}` : "/patients/userAppointments";
    return this.http.request<unknown>({ method: "GET", path, auth: "bearer" });
  }

  /** The patient's active online-slot reservation holds (with `minute_diff`/`second_diff` countdown). */
  reservations(): Promise<unknown> {
    return this.http.request<unknown>({
      method: "GET",
      path: "/patients/userReservations",
      auth: "bearer",
    });
  }
}
