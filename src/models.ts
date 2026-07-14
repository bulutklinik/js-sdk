/* Request and response shapes for the covered endpoints. Response types index
 * extra fields with `[k: string]: unknown` because the API may add fields. */

// ---------- auth ----------

export type LoginMode = "email" | "identity" | "phone" | "user_id" | "social" | "afterRegister";

export interface ConnectInput {
  apiUserName: string;
  /** Required except `social` / `afterRegister` modes. */
  apiUserPassword?: string;
  loginMode: LoginMode;
  /** Defaults to the client's configured `clientId`. */
  clientId?: string;
  /** Defaults to the client's configured `clientSecret`. */
  clientSecret?: string;
  /** Some installs require this in `phone` mode. */
  withPhoneNumber?: string;
}

export interface LoginData {
  access_token?: string;
  refresh_token?: string;
  password_policy?: unknown;
  /** Present (instead of tokens) when 2FA is required — an encrypted blob. */
  response?: string;
}

export type LoginResult =
  | { twoFactorRequired: false; passwordPolicy?: unknown }
  | { twoFactorRequired: true; twoFactorResponse: string };

export interface TwoFactorInput {
  smsVerificationCode: string;
  /** The encrypted blob from `connect`'s 2FA challenge (`twoFactorResponse`). */
  response: string;
}

export interface RegisterInput {
  name: string;
  surname: string;
  /** Should equal `phoneNumber` (the `+CC` form) — used as the afterRegister username. */
  apiUserName: string;
  /** Must start with `+` and country code, e.g. `+90 555 111 22 33`. */
  phoneNumber: string;
  password: string;
  smsVerificationCode: string;
  /** Encrypted blob from the prior SMS-verification step. */
  response: string;
  acceptUserAgreement?: 0 | 1;
  clientId?: string;
  clientSecret?: string;
}

// ---------- doctors ----------

export type DoctorListType = "interview" | "appointment";

export interface QuickSearchInput {
  searchText: string;
  listType?: DoctorListType | null;
  location?: string | null;
}

export interface QuickSearchResult {
  searchedBranches?: unknown[];
  searchedDoctors?: unknown[];
  searchedCompanies?: unknown[];
  searchedGivenTreatments?: unknown[];
  searchedBlogs?: unknown[];
  queryText?: string;
  [k: string]: unknown;
}

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

export type OrderParam = "name" | "point" | "slot" | "order";
export type OtherParam = "isKizilay" | "isQuestionable" | "isInterviewable" | "isAppointmentable";

export interface DoctorSearchInput {
  searchParams?: SearchParams;
  orderParams?: OrderParam[];
  otherParams?: OtherParam[];
  /** >= 1. */
  currentPage: number;
  /** 10–100. Default 20. */
  perPageLimit?: number;
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

// ---------- slots ----------

export interface SchedulerInput {
  doctorId: number | string;
  /** `Y-m-d`, today..+21. When omitted, `scheduleStep` + `schedulePage` page the window. */
  scheduleDate?: string | null;
  scheduleStep?: number | string;
  schedulePage?: number | string;
  /** `interview` → online slots; anything else → physical. */
  listType: DoctorListType;
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
export type SchedulerResult = Record<string, Slot[]>;

// ---------- appointments ----------

export type AppointmentType = "interview" | "appointment";

export interface ReserveInterviewInput {
  doctorId: number | string;
  /** `Y-m-d H:i`, today..+21. */
  appointmentDate: string;
  appointmentType?: AppointmentType;
}

export interface PhysicalAppointmentInput {
  doctorId: number | string;
  /** `Y-m-d H:i`. */
  appointmentDate: string;
}

// ---------- payments ----------

export type DiscountCheckType =
  | "question"
  | "appointment"
  | "lab"
  | "special"
  | "physicallyAppointment"
  | "tmcLab"
  | "program";

export interface DiscountCheckInput {
  checkType: DiscountCheckType;
  discountCode: string;
  /** Required except `lab` / `tmcLab` / `program`. */
  doctorId?: number | string;
  orderId?: number | string;
  specialServiceId?: number | string;
  programSlug?: string;
}

export type DiscountResult = Record<string, unknown>;

export interface CardInfo {
  cardHolder: string;
  cardNumber: string;
  /** `m`. */
  cardExpMonth: string;
  /** `Y`. */
  cardExpYear: string;
  cardCvv: string;
}

export interface SavedCard {
  id: number;
  card_holder_name?: string;
  /** Masked. */
  card_number?: string;
  card_type?: string;
  created_at?: string;
  [k: string]: unknown;
}

export interface PaymentInput {
  doctorId: number | string;
  /** `Y-m-d H:i`. */
  appointmentDate: string;
  appointmentType?: AppointmentType;
  is3D: boolean;
  termsAccept: boolean;
  /** A new card (all-or-none) … */
  cardInfo?: CardInfo;
  /** … or a saved card id (from `getCards`). */
  cardId?: number | string;
  /** `1` tokenizes the card. */
  saveCard?: 0 | 1;
  discountCode?: string;
  /** Opaque encrypted blob, passed through verbatim. */
  caseDetail?: string;
}

/** On 3DS success, `payment3DUrl` is a browser URL to open. */
export interface PaymentResult {
  payment3DUrl?: string;
  [k: string]: unknown;
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

export interface PartnerHealthInput {
  identity?: string;
  phoneNumber?: string;
  data: MeasureRecord[];
}

// ---------- skin (AI image analysis — "Cildimde Neyim Var") ----------

/** One skin photo to analyze. `image` is base64 (a `data:…;base64,` prefix is allowed). */
export interface SkinImage {
  image: string;
  /** Optionally tag the stored media with a clinic branch. */
  branch_id?: number;
}

/** Per-image analysis result. Fields may be empty/null when the classifier is uncertain. */
export interface SkinAnalysis {
  id: number;
  isClear?: boolean;
  isBright?: boolean;
  /** Lesion class from the classifier. */
  label?: string;
  /** Patient-friendly Turkish AI summary. */
  comment?: string | null;
  confidence?: number | null;
  /** Stored media relative path. */
  image?: string | null;
  error?: string | null;
  /** Candidate ICD code(s). */
  possible_icd?: unknown;
  /** Opaque encrypted blob; can be forwarded verbatim as a payment's `caseDetail`. */
  case_detail?: string;
  [k: string]: unknown;
}

export interface SkinAnalysisResult {
  status: SkinAnalysis[];
  [k: string]: unknown;
}

// ---------- meals (AI meal-photo analysis) ----------

export type PortionSize = "small" | "medium" | "large" | "custom";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealAnalysisInput {
  /** Base64 image (a `data:…;base64,` prefix is allowed). */
  image: string;
  portionSize: PortionSize;
  /** Required when `portionSize` is `custom`. */
  portionGrams?: number;
  mealType: MealType;
  /** Optional Turkish note (≤1000 chars); the model reads preparation/portion modifiers. */
  note?: string;
}

export interface MealAnalysisResult {
  /** The model's nutrition breakdown; `comment` is a JSON-object string. */
  status: { comment?: string; [k: string]: unknown };
  [k: string]: unknown;
}
