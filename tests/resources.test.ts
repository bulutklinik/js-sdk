import { describe, expect, it } from "vitest";
import { BulutklinikClient } from "../src";
import { bodyOf, jsonResponse, makeFetch } from "./helpers";

const BASE = "https://apitest.bulutklinik.com/api/v3";

function partnerClient() {
  const { fetchImpl, calls } = makeFetch(() => jsonResponse({ resultType: 0, data: null }));
  const client = new BulutklinikClient({
    environment: "test",
    partnerToken: "PT",
    fetch: fetchImpl,
  });
  return { client, calls };
}

describe("resource surface", () => {
  it("builds the discovery paths", async () => {
    const { client, calls } = partnerClient();

    await client.doctors.branches();
    await client.doctors.locations();
    await client.doctors.detail(42);
    await client.laboratory.catalog();
    await client.laboratory.catalogDetail(18246);
    await client.slots.schedule({ doctorId: 7, scheduleDate: "2026-08-01" });

    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/outher/branches`,
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

    await client.diets.list(patient, 2);
    await client.measures.list(patient, "glucose", 1, 0);
    await client.laboratory.results(patient);

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

  it("builds the measures graph path from type and period", async () => {
    const { client, calls } = partnerClient();

    await client.measures.graph({ phoneNumber: "+905551112233" }, "weight", 3);

    expect(calls[0]!.url).toBe(`${BASE}/outher/measuresGraph/weight/3`);
  });

  it("passes a lab result id through unchanged, suffix and all", async () => {
    const { client, calls } = partnerClient();
    const patient = { identityNumber: "12345678901" };

    await client.laboratory.resultDetail(patient, "1234-lab");
    expect(bodyOf(calls[0]!).testId).toBe("1234-lab");

    await client.laboratory.resultDetail(patient, 1234);
    expect(bodyOf(calls[1]!).testId).toBe("1234");
  });

  it("uses the right verb and path for the measure write endpoints", async () => {
    const { client, calls } = partnerClient();
    const writePatient = { name: "Ada", surname: "Lovelace", phoneNumber: "+905551112233" };
    const ref = { identityNumber: "12345678901" };

    await client.measures.addList(writePatient, [
      { type: "pulse", date_time: "2026-06-17 09:00", pulse: 72 },
    ]);
    await client.measures.add(writePatient, "tension", {
      date_time: "2026-06-17 09:00",
      hypertension: 120,
      hypotension: 80,
    });
    await client.measures.update(ref, "tension", 9, {
      date_time: "2026-06-17 10:00",
      hypertension: 125,
      hypotension: 85,
    });
    await client.measures.delete(ref, "tension", 9);

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

  it("books through the appointment lifecycle", async () => {
    const { client, calls } = partnerClient();
    const user = { name: "Ada", surname: "Lovelace", phoneNumber: "+905551112233" };

    await client.appointments.checkDoctor({ doctorId: 2, isOutherDoctor: 0 });
    await client.appointments.reserveWithoutAgreement({ slotId: 1, doctorId: 2, user });
    await client.appointments.create({ hash: "h", outherProcessId: 5 });
    await client.appointments.list({ phoneNumber: "+905551112233" });
    await client.appointments.cancelWithoutSlot({ hash: "h", outherProcessId: 5 });

    expect(calls.map((c) => [c.init.method, c.url])).toEqual([
      ["POST", `${BASE}/outher/checkDoctor`],
      ["POST", `${BASE}/outher/reservationWithoutAgreement`],
      ["POST", `${BASE}/outher/appointment`],
      ["POST", `${BASE}/outher/appointments`],
      ["DELETE", `${BASE}/outher/appointmentWithoutSlot`],
    ]);
    expect(bodyOf(calls[1]!)).toEqual({ slotId: 1, doctorId: 2, user });
  });

  it("sends the hand-off reservation and the instant one to their own paths", async () => {
    const { client, calls } = partnerClient();
    const user = { name: "Ada", surname: "Lovelace", phoneNumber: "+905551112233" };

    await client.appointments.reserve({ slotId: 1, doctorId: 2, user });
    await client.appointments.instantReserve({ user });
    await client.appointments.createWithoutSlot({
      doctorId: 2,
      startDate: "2026-08-01 09:00",
      finishDate: "2026-08-01 09:30",
      user,
    });

    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/outher/reservation`,
      `${BASE}/outher/instantReservation`,
      `${BASE}/outher/appointmentWithoutSlot`,
    ]);
    expect(bodyOf(calls[1]!)).toEqual({ user });
  });

  it("keeps the legacy teusan contract flat", async () => {
    const { client, calls } = partnerClient();

    await client.measures.healthInformation({
      identity: "12345678901",
      phoneNumber: "+905551112233",
      data: [{ type: "pulse", date_time: "2026-06-17 09:00", pulse: 72 }],
    });

    expect(calls[0]!.url).toBe(`${BASE}/outher/healthInformation`);
    // No `patient` wrapper here — this endpoint predates that contract.
    expect(bodyOf(calls[0]!)).toEqual({
      identity: "12345678901",
      phoneNumber: "+905551112233",
      data: [{ type: "pulse", date_time: "2026-06-17 09:00", pulse: 72 }],
    });
  });
});
