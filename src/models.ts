/* Request and response shapes for the covered endpoints. Response types index
 * extra fields with `[k: string]: unknown` because the API may add fields. */

// ---------- auth ----------

/** How `apiUserName` is interpreted. The portal issues an e-mail-style identity. */
export type LoginMode = "email" | "identity" | "phone" | "user_id";

export interface ConnectInput {
  /** The project-specific service identity from your portal application. */
  apiUserName: string;
  /** The password set when registering on the portal. */
  apiUserPassword: string;
  /** Defaults to the client's `clientId`. */
  clientId?: string;
  /** Defaults to the client's `clientSecret`. */
  clientSecret?: string;
  /** Defaults to `"email"`. */
  loginMode?: LoginMode;
}

/** Raw `data` of `connectApi`. Either a token pair, or a 2FA challenge. */
export interface LoginData {
  access_token?: string;
  refresh_token?: string;
  password_policy?: PasswordPolicy;
  /** Present instead of the tokens when SMS 2FA is enabled. */
  response?: string;
  [k: string]: unknown;
}

export interface PasswordPolicy {
  must_change?: boolean;
  reason?: string | null;
  [k: string]: unknown;
}

/**
 * Result of {@link AuthResource.connect}. When `twoFactorRequired` is true no
 * tokens were stored and `twoFactorResponse` carries the server's challenge blob.
 */
export interface LoginResult {
  twoFactorRequired: boolean;
  twoFactorResponse?: string;
  passwordPolicy?: PasswordPolicy;
}

// ---------- patient references ----------

/**
 * Identifies an existing patient **inside your own company**.
 *
 * Used by every read. The server never creates a patient on this path and never
 * looks the reference up globally, so a patient you have never treated simply
 * resolves to "not found" — with the same message as "not yours", so the
 * endpoint cannot be used to probe for TCKNs.
 *
 * `identityNumber` is primary. `phoneNumber` is a fallback and is only accepted
 * when it matches exactly one patient — the column is not unique (family members
 * share numbers), and the server fails closed rather than guessing.
 */
export interface PatientRef {
  identityNumber?: string;
  phoneNumber?: string;
}

/**
 * Identifies a patient for a write. If no matching patient exists in your
 * company, the server creates one — which is why the descriptive fields are
 * required here and absent from {@link PatientRef}.
 */
export interface PatientInput {
  name: string;
  surname: string;
  phoneNumber: string;
  identityNumber?: string;
  email?: string;
  /** `Y-m-d`. */
  birthdate?: string;
  /** ISO country code present in `bas_com_countries.code`. */
  nationality?: string;
}

/** The `user` object accepted by the booking endpoints. */
export interface BookingUser extends PatientInput {
  price?: number;
}

// ---------- doctors ----------

export interface SearchParams {
  withFreeText?: string;
  withDoctorName?: string;
  withBranchName?: string;
  /** `-1` excludes psychology/diet. */
  withBranchId?: number | null;
  withLocationName?: string;
  withLocationId?: number | null;
  withCompanyName?: string;
  withCompanyId?: number | null;
  withGivenTreatments?: string;
  withExpertyId?: number | null;
  withInstitutionId?: number | null;
  withNearestSlotDayRange?: number | null;
}

/** Narrower than the patient surface — `point` is not accepted here. */
export type OrderParam = "name" | "order" | "slot";

export interface DoctorSearchInput {
  /**
   * At least one key is required. The server rule is `required|array`, and PHP's
   * `required` rejects an empty array — `{}` is a guaranteed 422, not an
   * unfiltered search.
   */
  searchParams: SearchParams;
  orderParams?: OrderParam[];
  /** >= 1. */
  currentPage: number;
}

export interface DoctorSummary {
  doctor_id: number;
  name?: string;
  surname?: string;
  branch_name?: string;
  star_rate?: number;
  nearest_slot?: string | null;
  isInterviewable?: boolean;
  isAppointmentable?: boolean;
  url?: string;
  user_image?: string;
  [k: string]: unknown;
}

export interface DoctorSearchResult {
  foundDoctorsCount: number;
  foundDoctors: DoctorSummary[];
  [k: string]: unknown;
}

export interface Branch {
  sysbrnch_id?: number;
  branch_name?: string;
  [k: string]: unknown;
}

export interface Location {
  location_id?: number;
  [k: string]: unknown;
}

export type DoctorDetail = Record<string, unknown>;

export interface CheckDoctorInput {
  doctorId: number | string;
  isOutherDoctor: 0 | 1;
}

