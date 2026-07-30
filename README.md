# @bulutklinik/sdk

Official Bulutklinik **partner** API SDK for JavaScript / TypeScript. Zero
runtime dependencies (uses the platform `fetch`), fully typed, ESM + CJS.

This is a single-persona SDK: every call runs on the company-scoped `/outher`
surface with the partner token issued for your integration. You act on the
patients of **your own company**, and the patient is named inline on each
request — there is no login and no session. See [`DESIGN.md`](./DESIGN.md) for
the full wire contract.

> **1.0.0 is a breaking release.** The patient persona (login, registration,
> payments, AI analysis, address book) has been removed and the former
> `client.partner.*` namespace was lifted to the client root. See
> [CHANGELOG.md](./CHANGELOG.md) and DESIGN.md §12 for the migration.

## Install

```bash
npm install @bulutklinik/sdk
```

Requires Node.js >= 18 (or any runtime with a global `fetch`).

## Quick start

```ts
import { BulutklinikClient } from "@bulutklinik/sdk";

const client = new BulutklinikClient({
  environment: "production",  // "production" | "test" | "local"
  apiVersion: "v3",           // "v3" (default) | "v4"
  partnerToken: process.env.BK_PARTNER_TOKEN,
});

// 1) Find a doctor you can book
const { foundDoctors } = await client.doctors.search({
  searchParams: { withFreeText: "kardiyoloji" },
  orderParams: ["slot"],
  currentPage: 1,
});
const doctorId = foundDoctors[0].doctor_id;

// 2) Free slots
const schedule = await client.slots.schedule({ doctorId, scheduleDate: "2026-08-01" });
const slot = Object.values(schedule)[0]?.[0];

// 3) Hold it for a patient — named inline, no session
const held = await client.appointments.reserveWithoutAgreement({
  slotId: slot.slotId,
  doctorId,
  user: { name: "Ada", surname: "Lovelace", phoneNumber: "+905551112233" },
});

// 4) Confirm before `held.reservationExpired` passes
await client.appointments.create({ hash: held.hash, outherProcessId: held.outherProcessId });
```

## Services

28 endpoints across six groups.

| Group                 | Methods |
|-----------------------|---------|
| `client.doctors`      | `search`, `branches`, `detail`, `locations` |
| `client.slots`        | `schedule` |
| `client.appointments` | `reserve`, `reserveWithoutAgreement`, `instantReserve`, `create`, `createWithoutSlot`, `cancelWithoutSlot`, `list`, `info`, `checkDoctor` |
| `client.measures`     | `last`, `list`, `graph`, `addList`, `add`, `update`, `delete`, `healthInformation` |
| `client.laboratory`   | `catalog`, `catalogDetail`, `results`, `resultDetail` |
| `client.diets`        | `list`, `detail` |

## Naming a patient

There is no session, so every patient-scoped call carries the patient in its
body — never in the URL, since a TCKN in a path segment would land in access
logs, proxy logs and error breadcrumbs.

**Reads** take a light reference. The server looks only inside your own company
and never creates anything:

```ts
await client.measures.last({ identityNumber: "12345678901" });
await client.diets.list({ phoneNumber: "+905551112233" });
```

`identityNumber` is primary; `phoneNumber` is a fallback accepted only when it
matches exactly one patient (the column is not unique — family members share
numbers). A patient you have never treated resolves to "not found", with the same
message as "not yours" so the endpoint cannot be used to probe for TCKNs.

**Writes** take the descriptive shape, because the patient is created inside your
company if absent:

```ts
await client.measures.addList(
  { name: "Ada", surname: "Lovelace", phoneNumber: "+905551112233" },
  [{ type: "pulse", date_time: "2026-06-17 09:31", pulse: 72 }],
);
```

## Booking

Two flows, depending on who collects the agreements and the payment:

```ts
// (A) Hand off to the patient — returns a browser `url` for agreements + payment.
const { url } = await client.appointments.reserve({ slotId, doctorId, user });

// (B) You already collected them — returns a `hash` to confirm yourself.
const held = await client.appointments.reserveWithoutAgreement({ slotId, doctorId, user });
await client.appointments.create({ hash: held.hash, outherProcessId });
```

