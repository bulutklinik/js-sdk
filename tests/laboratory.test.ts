import { describe, expect, it } from "vitest";
import { BulutklinikClient, MemoryTokenStore } from "../src/index";
import { authHeader, bodyOf, jsonResponse, makeFetch } from "./helpers";

function makeClient(data: unknown) {
  const { fetchImpl, calls } = makeFetch(() => jsonResponse({ resultType: 0, data }));
  const client = new BulutklinikClient({
    environment: "test",
    fetch: fetchImpl,
    tokenStore: new MemoryTokenStore({ accessToken: "abc" }),
  });
  return { client, calls };
}

const BASE = "https://apitest.bulutklinik.com/api/v3";

describe("laboratory", () => {
  it("results() omits the page segment and uses a bearer token", async () => {
    const { client, calls } = makeClient({ foundTestsCount: 0, foundTests: [] });

    await client.laboratory.results();

    expect(calls[0]!.url).toBe(`${BASE}/patients/userLabTestList`);
    expect(calls[0]!.init.method).toBe("GET");
    expect(authHeader(calls[0]!)).toBe("Bearer abc");
  });

  it("results(page) appends the page segment", async () => {
    const { client, calls } = makeClient({ foundTestsCount: 0, foundTests: [] });

    await client.laboratory.results(3);

    expect(calls[0]!.url).toBe(`${BASE}/patients/userLabTestList/3`);
    expect(calls[0]!.init.method).toBe("GET");
  });

  it("resultDetail() interpolates a string testId verbatim (incl. -lab suffix)", async () => {
    const { client, calls } = makeClient({ id: "4821-lab", test_name: "Hemogram" });

    await client.laboratory.resultDetail("4821-lab");

    expect(calls[0]!.url).toBe(`${BASE}/patients/userLabTestDetail/4821-lab`);
    expect(calls[0]!.init.method).toBe("GET");
    expect(authHeader(calls[0]!)).toBe("Bearer abc");
  });

  it("catalog() hits /patients/allLaboratoryTests", async () => {
    const { client, calls } = makeClient({ test_groups: [] });

    await client.laboratory.catalog();

    expect(calls[0]!.url).toBe(`${BASE}/patients/allLaboratoryTests`);
    expect(calls[0]!.init.method).toBe("GET");
  });

  it("catalogDetail(id) appends the id segment", async () => {
    const { client, calls } = makeClient({ id: 12, name: "Grup" });

    await client.laboratory.catalogDetail(12);

    expect(calls[0]!.url).toBe(`${BASE}/patients/laboratoryTestDetail/12`);
    expect(calls[0]!.init.method).toBe("GET");
  });

  it("order(input) posts the test/address/laboratory ids", async () => {
    const { client, calls } = makeClient({ preOrderId: 99 });

    await client.laboratory.order({ testId: 7, addressId: 3, laboratoryId: 5 });

    expect(calls[0]!.url).toBe(`${BASE}/patients/addNewLaboratoryTest`);
    expect(calls[0]!.init.method).toBe("POST");
    expect(authHeader(calls[0]!)).toBe("Bearer abc");
    expect(bodyOf(calls[0]!)).toEqual({ testId: 7, addressId: 3, laboratoryId: 5 });
  });
});
