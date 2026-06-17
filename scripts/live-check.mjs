// Live smoke test against the Bulutklinik test environment (apitest).
// Read-only flow; each step is independent and failures are reported, not fatal.
// Credentials default to the values in the repo's Postman collection (test account).
import { ApiError, BulutklinikClient } from "../dist/index.js";

const client = new BulutklinikClient({
  environment: "test",
  clientId: process.env.BK_CLIENT_ID ?? "96b630b3-f62a-4e67-b33c-b58802dca5af",
  clientSecret: process.env.BK_CLIENT_SECRET ?? "KPgmEavOSomEl8mQu1ZZMoyZaVXBSuuKxrrzMAkX",
});

const results = [];
async function step(name, fn) {
  try {
    const r = await fn();
    console.log(`OK  ${name}`);
    results.push([name, true]);
    return r;
  } catch (e) {
    const detail = e instanceof ApiError ? ` [http=${e.httpStatus} resultType=${e.resultType} errorType=${e.errorType}]` : "";
    console.log(`ERR ${name}: ${e?.constructor?.name} - ${e?.message}${detail}`);
    results.push([name, false]);
    return undefined;
  }
}

const login = await step("auth.connect", () =>
  client.auth.connect({
    apiUserName: process.env.BK_USERNAME ?? "hackathon@bulutklinik.test",
    apiUserPassword: process.env.BK_PASSWORD ?? "Hackathon2026",
    loginMode: "email",
  }),
);
console.log(`    twoFactorRequired=${login?.twoFactorRequired} accessTokenStored=${Boolean(await client.tokenStore.getAccessToken())}`);

const branches = await step("doctors.branches", () => client.doctors.branches());
console.log(`    branches=${Array.isArray(branches) ? branches.length : typeof branches}`);

const locations = await step("doctors.locations", () => client.doctors.locations());
console.log(`    locations=${Array.isArray(locations) ? locations.length : typeof locations}`);

await step("doctors.quickSearch", () =>
  client.doctors.quickSearch({ searchText: "kardiyo", listType: "interview" }),
);

const found = await step("doctors.search (filtered)", () =>
  client.doctors.search({
    searchParams: { withFreeText: "kardiyoloji" },
    orderParams: ["slot"],
    otherParams: ["isInterviewable"],
    currentPage: 1,
    perPageLimit: 10,
  }),
);
console.log(`    foundDoctorsCount=${found?.foundDoctorsCount ?? "n/a"}`);

const doctorId = Number(process.env.BK_DOCTOR_ID ?? "8282");
const detail = await step("doctors.detail", () => client.doctors.detail(doctorId));
console.log(`    detailKeys=${detail ? Object.keys(detail).length : "n/a"}`);

const slots = await step("slots.schedule", () => client.slots.schedule({ doctorId, listType: "interview" }));
if (slots) {
  const days = Object.keys(slots);
  const firstWithSlots = days.find((d) => Array.isArray(slots[d]) && slots[d].length > 0);
  console.log(`    slotDays=${days.length} firstDayWithSlots=${firstWithSlots ?? "none"}`);
}

const last = await step("measures.last", () => client.measures.last());
console.log(`    measuresLastKeys=${last ? Object.keys(last).length : "n/a"}`);

await step("auth.disconnect", () => client.auth.disconnect());

const passed = results.filter(([, ok]) => ok).length;
console.log(`\nSUMMARY: ${passed}/${results.length} steps OK`);
console.log(results.map(([n, ok]) => `  ${ok ? "OK " : "ERR"} ${n}`).join("\n"));