**Payment is never taken through the API.** No partner endpoint produces a
financial record; the browser hand-off in (A) is where payment happens. The SDK
returns `url` verbatim and never opens or follows it.

`createWithoutSlot` books a free-form range outside the slot grid, for
integrations running their own calendar; `cancelWithoutSlot` reverses it — and
only it.

## Authentication

The partner token is **issued out of band** through the Bulutklinik Developer
Platform. It behaves like an API key: there is no login method, and the SDK
cannot renew it.

```ts
const client = new BulutklinikClient({ partnerToken: "…" });
```

The token is read from a token store on **every** request, so a long-running
process can pick up a newly issued one without being rebuilt:

```ts
import type { TokenStore } from "@bulutklinik/sdk";

const tokenStore: TokenStore = {
  getToken: () => readFromVault(),
  setToken: (t) => writeToVault(t),
  clear: () => wipeVault(),
};

const client = new BulutklinikClient({ tokenStore });

// …or rotate the default in-memory store in place:
await client.tokenStore.setToken(newlyIssuedToken);
```

Pass `partnerToken` **or** `tokenStore`, not both — the constructor rejects it
rather than guessing which one you meant.

### When the token expires

Tokens last about 30 days. An expired one comes back as `401` / `resultType 4`;
the SDK raises `AuthenticationError` and does **not** retry — there is nothing to
refresh. Recovery is operational: obtain a newly issued token and write it into
the store.

> This is the one behaviour that changed meaning in 1.0.0. On the patient SDK
> `resultType 4` meant "the SDK will fix this silently". Here it means the opposite.

A `403` means the credential itself is wrong — either the token lacks the
`apiouther` scope, or it resolves to a user with no company. The company boundary
comes from the token, never from request input, so retrying with different body
parameters will not help.

## Health measures

```ts
// Write several measurements at once (max 200 per call, one transaction)
await client.measures.addList(patient, [
  { type: "tension", date_time: "2026-06-17 09:30", hypertension: 120, hypotension: 80 },
  { type: "glucose", date_time: "2026-06-17 09:35", glucose: 95, glucose_type: 0 },
]);

// Latest of each type / paginated history / graph
await client.measures.last(ref);
await client.measures.list(ref, "glucose", 1, 0); // glucoseType 0=fasting, 1=postprandial
await client.measures.graph(ref, "tension", 2);   // period 2 = weekly
```

> Measurements are written to **your own company**. A value you write does not
> appear in the patient's Bulutklinik mobile app, and values they entered there
> are not visible to you. That is tenant isolation working as intended.

`measures.healthInformation` is the legacy `teusan` bulk endpoint, kept for
existing integrations: it needs the `teusan` scope instead of `apiouther`, takes
a flat `identity` + `phoneNumber` instead of `patient`, and writes into the
shared consumer tenant. The API currently matches on `phoneNumber` only (a
server-side bug nulls `identity` during validation); send both for forward
compatibility. Prefer `addList` for anything new.

## Escape hatch

Not every endpoint has a typed method. `client.request` reuses the same
transport, so headers, envelope unwrapping and typed errors all still apply:

```ts
const data = await client.request({ method: "GET", path: "/outher/somethingNew" });

// `public` reaches unauthenticated endpoints outside the partner surface,
// e.g. the city/district catalogue that feeds address forms.
const config = await client.request({
  method: "GET",
  path: "/general/getConfig",
  auth: "public",
});
```

## Errors

All errors extend `BulutklinikError`:

`TransportError` (network/timeout) · `ApiError` → `ValidationError` (422),
`AuthenticationError` (401 / revoked / expired), `AuthorizationError` (403),
`NotFoundError` (404), `RateLimitError` (429, `retryAfter`).

```ts
import { ValidationError, RateLimitError } from "@bulutklinik/sdk";

try {
  await client.measures.last(ref);
} catch (err) {
  if (err instanceof RateLimitError) console.log("retry after", err.retryAfter);
  else if (err instanceof ValidationError) console.log("invalid:", err.data);
  else throw err;
}
```

Note that `/outher` reports most business-rule failures as HTTP **`501`** with
`resultType 1` — "patient not found in your company", "slot no longer free",
"doctor not bookable through your integration". It is not a server crash; read
`errorMessage`.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

## License

MIT
