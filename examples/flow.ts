/**
 * End-to-end partner example: check a doctor → slots → reserve → confirm,
 * plus a health-measures read/write round trip.
 *
 * Run against the test environment with your partner token in an env var:
 *
 *   BK_PARTNER_TOKEN, BK_DOCTOR_ID, BK_PATIENT_PHONE, BK_PATIENT_TCKN
 *
 * In this workspace, run with: `npx tsx examples/flow.ts`
 * (When installed from npm, import from "@bulutklinik/sdk" instead of "../src/index".)
 */
import { BulutklinikClient } from "../src/index";

async function main(): Promise<void> {
  const client = new BulutklinikClient({
    environment: "test",
    partnerToken: process.env.BK_PARTNER_TOKEN ?? "",
  });

  // 1. Discovery. These need no patient data, so they are the fastest way to
  //    prove the token and base URL are right.
  const branches = await client.doctors.branches();
  console.log("branches:", branches.length);

  const doctorId = Number(process.env.BK_DOCTOR_ID ?? "8282");
  const bookable = await client.appointments.checkDoctor({ doctorId, isOutherDoctor: 0 });
  console.log("doctor bookable through this integration:", bookable);

  // 2. Availability. `slotId` from here feeds the reservation.
  const schedule = await client.slots.schedule({ doctorId, scheduleDate: "2026-08-01" });
  console.log("slots:", JSON.stringify(schedule, null, 2));

  // 3. Booking. The patient is named inline — there is no session.
  //
  //    `reserve` returns a `url` to hand to the patient for agreements and
  //    payment. Use `reserveWithoutAgreement` + `create` instead when your own
  //    flow already collected the agreements, as below.
  const user = {
    name: "Ada",
    surname: "Lovelace",
    phoneNumber: process.env.BK_PATIENT_PHONE ?? "+905551112233",
    identityNumber: process.env.BK_PATIENT_TCKN,
  };

  const firstDay = Object.values(schedule)[0] ?? [];
  const slot = firstDay[0];
  if (slot) {
    const held = (await client.appointments.reserveWithoutAgreement({
      slotId: slot.slotId,
      doctorId,
      user,
    })) as { hash: string; reservationExpired: string };
    console.log("held until", held.reservationExpired);

    // `outherProcessId` comes from the reservation response alongside `hash`.
    // await client.appointments.create({ hash: held.hash, outherProcessId });
  }

  // 4. Measurements. Writes create the patient in your company if absent;
  //    reads only ever look inside your company.
  await client.measures.addList(user, [
    { type: "tension", date_time: "2026-06-17 09:30", hypertension: 120, hypotension: 80 },
    { type: "pulse", date_time: "2026-06-17 09:31", pulse: 72 },
  ]);
  console.log("measures submitted");

  const latest = await client.measures.last({ phoneNumber: user.phoneNumber });
  console.log("latest measures:", JSON.stringify(latest, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