// ---------- slots ----------

export interface SlotScheduleInput {
  doctorId: number | string;
  /** `Y-m-d`, today..+21. Omit and send `scheduleStep` + `schedulePage` instead. */
  scheduleDate?: string;
  scheduleStep?: number;
  schedulePage?: number;
}

export interface Slot {
  slotId: number;
  /** `HH:mm:ss`. */
  slotStart: string;
  /** `HH:mm:ss`. */
  slotEnd: string;
  available: boolean;
}

/** Date-keyed (`Y-m-d`) map → slots for that day. Empty days are `[]`. */
export type SlotSchedule = Record<string, Slot[]>;

// ---------- appointments ----------

export interface ReserveInput {
  slotId: number | string;
  doctorId: number | string;
  user: BookingUser;
}

export interface InstantReserveInput {
  user: BookingUser;
}

/** Turns a reservation into an appointment. Both fields come from the reservation response. */
export interface CreateAppointmentInput {
  hash: string;
  outherProcessId: number | string;
}

export interface AppointmentWithoutSlotInput {
  doctorId: number | string;
  /** `Y-m-d H:i`, today or later. */
  startDate: string;
  /** `Y-m-d H:i`, after `startDate`. */
  finishDate: string;
  isOutherDoctor?: 0 | 1;
  user: BookingUser;
}

/**
 * Addresses one appointment either by its process (`hash` + `outherProcessId`)
 * or by its coordinates (`doctorId` + `appointmentDate` + `isOutherDoctor`).
 * Supply one pair or the other.
 */
export interface AppointmentLookupInput {
  hash?: string;
  outherProcessId?: number | string;
  doctorId?: number | string;
  /** `Y-m-d H:i`. */
  appointmentDate?: string;
  isOutherDoctor?: 0 | 1;
}

export interface AppointmentListInput {
  phoneNumber: string;
  page?: number | string;
  type?: "normal" | "instant";
}

// ---------- measures ----------

export type MeasureType =
  | "tension"
  | "glucose"
  | "pulse"
  | "fever"
  | "weight"
  | "length"
  | "waist"
  | "hip"
  | "fat"
  | "muscle"
  | "calorie"
  | "step"
  | "sleep";

/** 1=day, 2=week, 3=month, 4=year. */
export type GraphPeriod = 1 | 2 | 3 | 4;

/** A single measurement. `date_time` is `Y-m-d H:i`; other fields depend on `type`. */
export interface MeasureRecord {
  type: MeasureType;
  date_time: string;
  [field: string]: string | number;
}

/** Fields for the single-type endpoints (`date_time` + the type's own fields). */
export interface MeasureFields {
  date_time: string;
  [field: string]: string | number;
}

/** Body of the legacy `teusan` bulk endpoint. Flat by design — no `patient` object. */
export interface HealthInformationInput {
  identity?: string;
  phoneNumber?: string;
  data: MeasureRecord[];
}

// ---------- laboratory ----------

/**
 * A laboratory result id exactly as returned by `laboratory.results`.
 * A plain number is an HBYS lab request; a `-lab` suffix marks a TmcLab order
 * group. Pass it back verbatim — the SDK does not need to tell them apart.
 */
export type LabResultId = string;

/** One entry in a lab results list (`results.foundTests[]`). */
export interface LabResultListItem {
  /** DB id (`"123"`) or a TMC-lab id with a `-lab` suffix (`"4821-lab"`). */
  id: number | string;
  created_at?: string;
  company_name?: string;
  test_name?: string;
  /** 0=Numune Alınıyor, 1=Çalışıyor, 2=Onaylandı. */
  test_state?: number;
  test_state_text?: string;
  /** 1=Normal, 2=Grup, 3=Alt Parametre. */
  test_type?: number;
  test_type_text?: string;
  [k: string]: unknown;
}

// ---------- diets ----------

/** One entry in a diet list (`list.foundDiets[]`). */
export interface DietListItem {
  /** Feeds `diets.detail`. */
  list_id: number | string;
  diet_date?: string;
  protocol_no?: string;
  patient_name?: string;
  patient_surname?: string;
  doctor_company_name?: string;
  doctor_name?: string;
  doctor_surname?: string;
  doctor_title?: string;
  doctor_branch_name?: string;
  doctor_image?: string;
  [k: string]: unknown;
}

/** Response of `diets.list`. Page size is fixed to 20 server-side. */
export interface DietList {
  foundDietsCount: number;
  foundDiets: DietListItem[];
  [k: string]: unknown;
}
