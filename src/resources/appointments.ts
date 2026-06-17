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
}
