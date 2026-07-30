// Live smoke test against the Bulutklinik test environment (apitest).
// Read-only flow; each step is independent and failures are reported, not fatal.
//
// Needs a partner token issued for a test company with the `apiouther` scope:
//   BK_PARTNER_TOKEN=... node scripts/live-check.mjs
//
// Unlike the patient surface there is no shared test credential — the token is
// per-integration. Steps that touch a patient need one that exists inside the
// token's own company; set BK_PATIENT_TCKN or BK_PATIENT_PHONE to run them.
import { ApiError, BulutklinikClient } from "../dist/index.js";

const partnerToken = process.env.BK_PARTNER_TOKEN;
if (!partnerToken) {
  console.error("BK_PARTNER_TOKEN is required.");
  process.exit(2);
}

const client = new BulutklinikClient({
  environment: "test",
  apiVersion: process.env.BK_API_VERSION ?? "v3",
  partnerToken,
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

// --- Scope-only steps: these prove the token and base URL without any patient.
const branches = await step("doctors.branches", () => client.doctors.branches());
console.log(`    branches=${Array.isArray(branches) ? branches.length : typeof branches}`);

const locations = await step("doctors.locations", () => client.doctors.locations());
console.log(`    locations=${Array.isArray(locations) ? locations.length : typeof locations}`);

const catalog = await step("laboratory.catalog", () => client.laboratory.catalog());
console.log(`    catalog=${Array.isArray(catalog) ? catalog.length : typeof catalog}`);

const found = await step("doctors.search (filtered)", () =>
  client.doctors.search({
    searchParams: { withFreeText: "kardiyoloji" },
    orderParams: ["slot"],
    currentPage: 1,
  }),
);
console.log(`    foundDoctorsCount=${found?.foundDoctorsCount ?? "n/a"}`);

const doctorId = Number(process.env.BK_DOCTOR_ID ?? "8282");
const detail = await step("doctors.detail", () => client.doctors.detail(doctorId));
console.log(`    detailKeys=${detail ? Object.keys(detail).length : "n/a"}`);

await step("appointments.checkDoctor", () =>
  client.appointments.checkDoctor({ doctorId, isOutherDoctor: 0 }),
);

const slots = await step("slots.schedule", () => client.slots.schedule({ doctorId }));
if (slots) {
  const days = Object.keys(slots);
  const firstWithSlots = days.find((d) => Array.isArray(slots[d]) && slots[d].length > 0);
  console.log(`    slotDays=${days.length} firstDayWithSlots=${firstWithSlots ?? "none"}`);
}

// --- Patient-scoped steps. A TCKN that works on the patient surface will not
//     necessarily resolve here: the patient must exist in the token's company.
const patient = process.env.BK_PATIENT_TCKN
  ? { identityNumber: process.env.BK_PATIENT_TCKN }
  : process.env.BK_PATIENT_PHONE
    ? { phoneNumber: process.env.BK_PATIENT_PHONE }
    : null;

if (patient) {
  const last = await step("measures.last", () => client.measures.last(patient));
  console.log(`    measuresLastKeys=${last ? Object.keys(last).length : "n/a"}`);

  await step("diets.list", () => client.diets.list(patient));
  await step("laboratory.results", () => client.laboratory.results(patient));
} else {
  console.log("--  skipped patient-scoped steps (set BK_PATIENT_TCKN or BK_PATIENT_PHONE)");
}

const passed = results.filter(([, ok]) => ok).length;
console.log(`\nSUMMARY: ${passed}/${results.length} steps OK`);
console.log(results.map(([n, ok]) => `  ${ok ? "OK " : "ERR"} ${n}`).join("\n"));
