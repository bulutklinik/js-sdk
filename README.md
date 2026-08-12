# @bulutklinik/sdk

Official Bulutklinik **partner** API SDK for JavaScript / TypeScript. Zero
runtime dependencies (uses the platform `fetch`), fully typed, ESM + CJS.

This is a single-persona SDK: every call runs on the company-scoped `/outher`
surface with the partner token issued for your integration. You act on the
patients of **your own company**, and the patient is named inline on each
request — there is no patient session. See [`DESIGN.md`](./DESIGN.md) for
the full wire contract.

> **1.1.0 restores `client.auth`.** 1.0.x wrongly assumed the partner token could
> only be issued out of band; it is in fact minted by `connectApi` from your
> portal credentials, and it is refreshable. Existing 1.0.x code that passes
> `partnerToken` keeps working. See [CHANGELOG.md](./CHANGELOG.md).

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
  clientId: process.env.BK_CLIENT_ID,
  clientSecret: process.env.BK_CLIENT_SECRET,
});

// 0) Log in. Tokens are stored and refreshed for you.
await client.auth.connect({
  apiUserName: process.env.BK_SERVICE_IDENTITY,  // from your portal application
  apiUserPassword: process.env.BK_APP_PASSWORD,  // this application's password
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

31 endpoints across seven groups.

| Group                 | Methods |
|-----------------------|---------|
| `client.auth`         | `connect`, `refresh`, `disconnect` |
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

Your portal application issues four values: a **client ID**, a **client secret**,
a project-specific **service identity** and an **application password**. The
password belongs to this application only — it is not your portal account
password, and you can regenerate it in the portal if it leaks. `auth.connect`
exchanges them for an access token and
a refresh token:

```ts
const client = new BulutklinikClient({ clientId, clientSecret });

await client.auth.connect({
  apiUserName: "svc@your-app.bulutklinik",
  apiUserPassword: "…",
  loginMode: "email", // default
});
```

The granted scope comes from the credentials, not from the request — a partner
application is provisioned with `apiouther`, which is what makes the `/outher`
surface reachable.

Already holding a token? Pass it instead and skip the login:

```ts
const client = new BulutklinikClient({ partnerToken: "…" });
```

Pass `partnerToken` **or** `tokenStore`, not both — the constructor rejects it
rather than guessing which you meant.

### Refresh

Access tokens last ~30 days, refresh tokens ~130. You do not normally call
`refresh` yourself: on a `401` / `resultType 4` the SDK refreshes once, retries
the original request, and concurrent calls share a single in-flight refresh.

```ts
await client.auth.refresh();     // only useful to refresh ahead of time
await client.auth.disconnect();  // revokes both tokens and clears the store
```

If the refresh fails — or there is no refresh token because you supplied a bare
`partnerToken` — the call raises `AuthenticationError` and you should
`auth.connect` again.

### Token storage

Tokens are read from a token store on **every** request, so a long-running
process can rotate them without being rebuilt:

```ts
import type { RefreshTokenStore } from "@bulutklinik/sdk";

const tokenStore: RefreshTokenStore = {
  getToken: () => readFromVault("access"),
  setToken: (t) => writeToVault("access", t),
  getRefreshToken: () => readFromVault("refresh"),
  setRefreshToken: (t) => writeToVault("refresh", t),
  clear: () => wipeVault(),
};

const client = new BulutklinikClient({ tokenStore, clientId, clientSecret });
```

The refresh methods are **optional**. A plain `TokenStore` — the 1.0.x shape,
access token only — still works; the SDK then keeps the refresh token in memory,
so a process restart needs `auth.connect` rather than a refresh.

A `403` means the credential itself is wrong: either the granted scope does not
include `apiouther`, or the account has no company attached. The company boundary
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
shared consumer tenant. Its patient matching is an **OR**, and it is loose: the lookup is
`identity OR phoneNumber` against the *global* user table and takes the first
row, so a phone number alone can resolve someone whose TCKN differs from the one
you sent. Send both, but do not assume they are checked as a pair — the
`apiouther` reads above do the opposite, scoping to your company and failing
closed on ambiguity. Prefer `addList` for anything new.

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
