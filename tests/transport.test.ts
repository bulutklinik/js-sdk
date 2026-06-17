import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  BulutklinikClient,
  MemoryTokenStore,
  NotFoundError,
  RateLimitError,
  TransportError,
  ValidationError,
} from "../src/index";
import { authHeader, bodyOf, jsonResponse, makeFetch } from "./helpers";

describe("transport", () => {
  it("unwraps data on success and sends bearer + lang headers", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({ resultType: 0, data: { searchedDoctors: [] } }),
    );
    const client = new BulutklinikClient({
      environment: "test",
      fetch: fetchImpl,
      tokenStore: new MemoryTokenStore({ accessToken: "abc" }),
    });

    const res = await client.doctors.quickSearch({ searchText: "kardiyo" });

    expect(res).toEqual({ searchedDoctors: [] });
    expect(calls[0]!.url).toBe("https://apitest.bulutklinik.com/api/v3/patients/quickSearch");
    expect(authHeader(calls[0]!)).toBe("Bearer abc");
    expect(new Headers(calls[0]!.init.headers).get("lang")).toBe("tr");
    expect(bodyOf(calls[0]!)).toEqual({ searchText: "kardiyo", listType: null, location: null });
  });

  it("maps 422 to ValidationError", async () => {
    const { fetchImpl } = makeFetch(() =>
      jsonResponse({ resultType: 1, errorType: "validation", errorMessage: "bad" }, 422),
    );
    const client = new BulutklinikClient({ environment: "test", fetch: fetchImpl });
    await expect(client.doctors.branches()).rejects.toBeInstanceOf(ValidationError);
  });

  it("maps 404 and 429", async () => {
    const notFound = new BulutklinikClient({
      environment: "test",
      fetch: makeFetch(() => jsonResponse({ resultType: 1 }, 404)).fetchImpl,
    });
    await expect(notFound.doctors.branches()).rejects.toBeInstanceOf(NotFoundError);

    const rate = new BulutklinikClient({
      environment: "test",
      fetch: makeFetch(() => jsonResponse({ resultType: 1 }, 429, { "retry-after": "30" })).fetchImpl,
    });
    await expect(rate.doctors.branches()).rejects.toBeInstanceOf(RateLimitError);
  });

  it("handles a numeric errorType without crashing (live-found case)", async () => {
    const { fetchImpl } = makeFetch(() =>
      jsonResponse({ resultType: 1, errorType: 1, errorMessage: "Bilinmeyen bir hata oluştu." }, 404),
    );
    const client = new BulutklinikClient({
      environment: "test",
      fetch: fetchImpl,
      tokenStore: new MemoryTokenStore({ accessToken: "a" }),
    });
    await expect(
      client.doctors.quickSearch({ searchText: "kardiyo" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refreshes once on 401 then retries with the new token", async () => {
    let dataCalls = 0;
    const { fetchImpl, calls } = makeFetch((url) => {
      if (url.endsWith("/general/refreshApi")) {
        return jsonResponse({ resultType: 0, data: { access_token: "new", refresh_token: "newr" } });
      }
      dataCalls += 1;
      return dataCalls === 1
        ? jsonResponse({ resultType: 4 }, 401)
        : jsonResponse({ resultType: 0, data: { ok: true } });
    });
    const store = new MemoryTokenStore({ accessToken: "old", refreshToken: "r" });
    const client = new BulutklinikClient({
      environment: "test",
      clientId: "c",
      clientSecret: "s",
      fetch: fetchImpl,
      tokenStore: store,
    });

    const res = await client.measures.last();

    expect(res).toEqual({ ok: true });
    expect(await store.getAccessToken()).toBe("new");
    expect(authHeader(calls.at(-1)!)).toBe("Bearer new");
  });

  it("retries at most once and clears the store when refresh fails", async () => {
    let refreshCalls = 0;
    const { fetchImpl } = makeFetch((url) => {
      if (url.endsWith("/general/refreshApi")) {
        refreshCalls += 1;
        return jsonResponse({ resultType: 1 }, 401);
      }
      return jsonResponse({ resultType: 4 }, 401);
    });
    const store = new MemoryTokenStore({ accessToken: "old", refreshToken: "r" });
    const client = new BulutklinikClient({
      environment: "test",
      clientId: "c",
      clientSecret: "s",
      fetch: fetchImpl,
      tokenStore: store,
    });

    await expect(client.measures.last()).rejects.toBeInstanceOf(AuthenticationError);
    expect(refreshCalls).toBe(1);
    expect(await store.getAccessToken()).toBeNull();
  });

  it("clears the store and throws on logout (resultType 2)", async () => {
    const store = new MemoryTokenStore({ accessToken: "a", refreshToken: "r" });
    const { fetchImpl } = makeFetch(() => jsonResponse({ resultType: 2, errorMessage: "logged out" }));
    const client = new BulutklinikClient({ environment: "test", fetch: fetchImpl, tokenStore: store });

    await expect(client.measures.last()).rejects.toBeInstanceOf(AuthenticationError);
    expect(await store.getAccessToken()).toBeNull();
  });

  it("wraps network failures in TransportError", async () => {
    const fetchImpl = (async () => {
      throw new Error("boom");
    }) as typeof fetch;
    const client = new BulutklinikClient({ environment: "test", fetch: fetchImpl });
    await expect(client.doctors.branches()).rejects.toBeInstanceOf(TransportError);
  });

  it("builds the measure list path and uses the partner token", async () => {
    const { fetchImpl, calls } = makeFetch(() => jsonResponse({ resultType: 0, data: null }));
    const client = new BulutklinikClient({
      environment: "test",
      partnerToken: "PT",
      fetch: fetchImpl,
      tokenStore: new MemoryTokenStore({ accessToken: "a" }),
    });

    await client.measures.list("glucose", 1, 0);
    expect(calls[0]!.url).toBe(
      "https://apitest.bulutklinik.com/api/v3/patients/userMeasuresList/glucose/1/0",
    );

    await client.measures.partnerHealthInformation({
      phoneNumber: "5551112233",
      data: [{ type: "pulse", date_time: "2026-06-17 09:00", pulse: 72 }],
    });
    expect(authHeader(calls.at(-1)!)).toBe("Bearer PT");
  });
});
