import type { HttpClient } from "../../http";
import type {
  PartnerAppointmentListInput,
  PartnerAppointmentLookupInput,
  PartnerAppointmentWithoutSlotInput,
  PartnerCheckDoctorInput,
  PartnerCreateAppointmentInput,
  PartnerInstantReserveInput,
  PartnerReserveInput,
} from "../../models";

/**
 * Appointment lifecycle on the partner surface.
 *
 * The patient is supplied inline as `user` — there is no patient login in this
 * mode. The server materialises the patient inside your company on write.
 *
 * **Payment is not taken through the API.** `reserve` returns a process that is
 * settled through the hosted web checkout; see the reservation response.
 */
export class PartnerAppointmentsResource {
  constructor(private readonly http: HttpClient) {}

  /** Hold an online slot for the given patient. */
  reserve(input: PartnerReserveInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/reservation",
      auth: "partner",
      body: { slotId: input.slotId, doctorId: input.doctorId, user: input.user },
    });
  }

  /** Same as `reserve`, for integrations that collect the agreements themselves. */
  reserveWithoutAgreement(input: PartnerReserveInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/reservationWithoutAgreement",
      auth: "partner",
      body: { slotId: input.slotId, doctorId: input.doctorId, user: input.user },
    });
  }

  /** Instant (no slot) reservation. */
  instantReserve(input: PartnerInstantReserveInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/instantReservation",
      auth: "partner",
      body: { user: input.user },
    });
  }

  /** Turn a reservation into a confirmed appointment. */
  create(input: PartnerCreateAppointmentInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/appointment",
      auth: "partner",
      body: { hash: input.hash, outherProcessId: input.outherProcessId },
    });
  }

  /** Book a free-form time range without going through a slot. */
  createWithoutSlot(input: PartnerAppointmentWithoutSlotInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/appointmentWithoutSlot",
      auth: "partner",
      body: {
        doctorId: input.doctorId,
        startDate: input.startDate,
        finishDate: input.finishDate,
        isOutherDoctor: input.isOutherDoctor,
        user: input.user,
      },
    });
  }

  /** Cancel an appointment created with `createWithoutSlot`. */
  cancelWithoutSlot(input: PartnerAppointmentLookupInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "DELETE",
      path: "/outher/appointmentWithoutSlot",
      auth: "partner",
      body: { ...input },
    });
  }

  /** Appointments you created for the given phone number. */
  list(input: PartnerAppointmentListInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/appointments",
      auth: "partner",
      body: { phoneNumber: input.phoneNumber, page: input.page, type: input.type },
    });
  }

  /** A single appointment, addressed by process or by coordinates. */
  info(input: PartnerAppointmentLookupInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/appointmentInfo",
      auth: "partner",
      body: { ...input },
    });
  }

  /** Whether a doctor is bookable through your integration. */
  checkDoctor(input: PartnerCheckDoctorInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/checkDoctor",
      auth: "partner",
      body: { doctorId: input.doctorId, isOutherDoctor: input.isOutherDoctor },
    });
  }
}
