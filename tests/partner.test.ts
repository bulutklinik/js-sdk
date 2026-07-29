import { describe, expect, it } from "vitest";
import { BulutklinikClient, MemoryTokenStore } from "../src";
import { authHeader, bodyOf, jsonResponse, makeFetch } from "./helpers";

const BASE = "https://apitest.bulutklinik.com/api/v3";

function partnerClient() {
  const { fetchImpl, calls } = makeFetch(() => jsonResponse({ resultType: 0, data: null }));
  const client = new BulutklinikClient({
    environment: "test",
    partnerToken: "PT",
    fetch: fetchImpl,
    // A patient token is present on purpose: partner calls must ignore it.
    tokenStore: new MemoryTokenStore({ accessToken: "PATIENT" }),
  });
  return { client, calls };
}

describe("partner surface", () => {
  it("sends the partner token, never the patient access token", async () => {
    const { client, calls } = partnerClient();

    await client.partner.doctors.branches();
    await client.partner.measures.last({ identityNumber: "12345678901" });

    for (const call of calls) {
      expect(authHeader(call)).toBe("Bearer PT");
    }
  });

  it("leaves the patient surface on the patient token", async () => {
    const { client, calls } = partnerClient();

    await client.doctors.branches();

    expect(authHeader(calls[0]!)).toBe("Bearer PATIENT");
    expect(calls[0]!.url).toBe(`${BASE}/patients/allBranches`);
  });

  it("builds discovery paths", async () => {
    const { client, calls } = partnerClient();

    await client.partner.doctors.locations();
    await client.partner.doctors.detail(42);
    await client.partner.laboratory.catalog();
    await client.partner.laboratory.catalogDetail(18246);
    await client.partner.slots.schedule({ doctorId: 7, scheduleDate: "2026-08-01" });

    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/outher/locations`,
      `${BASE}/outher/doctorInfos/42`,
      `${BASE}/outher/laboratoryCatalog`,
      `${BASE}/outher/laboratoryCatalog/18246`,
      `${BASE}/outher/doctorSlots`,
    ]);
  });

  it("carries the patient reference in the body, not the path", async () => {
    const { client, calls } = partnerClient();
    const patient = { identityNumber: "12345678901" };

    await client.partner.diets.list(patient, 2);
    await client.partner.measures.list(patient, "glucose", 1, 0);
    await client.partner.laboratory.results(patient);

    // The identity number must never leak into a URL — it would land in access
    // logs, proxy logs and error breadcrumbs.
    for (const call of calls) {
      expect(call.url).not.toContain("12345678901");
    }

    expect(calls[0]!.url).toBe(`${BASE}/outher/dietLists`);
    expect(bodyOf(calls[0]!)).toEqual({ patient, currentPage: 2 });

    expect(calls[1]!.url).toBe(`${BASE}/outher/measuresList/glucose`);
    expect(bodyOf(calls[1]!)).toEqual({ patient, currentPage: 1, glucoseType: 0 });

    expect(calls[2]!.url).toBe(`${BASE}/outher/laboratoryResults`);
  });

  it("passes a lab result id through unchanged, suffix and all", async () => {
    const { client, calls } = partnerClient();
    const patient = { identityNumber: "12345678901" };

    await client.partner.laboratory.resultDetail(patient, "1234-lab");
    expect(bodyOf(calls[0]!).testId).toBe("1234-lab");

    await client.partner.laboratory.resultDetail(patient, 1234);
    expect(bodyOf(calls[1]!).testId).toBe("1234");
  });

  it("uses the right verb and path for the measure write endpoints", async () => {
    const { client, calls } = partnerClient();
    const writePatient = { name: "Ada", surname: "Lovelace", phoneNumber: "+905551112233" };
    const ref = { identityNumber: "12345678901" };

    await client.partner.measures.addList(writePatient, [
      { type: "pulse", date_time: "2026-06-17 09:00", pulse: 72 },
    ]);
    await client.partner.measures.add(writePatient, "tension", {
      date_time: "2026-06-17 09:00",
      hypertension: 120,
      hypotension: 80,
    });
    await client.partner.measures.update(ref, "tension", 9, {
      date_time: "2026-06-17 10:00",
      hypertension: 125,
      hypotension: 85,
    });
    await client.partner.measures.delete(ref, "tension", 9);

    expect(calls.map((c) => [c.init.method, c.url])).toEqual([
      ["POST", `${BASE}/outher/measures`],
      ["POST", `${BASE}/outher/measure/tension`],
      ["PUT", `${BASE}/outher/measure/tension`],
      ["DELETE", `${BASE}/outher/measure/tension`],
    ]);

    // Measure fields are flattened alongside `patient`, matching the server shape.
    expect(bodyOf(calls[1]!)).toEqual({
      patient: writePatient,
      date_time: "2026-06-17 09:00",
      hypertension: 120,
      hypotension: 80,
    });
    expect(bodyOf(calls[3]!)).toEqual({ patient: ref, id: 9 });
  });

  it("books through the partner appointment lifecycle", async () => {
    const { client, calls } = partnerClient();
    const user = { name: "Ada", surname: "Lovelace", phoneNumber: "+905551112233" };

    await client.partner.appointments.reserve({ slotId: 1, doctorId: 2, user });
    await client.partner.appointments.create({ hash: "h", outherProcessId: 5 });
    await client.partner.appointments.list({ phoneNumber: "+905551112233" });
    await client.partner.appointments.cancelWithoutSlot({ hash: "h", outherProcessId: 5 });

    expect(calls.map((c) => [c.init.method, c.url])).toEqual([
      ["POST", `${BASE}/outher/reservation`],
      ["POST", `${BASE}/outher/appointment`],
      ["POST", `${BASE}/outher/appointments`],
      ["DELETE", `${BASE}/outher/appointmentWithoutSlot`],
    ]);
    expect(bodyOf(calls[0]!)).toEqual({ slotId: 1, doctorId: 2, user });
  });
});
