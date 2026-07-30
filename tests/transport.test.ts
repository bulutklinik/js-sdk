import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  AuthorizationError,
  BulutklinikClient,
  MemoryTokenStore,
  NotFoundError,
  RateLimitError,
  TransportError,
  ValidationError,
} from "../src/index";
import { authHeader, bodyOf, jsonResponse, makeFetch } from "./helpers";

const BASE = "https://apitest.bulutklinik.com/api/v3";

function client(handler: Parameters<typeof makeFetch>[0], token: string | null = "PT") {
  const { fetchImpl, calls } = makeFetch(handler);
  return {
    client: new BulutklinikClient({
      environment: "test",
      fetch: fetchImpl,
      ...(token === null ? {} : { partnerToken: token }),
    }),
    calls,
  };
}

const ok = () => jsonResponse({ resultType: 0, data: { ok: true } });

describe("transport", () => {
  it("unwraps data and sends the partner token + lang header", async () => {
    const { client: c, calls } = client(() =>
      jsonResponse({ resultType: 0, data: { foundDoctorsCount: 0, foundDoctors: [] } }),
    );

    const res = await c.doctors.search({
      searchParams: { withFreeText: "kardiyoloji" },
      currentPage: 1,
    });

    expect(res).toEqual({ foundDoctorsCount: 0, foundDoctors: [] });
    expect(calls[0]!.url).toBe(`${BASE}/outher/search`);
    expect(authHeader(calls[0]!)).toBe("Bearer PT");
    expect(new Headers(calls[0]!.init.headers).get("lang")).toBe("tr");
    // `searchParams` is forwarded as given: the server rejects an empty one with
    // a validation error, so the SDK must not substitute a default.
    expect(bodyOf(calls[0]!)).toEqual({
      searchParams: { withFreeText: "kardiyoloji" },
      orderParams: [],
      currentPage: 1,
    });
  });

  it("targets v4 when asked, without changing any path", async () => {
    const { fetchImpl, calls } = makeFetch(ok);
    const c = new BulutklinikClient({
      environment: "test",
      apiVersion: "v4",
      partnerToken: "PT",
      fetch: fetchImpl,
    });

    await c.doctors.branches();

    expect(calls[0]!.url).toBe("https://apitest.bulutklinik.com/api/v4/outher/branches");
  });

  it("refuses to dispatch without a token instead of sending an anonymous request", async () => {
    let dispatched = 0;
    const { client: c } = client(() => {
      dispatched += 1;
      return ok();
    }, null);

    await expect(c.doctors.branches()).rejects.toBeInstanceOf(AuthenticationError);
    expect(dispatched).toBe(0);
  });

  it("rejects partnerToken and tokenStore together", () => {
    expect(
      () =>
        new BulutklinikClient({
          partnerToken: "PT",
          tokenStore: new MemoryTokenStore("OTHER"),
        }),
    ).toThrow(/not both/i);
  });

  it("reads the token from the store on every call, so rotation takes effect", async () => {
    const store = new MemoryTokenStore("first");
    const { fetchImpl, calls } = makeFetch(ok);
    const c = new BulutklinikClient({ environment: "test", tokenStore: store, fetch: fetchImpl });

    await c.doctors.branches();
    await store.setToken("second");
    await c.doctors.branches();

    expect(calls.map(authHeader)).toEqual(["Bearer first", "Bearer second"]);
  });

  it("request() escape hatch defaults to the partner token", async () => {
    const { client: c, calls } = client(() => jsonResponse({ resultType: 0, data: { ok: true } }));

    const res = await c.request<{ ok: boolean }>({ method: "GET", path: "/outher/customEndpoint" });

    expect(res).toEqual({ ok: true });
    expect(calls[0]!.url).toBe(`${BASE}/outher/customEndpoint`);
    expect(authHeader(calls[0]!)).toBe("Bearer PT");
  });

  it("request() can still reach a public endpoint", async () => {
    const { client: c, calls } = client(() => jsonResponse({ resultType: 0, data: { id: 7 } }));

    const res = await c.request({
      method: "POST",
      path: "/general/somePublicEndpoint",
      auth: "public",
      body: { foo: "bar" },
    });

    expect(res).toEqual({ id: 7 });
    expect(authHeader(calls[0]!)).toBeNull();
    expect(bodyOf(calls[0]!)).toEqual({ foo: "bar" });
  });

  it("maps 422 to ValidationError", async () => {
    const { client: c } = client(() =>
      jsonResponse({ resultType: 1, errorType: "validation", errorMessage: "bad" }, 422),
    );
    await expect(c.doctors.branches()).rejects.toBeInstanceOf(ValidationError);
  });

  it("maps 403 to AuthorizationError — wrong scope or no company on the token", async () => {
    const { client: c } = client(() => jsonResponse({ resultType: 1 }, 403));
    await expect(c.doctors.branches()).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("maps 404 and 429", async () => {
    const { client: notFound } = client(() => jsonResponse({ resultType: 1 }, 404));
    await expect(notFound.doctors.branches()).rejects.toBeInstanceOf(NotFoundError);

    const { client: rate } = client(() =>
      jsonResponse({ resultType: 1 }, 429, { "retry-after": "30" }),
    );
    await expect(rate.doctors.branches()).rejects.toBeInstanceOf(RateLimitError);
  });

  it("handles a numeric errorType without crashing (live-found case)", async () => {
    const { client: c } = client(() =>
      jsonResponse({ resultType: 1, errorType: 1, errorMessage: "Bilinmeyen bir hata oluştu." }, 404),
    );
    await expect(c.doctors.branches()).rejects.toBeInstanceOf(NotFoundError);
  });

  it("surfaces an expired token (resultType 4) without retrying", async () => {
    let attempts = 0;
    const store = new MemoryTokenStore("expired");
    const { fetchImpl } = makeFetch(() => {
      attempts += 1;
      return jsonResponse({ resultType: 4, errorMessage: "You must log in for this process." }, 401);
    });
    const c = new BulutklinikClient({ environment: "test", tokenStore: store, fetch: fetchImpl });

    await expect(c.measures.last({ identityNumber: "12345678901" })).rejects.toThrow(
      /cannot refresh it/i,
    );
    expect(attempts).toBe(1);
    // An expired token is kept: the caller may want to inspect it while
    // installing the replacement. Only a revoked one is cleared.
    expect(await store.getToken()).toBe("expired");
  });

  it("clears the store and throws on logout (resultType 2)", async () => {
    const store = new MemoryTokenStore("revoked");
    const { fetchImpl } = makeFetch(() =>
      jsonResponse({ resultType: 2, errorMessage: "logged out" }),
    );
    const c = new BulutklinikClient({ environment: "test", tokenStore: store, fetch: fetchImpl });

    await expect(c.measures.last({ identityNumber: "12345678901" })).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(await store.getToken()).toBeNull();
  });

  it("wraps network failures in TransportError", async () => {
    const fetchImpl = (async () => {
      throw new Error("boom");
    }) as typeof fetch;
    const c = new BulutklinikClient({ environment: "test", partnerToken: "PT", fetch: fetchImpl });
    await expect(c.doctors.branches()).rejects.toBeInstanceOf(TransportError);
  });
});
