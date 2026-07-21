import { describe, expect, it } from "vitest";
import { BulutklinikClient, MemoryTokenStore } from "../src/index";
import { authHeader, jsonResponse, makeFetch } from "./helpers";

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

describe("diets", () => {
  it("list() omits the page segment and uses a bearer token", async () => {
    const { client, calls } = makeClient({ foundDietsCount: 0, foundDiets: [] });

    await client.diets.list();

    expect(calls[0]!.url).toBe(`${BASE}/patients/dietLists`);
    expect(calls[0]!.init.method).toBe("GET");
    expect(authHeader(calls[0]!)).toBe("Bearer abc");
  });

  it("list(page) appends the page segment", async () => {
    const { client, calls } = makeClient({ foundDietsCount: 0, foundDiets: [] });

    await client.diets.list(2);

    expect(calls[0]!.url).toBe(`${BASE}/patients/dietLists/2`);
    expect(calls[0]!.init.method).toBe("GET");
  });

  it("detail(listId) appends the listId segment", async () => {
    const { client, calls } = makeClient([{ time: "08:00", meals: [] }]);

    await client.diets.detail(456);

    expect(calls[0]!.url).toBe(`${BASE}/patients/diet/456`);
    expect(calls[0]!.init.method).toBe("GET");
    expect(authHeader(calls[0]!)).toBe("Bearer abc");
  });
});
