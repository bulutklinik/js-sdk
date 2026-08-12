import type { HttpClient } from "../http";
import type { ConnectInput, LoginData, LoginResult } from "../models";

/**
 * Token lifecycle.
 *
 * The Developer Platform issues a **client id**, a **client secret**, a
 * project-specific **service identity** and an **application password** per approved
 * application. The password belongs to that application only — it is not the
 * developer's portal account password. `connect` exchanges those for an
 * access token + refresh token, which every other method on the client then uses.
 *
 * Nothing here is a partner-authenticated call: `connect` and `refresh` are the
 * two public endpoints that *produce* the credential.
 */
export class AuthResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Log in and store the resulting tokens.
   *
   * `clientId` / `clientSecret` fall back to the values the client was
   * constructed with, so you usually only pass the service identity and password.
   *
   * If the account has SMS 2FA enabled the API returns a challenge instead of a
   * token pair; the result carries `twoFactorRequired` rather than throwing.
   * Partner service identities do not normally have 2FA on.
   */
  async connect(input: ConnectInput): Promise<LoginResult> {
    const clientId = input.clientId ?? this.http.clientId;
    const clientSecret = input.clientSecret ?? this.http.clientSecret;
    if (!clientId || !clientSecret) {
      throw new Error(
        "clientId and clientSecret are required — pass them to connect() or to the client constructor.",
      );
    }

    const data = await this.http.request<LoginData>({
      method: "POST",
      path: "/general/connectApi",
      auth: "public",
      body: {
        apiClientId: clientId,
        apiSecretKey: clientSecret,
        apiUserName: input.apiUserName,
        apiUserPassword: input.apiUserPassword,
        loginMode: input.loginMode ?? "email",
      },
    });

    if (data?.access_token) {
      await this.http.setTokens(data.access_token, data.refresh_token ?? null);
      return { twoFactorRequired: false, passwordPolicy: data.password_policy };
    }
    return { twoFactorRequired: true, twoFactorResponse: data?.response };
  }

  /**
   * Exchange the stored refresh token for a new pair. Both tokens rotate.
   *
   * The transport already does this automatically on a `401` / `resultType 4`,
   * so calling it by hand is only useful to refresh ahead of time.
   */
  async refresh(): Promise<void> {
    await this.http.refresh();
  }

  /**
   * Revoke the access token and all of its refresh tokens, then clear the store.
   *
   * Sent with an empty body on purpose: the endpoint also accepts a device-token
   * cleanup whose `device` mapping has no default branch server-side, and there
   * is no partner use for it.
   */
  async disconnect(): Promise<void> {
    await this.http.request({
      method: "POST",
      path: "/general/disconnectApi",
      auth: "partner",
      body: {},
    });
    await this.http.clearTokens();
  }
}
