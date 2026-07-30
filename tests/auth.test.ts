import { describe, expect, it } from "vitest";
import { AuthenticationError, BulutklinikClient, MemoryTokenStore } from "../src";
import { authHeader, bodyOf, jsonResponse, makeFetch } from "./helpers";

const BASE = "https://apitest.bulutklinik.com/api/v3";

const TOKENS = { access_token: "AT", refresh_token: "RT" };

function client(handler: Parameters<typeof makeFetch>[0], extra: Record<string, unknown> = {}) {
  const { fetchImpl, calls } = makeFetch(handler);
  return {
    client: new BulutklinikClient({
      environment: "test",
      clientId: "cid",
      clientSecret: "csecret",
      fetch: fetchImpl,
      ...extra,
    }),
    calls,
  };
}

describe("auth", () => {
  it("connect posts the portal credentials and stores both tokens", async () => {
    const { client: c, calls } = client(() => jsonResponse({ resultType: 0, data: TOKENS }));

    const result = await c.auth.connect({
      apiUserName: "svc@app.bulutklinik",
      apiUserPassword: "hunter2",
    });

    expect(result.twoFactorRequired).toBe(false);
    expect(calls[0]!.url).toBe(`${BASE}/general/connectApi`);
    // The login call itself is public — it is what produces the credential.
    expect(authHeader(calls[0]!)).toBeNull();
    expect(bodyOf(calls[0]!)).toEqual({
      apiClientId: "cid",
      apiSecretKey: "csecret",
      apiUserName: "svc@app.bulutklinik",
      apiUserPassword: "hunter2",
      loginMode: "email",
    });
    expect(await c.tokenStore.getToken()).toBe("AT");
  });

  it("surfaces the 2FA challenge as a result, not an error", async () => {
    const { client: c } = client(() =>
      jsonResponse({ resultType: 0, data: { response: "BLOB" } }),
    );

    const result = await c.auth.connect({ apiUserName: "svc", apiUserPassword: "p" });

    expect(result.twoFactorRequired).toBe(true);
    expect(result.twoFactorResponse).toBe("BLOB");
    expect(await c.tokenStore.getToken()).toBeNull();
  });

  it("refuses to connect without client credentials", async () => {
    const { fetchImpl } = makeFetch(() => jsonResponse({ resultType: 0, data: TOKENS }));
    const c = new BulutklinikClient({ environment: "test", fetch: fetchImpl });

    await expect(
      c.auth.connect({ apiUserName: "svc", apiUserPassword: "p" }),
    ).rejects.toThrow(/clientId and clientSecret are required/);
  });

  it("refreshes once on 401 then retries with the new token", async () => {
    let dataCalls = 0;
    const { fetchImpl, calls } = makeFetch((url) => {
      if (url.endsWith("/general/refreshApi")) {
        return jsonResponse({
          resultType: 0,
          data: { access_token: "AT2", refresh_token: "RT2" },
        });
      }
      dataCalls += 1;
      return dataCalls === 1
        ? jsonResponse({ resultType: 4 }, 401)
        : jsonResponse({ resultType: 0, data: { ok: true } });
    });
    const store = new MemoryTokenStore("AT", "RT");
    const c = new BulutklinikClient({
      environment: "test",
      clientId: "cid",
      clientSecret: "csecret",
      fetch: fetchImpl,
      tokenStore: store,
    });

    const res = await c.measures.last({ identityNumber: "12345678901" });

    expect(res).toEqual({ ok: true });
    expect(await store.getToken()).toBe("AT2");
    expect(await store.getRefreshToken()).toBe("RT2");
    expect(bodyOf(calls[1]!)).toEqual({
      refreshToken: "RT",
      clientId: "cid",
      clientSecretKey: "csecret",
    });
    expect(authHeader(calls.at(-1)!)).toBe("Bearer AT2");
  });

  it("retries at most once and clears the store when the refresh fails", async () => {
    let refreshCalls = 0;
    const { fetchImpl } = makeFetch((url) => {
      if (url.endsWith("/general/refreshApi")) {
        refreshCalls += 1;
        return jsonResponse({ resultType: 1 }, 401);
      }
      return jsonResponse({ resultType: 4 }, 401);
    });
    const store = new MemoryTokenStore("AT", "RT");
    const c = new BulutklinikClient({
      environment: "test",
      clientId: "cid",
      clientSecret: "csecret",
      fetch: fetchImpl,
      tokenStore: store,
    });

    await expect(c.measures.last({ identityNumber: "1" })).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(refreshCalls).toBe(1);
    expect(await store.getToken()).toBeNull();
  });

  it("does not attempt a refresh when no refresh token is held", async () => {
    let refreshCalls = 0;
    const { fetchImpl } = makeFetch((url) => {
      if (url.endsWith("/general/refreshApi")) refreshCalls += 1;
      return jsonResponse({ resultType: 4 }, 401);
    });
    const c = new BulutklinikClient({
      environment: "test",
      partnerToken: "AT",
      fetch: fetchImpl,
    });

    await expect(c.doctors.branches()).rejects.toThrow(/could not be refreshed/);
    expect(refreshCalls).toBe(0);
  });

  it("keeps the refresh token in memory when the store cannot persist it", async () => {
    // A store written against 1.0.x: access token only, no refresh methods.
    const legacy = {
      token: "AT" as string | null,
      getToken() {
        return this.token;
      },
      setToken(t: string | null) {
        this.token = t;
      },
      clear() {
        this.token = null;
      },
    };
    let dataCalls = 0;
    const { fetchImpl } = makeFetch((url) => {
      if (url.endsWith("/general/connectApi")) {
        return jsonResponse({ resultType: 0, data: TOKENS });
      }
      if (url.endsWith("/general/refreshApi")) {
        return jsonResponse({ resultType: 0, data: { access_token: "AT2" } });
      }
      dataCalls += 1;
      return dataCalls === 1
        ? jsonResponse({ resultType: 4 }, 401)
        : jsonResponse({ resultType: 0, data: { ok: true } });
    });
    const c = new BulutklinikClient({
      environment: "test",
      clientId: "cid",
      clientSecret: "csecret",
      fetch: fetchImpl,
      tokenStore: legacy,
    });

    await c.auth.connect({ apiUserName: "svc", apiUserPassword: "p" });
    const res = await c.measures.last({ identityNumber: "1" });

    expect(res).toEqual({ ok: true });
    expect(legacy.token).toBe("AT2");
  });

  it("disconnect revokes with an empty body and clears the store", async () => {
    const { fetchImpl, calls } = makeFetch(() => jsonResponse({ resultType: 0, data: null }));
    const store = new MemoryTokenStore("AT", "RT");
    const c = new BulutklinikClient({ environment: "test", fetch: fetchImpl, tokenStore: store });

    await c.auth.disconnect();

    expect(calls[0]!.url).toBe(`${BASE}/general/disconnectApi`);
    expect(authHeader(calls[0]!)).toBe("Bearer AT");
    // The device-cleanup fields are deliberately not sent: the server's `device`
    // mapping has no default branch.
    expect(bodyOf(calls[0]!)).toEqual({});
    expect(await store.getToken()).toBeNull();
    expect(await store.getRefreshToken()).toBeNull();
  });
});
