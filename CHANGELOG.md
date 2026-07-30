# Changelog

All notable changes to `@bulutklinik/sdk` are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1]

Documentation and contract corrections found by auditing the SDKs against the
API source before release. No wire change beyond that.

### Fixed

- `doctors.search` no longer lets `searchParams` default to an empty map. The
  server rule is `required|array` and PHP's `required` rejects an empty array, so
  `{}` was a guaranteed `422` rather than an unfiltered search. `DoctorSearchInput.searchParams` is now required.
- Corrected the `measures.healthInformation` note. The defect it described — the API
  nulling `identity` before the patient lookup — was fixed API-side on
  2026-07-21. What actually remains is looser and worth knowing: the lookup is
  `identity OR phoneNumber` against the global user table and takes the first
  row, so a phone number alone can resolve a person whose TCKN differs from the
  one you sent.

## [1.0.0]

The SDK becomes **partner-only**. Everything that required a patient login is
gone; the company-scoped `/outher` surface that shipped under `client.partner.*`
in 0.6.0 is now the client root. See `DESIGN.md` §12 for the full migration.

### Changed — BREAKING

- **`client.partner.<group>` → `client.<group>`.** The six partner groups
  (`doctors`, `slots`, `appointments`, `measures`, `laboratory`, `diets`) moved to
  the root. Their paths, bodies and behaviour are unchanged — this is a rename.
  Resource classes lost the `Partner` prefix (`PartnerDoctorsResource` →
  `DoctorsResource`), as did the input types (`PartnerReserveInput` →
  `ReserveInput`, `PartnerPatient` → `PatientInput`, `PartnerBookingUser` →
  `BookingUser`, `PartnerLabResultId` → `LabResultId`, `PartnerHealthInput` →
  `HealthInformationInput`, `PartnerSlotScheduleInput` → `SlotScheduleInput`).
- **`TokenStore` now holds one partner token**: `getToken` / `setToken` / `clear`
  replace `getAccessToken` / `getRefreshToken` / `setTokens`. `MemoryTokenStore`
  takes the token directly instead of a `{ accessToken, refreshToken }` seed.
- **`partnerToken` is now the client's credential** and is required for every
  call. Passing both `partnerToken` and `tokenStore` throws at construction
  rather than silently picking one.
- **No silent refresh.** A `401` / `resultType 4` raises `AuthenticationError`
  with no retry — a partner token is issued out of band and cannot be renewed
  from here. Install a newly issued token in the token store instead.
- **A missing token fails before dispatch** with `AuthenticationError`, rather
  than sending an anonymous request that returns an opaque `401`.
- **Escape hatch `auth` defaults to `partner`**; the `bearer` mode no longer
  exists. `public` remains, for unauthenticated endpoints outside the surface.
- `ENVIRONMENT_BASE_URLS` → `ENVIRONMENT_API_ROOTS` (now version-less), plus a
  new `resolveBaseUrl(environment, apiVersion)` helper.
- `measures.partnerHealthInformation` → `measures.healthInformation`.
- `doctors.search` `orderParams` no longer accepts `point`, and `otherParams` /
  `perPageLimit` are gone — the `/outher` search does not support them.

### Added

- **`apiVersion: "v3" | "v4"`** client option. Every path is version-agnostic, so
  targeting v4 is configuration, not a code change. Default stays `v3`.
- `AuthorizationError` (403) now documents the "token has no company" case, not
  just a missing scope.

### Removed

- `client.auth` (all 11 methods), `client.payments` (5), `client.skin`,
  `client.meals`, `client.addresses` (4) — no company-scoped equivalent exists.
- The patient-persona `doctors` / `slots` / `appointments` / `measures` /
  `laboratory` / `diets` that lived at the root in 0.6.0.
- `clientId` / `clientSecret` client options.
- The `LoginMode`, `ConnectInput`, `LoginData`, `LoginResult`, `TwoFactorInput`,
  registration, password-reset, payment, skin, meal and address model types.

## [0.6.0]

### Added

- `client.auth.confirmRegistrationEmail(input)` — the **required** e-mail-branch middle
  step of registration (`POST /patients/emailConfirmationRegister`). A headerless SDK
  caller always gets `confirmationType: "email"` from `verifyRegistration`; confirm the
  e-mailed code here to receive the SMS blob that `register` consumes (without it,
  `register` returns 501).
- Social sign-up: `client.auth.verifyRegistrationSocial(input)` +
  `client.auth.registerSocial(input)` (both public; `registerSocial` does not
  auto-login — call `connect({ loginMode: "social" })` after).
- Password reset: `client.auth.forgotPassword(input)` + `client.auth.resetPassword(input)`.
- `client.appointments.list(page?)` (`GET /patients/userAppointments`) — the source of the
  `event_id` that `cancel` requires — and `client.appointments.reservations()`.
- New `client.addresses` group (`list`/`add`/`update`/`delete`) over `/patients/userAddress`,
  required by `laboratory.order` (which needs an `addressId`).
- Types: `ConfirmRegistrationEmailInput`, `VerifyRegistrationSocialInput`,
  `RegisterSocialInput`, `ForgotPasswordInput`, `ResetPasswordInput`, `ChallengeResult`,
  `AddressInput`, `AddressUpdateInput`.

## [0.5.0]

### Added

- `client.auth.verifyRegistration(input)` — step 1 of registration
  (`POST /patients/verifyAddingNewPatient`): sends the SMS/e-mail verification code
  and returns the encrypted `response` blob to pass to `register`. Uses the
  configured **partner** token (the endpoint is behind `auth:apiusers`, not public)
  and requires a browser-minted CAPTCHA token (`recaptchaV2` or `captcha`).
- Types: `VerifyRegistrationInput`, `VerifyRegistrationResult`.

## [0.4.0]

### Added

- `client.laboratory` — the patient's lab results and orderable test catalog:
  `results(page?)` (`GET /patients/userLabTestList/{page?}`),
  `resultDetail(testId)` (`GET /patients/userLabTestDetail/{testId}` — `testId`
  may carry a `-lab` suffix), `catalog()` (`GET /patients/allLaboratoryTests`),
  `catalogDetail(id)` (`GET /patients/laboratoryTestDetail/{id}`) and
  `order(input)` (`POST /patients/addNewLaboratoryTest`).
- `client.diets` — the patient's diet lists: `list(page?)`
  (`GET /patients/dietLists/{page?}`) and `detail(listId)`
  (`GET /patients/diet/{listId}`).
- Types: `LabOrderInput`, `LabResultListItem`, `DietListItem`.

## [0.3.0]

### Added

- `client.skin.analyze(images)` — "Cildimde Neyim Var" AI skin-lesion analysis
  (`POST /patients/imageCheck`). Returns per-image lesion `label`, a Turkish AI
  `comment`, `confidence`, `possible_icd` and an opaque `case_detail` blob (which
  can be forwarded as a payment's `caseDetail`).
- `client.meals.analyze(input)` — AI meal-photo calorie/nutrition estimation
  (`POST /patients/imageAnalyzeMeal`).
- Types: `SkinImage`, `SkinAnalysis`, `SkinAnalysisResult`, `MealAnalysisInput`,
  `MealAnalysisResult`, `PortionSize`, `MealType`.

## [0.2.0]

### Added

- `client.request(...)` escape hatch for calling any endpoint not yet covered by a
  typed resource method (DESIGN.md §7.2).

## [0.1.0]

### Added

- Initial release: `auth`, `doctors`, `slots`, `appointments`, `payments`,
  `measures` service groups over a shared transport with silent token refresh.
