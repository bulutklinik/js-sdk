# @bulutklinik/sdk

Official Bulutklinik API SDK for JavaScript / TypeScript. Zero runtime
dependencies (uses the platform `fetch`), fully typed, ESM + CJS.

Covers the patient flow: **auth, doctor search, slots, appointments, payments,
and health measures**. See [`DESIGN.md`](./DESIGN.md) for the full wire contract.

## Install

```bash
npm install @bulutklinik/sdk
```

Requires Node.js >= 18 (or any runtime with a global `fetch`).

## Quick start

```ts
import { BulutklinikClient } from "@bulutklinik/sdk";

const client = new BulutklinikClient({
  environment: "production", // "production" | "test" | "local"
  clientId: process.env.BK_CLIENT_ID,
  clientSecret: process.env.BK_CLIENT_SECRET,
});

// 1) Log in (tokens are stored automatically)
const login = await client.auth.connect({
  apiUserName: "patient@example.com",
  apiUserPassword: "•••••••",
  loginMode: "email",
});

if (login.twoFactorRequired) {
  // Collect the SMS code from the user, then:
  await client.auth.connectWithTwoFactor({
    smsVerificationCode: "123456",
    response: login.twoFactorResponse,
  });
}

// 2) Find a doctor
const { foundDoctors } = await client.doctors.search({
  searchParams: { withFreeText: "kardiyoloji" },
  orderParams: ["slot"],
  otherParams: ["isInterviewable"],
  currentPage: 1,
});

// 3) Get free slots
const slots = await client.slots.schedule({
  doctorId: foundDoctors[0].doctor_id,
  listType: "interview",
});

// 4) Reserve an online appointment ("YYYY-MM-DD HH:mm")
await client.appointments.reserveInterview({
  doctorId: foundDoctors[0].doctor_id,
  appointmentDate: "2026-06-20 14:30",
});
```

## Services

| Group               | Methods |
|---------------------|---------|
| `client.auth`         | `connect`, `connectWithTwoFactor`, `register`, `refresh`, `disconnect` |
| `client.doctors`      | `branches`, `locations`, `quickSearch`, `search`, `detail` |
| `client.slots`        | `schedule` |
| `client.appointments` | `reserveInterview`, `addPhysical`, `cancel` |
| `client.payments`     | `checkDiscountCode`, `getCards`, `saveCard`, `pay`, `deleteCard` |
| `client.measures`     | `addList`, `add`, `update`, `delete`, `last`, `list`, `graph`, `partnerHealthInformation` |
| `client.skin`         | `analyze` |
| `client.meals`        | `analyze` |
| `client.laboratory`   | `results`, `resultDetail`, `catalog`, `catalogDetail`, `order` |
| `client.diets`        | `list`, `detail` |

## Authentication & tokens

- On `connect` / `connectWithTwoFactor` / `register`, access + refresh tokens are
  stored in the token store automatically.
- On a `401` (or `resultType 4`), the SDK **silently refreshes once** and retries
  the request. Concurrent calls share a single refresh.
- Provide a custom `tokenStore` to persist tokens (file, DB, secure storage):

```ts
import type { TokenStore } from "@bulutklinik/sdk";

const tokenStore: TokenStore = {
  getAccessToken: () => readFromDisk("access"),
  getRefreshToken: () => readFromDisk("refresh"),
  setTokens: (a, r) => writeToDisk(a, r),
  clear: () => wipeDisk(),
};

const client = new BulutklinikClient({ tokenStore, clientId, clientSecret });
```

## Payments (3-D Secure)

`payments.pay` returns `{ payment3DUrl }` on a 3DS flow. Open that URL in a
browser; the bank → server callback completes the capture. The SDK never opens
or parses the URL.

## Health measures

```ts
// Submit several measurements at once (primary entrypoint)
await client.measures.addList([
  { type: "tension", date_time: "2026-06-17 09:30", hypertension: 120, hypotension: 80 },
  { type: "glucose", date_time: "2026-06-17 09:35", glucose: 95, glucose_type: 0 },
]);

// Latest of each type / paginated history / graph
await client.measures.last();
await client.measures.list("glucose", 1, 0); // glucoseType 0=fasting, 1=postprandial
await client.measures.graph("tension", 2, 1); // period 2 = weekly
```

> The partner endpoint (`partnerHealthInformation`) uses a separately-configured
> `partnerToken`. Note: the API currently matches the patient by `phoneNumber`
> (a server-side bug nulls `identity` during validation); send both for forward
> compatibility.

## AI image analysis

```ts
// "Cildimde Neyim Var" — analyze one or more skin photos (base64)
const { status } = await client.skin.analyze([{ image: base64Jpeg }]);
for (const s of status) {
  console.log(s.label, s.comment, s.possible_icd);
  // s.case_detail can be forwarded verbatim as a payment's caseDetail
}

// Meal photo → calorie/nutrition estimate
const meal = await client.meals.analyze({
  image: base64Jpeg,
  portionSize: "medium", // small | medium | large | custom
  mealType: "lunch",     // breakfast | lunch | dinner | snack
  // portionGrams: 300,  // required when portionSize is "custom"
  // note: "az yağlı",
});
console.log(meal.status.comment);
```

## Errors

All errors extend `BulutklinikError`:

`TransportError` (network/timeout) · `ApiError` → `ValidationError` (422),
`AuthenticationError` (401 / logout), `AuthorizationError` (403),
`NotFoundError` (404), `RateLimitError` (429, `retryAfter`).

```ts
import { ValidationError, RateLimitError } from "@bulutklinik/sdk";

try {
  await client.payments.pay({ /* … */ });
} catch (err) {
  if (err instanceof RateLimitError) console.log("retry after", err.retryAfter);
  else if (err instanceof ValidationError) console.log("invalid:", err.data);
  else throw err;
}
```

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
