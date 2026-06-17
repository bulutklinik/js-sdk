import { describe, expect, it } from "vitest";
import { BulutklinikClient, MemoryTokenStore } from "../src/index";
import { bodyOf, jsonResponse, makeFetch } from "./helpers";

describe("auth", () => {
  it("connect stores tokens and fills client id/secret from config", async () => {
    const store = new MemoryTokenStore();
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({
        resultType: 0,
        data: { access_token: "t", refresh_token: "r", password_policy: {} },
      }),
    );
    const client = new BulutklinikClient({
      environment: "test",
      clientId: "c",
      clientSecret: "s",
      fetch: fetchImpl,
      tokenStore: store,
    });

    const result = await client.auth.connect({
      apiUserName: "u",
      apiUserPassword: "p",
      loginMode: "email",
    });

    expect(result).toEqual({ twoFactorRequired: false, passwordPolicy: {} });
    expect(await store.getAccessToken()).toBe("t");
    expect(await store.getRefreshToken()).toBe("r");
    expect(bodyOf(calls[0]!)).toMatchObject({
      apiClientId: "c",
      apiSecretKey: "s",
      loginMode: "email",
      apiUserName: "u",
    });
  });

  it("connect surfaces a 2FA challenge instead of throwing", async () => {
    const { fetchImpl } = makeFetch(() => jsonResponse({ resultType: 0, data: { response: "BLOB" } }));
    const client = new BulutklinikClient({
      environment: "test",
      clientId: "c",
      clientSecret: "s",
      fetch: fetchImpl,
    });

    const result = await client.auth.connect({
      apiUserName: "u",
      apiUserPassword: "p",
      loginMode: "email",
    });

    expect(result).toEqual({ twoFactorRequired: true, twoFactorResponse: "BLOB" });
  });

  it("disconnect clears the store even when the request fails", async () => {
    const store = new MemoryTokenStore({ accessToken: "a", refreshToken: "r" });
    const { fetchImpl } = makeFetch(() => jsonResponse({ resultType: 1, errorMessage: "fail" }, 500));
    const client = new BulutklinikClient({ environment: "test", fetch: fetchImpl, tokenStore: store });

    await expect(client.auth.disconnect()).rejects.toBeTruthy();
    expect(await store.getAccessToken()).toBeNull();
  });
});
