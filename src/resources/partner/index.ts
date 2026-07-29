import type { HttpClient } from "../../http";
import { PartnerAppointmentsResource } from "./appointments";
import { PartnerDietsResource } from "./diets";
import { PartnerDoctorsResource } from "./doctors";
import { PartnerLaboratoryResource } from "./laboratory";
import { PartnerMeasuresResource } from "./measures";
import { PartnerSlotsResource } from "./slots";

/**
 * The company-scoped partner surface (`/outher`), exposed as `client.partner`.
 *
 * It is a **second persona**, not a replacement for the patient one:
 *
 * | | patient (`client.*`) | partner (`client.partner.*`) |
 * |---|---|---|
 * | Auth | patient login, access token | pre-issued partner token |
 * | Who the data belongs to | the logged-in patient, across every clinic | your own company only |
 * | How a patient is named | implicit (the session) | inline, per request |
 *
 * Requests here use the configured `partnerToken`; no patient login is involved
 * and the silent access-token refresh does not apply.
 *
 * Endpoints with no partner equivalent — patient login/registration, the card
 * vault, 3-D Secure payment, self-service AI, address CRUD — stay on the patient
 * surface by design.
 */
export class PartnerNamespace {
  readonly doctors: PartnerDoctorsResource;
  readonly slots: PartnerSlotsResource;
  readonly appointments: PartnerAppointmentsResource;
  readonly diets: PartnerDietsResource;
  readonly laboratory: PartnerLaboratoryResource;
  readonly measures: PartnerMeasuresResource;

  constructor(http: HttpClient) {
    this.doctors = new PartnerDoctorsResource(http);
    this.slots = new PartnerSlotsResource(http);
    this.appointments = new PartnerAppointmentsResource(http);
    this.diets = new PartnerDietsResource(http);
    this.laboratory = new PartnerLaboratoryResource(http);
    this.measures = new PartnerMeasuresResource(http);
  }
}

export { PartnerAppointmentsResource } from "./appointments";
export { PartnerDietsResource } from "./diets";
export { PartnerDoctorsResource } from "./doctors";
export { PartnerLaboratoryResource } from "./laboratory";
export { PartnerMeasuresResource } from "./measures";
export { PartnerSlotsResource } from "./slots";
