/**
 * End-to-end example: login → search → slots → reserve, plus health measures.
 * Run against the test environment with credentials in env vars:
 *
 *   BK_CLIENT_ID, BK_CLIENT_SECRET, BK_USERNAME, BK_PASSWORD, BK_DOCTOR_ID
 *
 * In this workspace, run with: `npx tsx examples/flow.ts`
 * (When installed from npm, import from "@bulutklinik/sdk" instead of "../src/index".)
 */
import { BulutklinikClient } from "../src/index";

async function main(): Promise<void> {
  const client = new BulutklinikClient({
    environment: "test",
    clientId: process.env.BK_CLIENT_ID ?? "",
    clientSecret: process.env.BK_CLIENT_SECRET ?? "",
  });

  const login = await client.auth.connect({
    apiUserName: process.env.BK_USERNAME ?? "",
    apiUserPassword: process.env.BK_PASSWORD ?? "",
    loginMode: "email",
  });

  if (login.twoFactorRequired) {
    console.log("2FA required. Collect the SMS code, then call:");
    console.log("  client.auth.connectWithTwoFactor({ smsVerificationCode, response })");
    console.log("  response =", login.twoFactorResponse);
    return;
  }

  const search = await client.doctors.quickSearch({ searchText: "kardiyo", listType: "interview" });
  console.log("quickSearch result:", JSON.stringify(search, null, 2));

  const doctorId = Number(process.env.BK_DOCTOR_ID ?? "8282");
  const slots = await client.slots.schedule({ doctorId, listType: "interview" });
  console.log("slots:", JSON.stringify(slots, null, 2));

  await client.measures.addList([
    { type: "tension", date_time: "2026-06-17 09:30", hypertension: 120, hypotension: 80 },
    { type: "pulse", date_time: "2026-06-17 09:31", pulse: 72 },
  ]);
  console.log("measures submitted");

  await client.auth.disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
