import type { HttpClient } from "../http";
import type {
  AppointmentListInput,
  AppointmentLookupInput,
  AppointmentWithoutSlotInput,
  CheckDoctorInput,
  CreateAppointmentInput,
  InstantReserveInput,
  ReserveInput,
} from "../models";

/**
 * The appointment lifecycle.
 *
 * The patient is supplied inline as `user` — there is no patient session in this
 * mode. On write the server materialises the patient inside your company.
 *
 * Two booking flows:
 *
 * - **Hand off to the patient** — `reserve` returns a `url`; the patient opens it
 *   in a browser to accept the agreements and pay.
 * - **You collected the agreements** — `reserveWithoutAgreement` returns a `hash`;
 *   feed it plus `outherProcessId` into {@link AppointmentsResource.create}.
 *
 * **Payment is never taken through the API.** No partner endpoint produces a
 * financial record; that is what the browser hand-off is for.
 */
export class AppointmentsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Hold an online slot for the given patient and get back a `url` for the
   * patient to complete agreements and payment in a browser.
   */
  reserve(input: ReserveInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/reservation",
      auth: "partner",
      body: { slotId: input.slotId, doctorId: input.doctorId, user: input.user },
    });
  }

  /**
   * Same hold as `reserve`, for integrations that collect the agreements
   * themselves. Returns `{ hash, doctorId, slotId, phoneNumber, reservationExpired }`
   * — confirm with `create` before `reservationExpired` passes.
   */
  reserveWithoutAgreement(input: ReserveInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/reservationWithoutAgreement",
      auth: "partner",
      body: { slotId: input.slotId, doctorId: input.doctorId, user: input.user },
    });
  }

  /** Instant reservation — no slot; the server picks an available doctor. */
  instantReserve(input: InstantReserveInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/instantReservation",
      auth: "partner",
      body: { user: input.user },
    });
  }

  /**
   * Turn a reservation into a confirmed appointment. Both fields come from the
   * `reserveWithoutAgreement` response. Returns the appointment plus
   * `last_delete_time`, the cancellation deadline.
   */
  create(input: CreateAppointmentInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/appointment",
      auth: "partner",
      body: { hash: input.hash, outherProcessId: input.outherProcessId },
    });
  }

  /**
   * Book a free-form time range outside the slot grid, for integrations running
   * their own calendar.
   */
  createWithoutSlot(input: AppointmentWithoutSlotInput): Promise<unknown> {
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

  /**
   * Cancel an appointment created with `createWithoutSlot`. Appointments
   * confirmed through `create` are **not** cancellable here.
   */
  cancelWithoutSlot(input: AppointmentLookupInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "DELETE",
      path: "/outher/appointmentWithoutSlot",
      auth: "partner",
      body: { ...input },
    });
  }

  /**
   * The appointments **you** created for the given phone number — not the
   * patient's history across the platform.
   */
  list(input: AppointmentListInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/appointments",
      auth: "partner",
      body: { phoneNumber: input.phoneNumber, page: input.page, type: input.type },
    });
  }

  /** A single appointment, addressed by process or by coordinates. */
  info(input: AppointmentLookupInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/appointmentInfo",
      auth: "partner",
      body: { ...input },
    });
  }

  /**
   * Whether a doctor is bookable through your integration. Returns
   * `{ title, name, surname, branch_name, state: "1" }` when they are; fails
   * with `501` when they are not. Call it before offering a doctor.
   */
  checkDoctor(input: CheckDoctorInput): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/outher/checkDoctor",
      auth: "partner",
      body: { doctorId: input.doctorId, isOutherDoctor: input.isOutherDoctor },
    });
  }
}
