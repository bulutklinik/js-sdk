import type { HttpClient } from "../http";
import type {
  ChallengeResult,
  ConfirmRegistrationEmailInput,
  ConnectInput,
  ForgotPasswordInput,
  LoginData,
  LoginResult,
  RegisterInput,
  RegisterSocialInput,
  ResetPasswordInput,
  TwoFactorInput,
  VerifyRegistrationInput,
  VerifyRegistrationResult,
  VerifyRegistrationSocialInput,
} from "../models";

/** Login, 2FA, token refresh, registration and logout. */
export class AuthResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Log in. On success tokens are stored automatically and
   * `{ twoFactorRequired: false }` is returned. If 2FA is enabled the result is
   * `{ twoFactorRequired: true, twoFactorResponse }` — pass that blob to
   * {@link connectWithTwoFactor} together with the SMS code.
   */
  async connect(input: ConnectInput): Promise<LoginResult> {
    const data = await this.http.request<LoginData>({
      method: "POST",
      path: "/general/connectApi",
      auth: "public",
      body: {
        apiUserName: input.apiUserName,
        apiUserPassword: input.apiUserPassword,
        apiClientId: input.clientId ?? this.http.clientId,
        apiSecretKey: input.clientSecret ?? this.http.clientSecret,
        loginMode: input.loginMode,
        ...(input.withPhoneNumber !== undefined
          ? { withPhoneNumber: input.withPhoneNumber }
          : {}),
      },
    });

    if (data.access_token) {
      await this.storeTokens(data);
      return { twoFactorRequired: false, passwordPolicy: data.password_policy };
    }
    if (data.response) {
      return { twoFactorRequired: true, twoFactorResponse: data.response };
    }
    return { twoFactorRequired: false };
  }

  /** Complete a 2FA login with the SMS code and the challenge blob. */
  async connectWithTwoFactor(input: TwoFactorInput): Promise<void> {
    const data = await this.http.request<LoginData>({
      method: "POST",
      path: "/general/connectApiWithTwoFactor",
      auth: "public",
      body: { smsVerificationCode: input.smsVerificationCode, response: input.response },
    });
    await this.storeTokens(data);
  }

  /**
   * Step 1 of registration: send the SMS/e-mail verification code and get the
   * encrypted `response` blob back. Uses the configured **partner** token (the
   * endpoint is behind `auth:apiusers`, not public). A CAPTCHA token
   * (`recaptchaV2` or `captcha`), minted by a browser/human, is required.
   * Feed the returned `response` (and the code the user receives) into {@link register}.
   */
  verifyRegistration(input: VerifyRegistrationInput): Promise<VerifyRegistrationResult> {
    const body: Record<string, unknown> = {
      name: input.name,
      surname: input.surname,
      phoneNumber: input.phoneNumber,
      phone_code: input.phoneCode,
      email: input.email,
      password: input.password,
      passwordAgain: input.password,
      acceptUserAgreement: input.acceptUserAgreement ?? 1,
    };
    if (input.recaptchaV2 !== undefined) body["g-recaptcha-response-v2"] = input.recaptchaV2;
    if (input.captcha !== undefined) body.captcha = input.captcha;
    if (input.userAgreements !== undefined) body.userAgreements = input.userAgreements;
    return this.http.request<VerifyRegistrationResult>({
      method: "POST",
      path: "/patients/verifyAddingNewPatient",
      auth: "partner",
      body,
    });
  }

  /**
   * Step 2 of e-mail-branch registration. When `verifyRegistration` returns
   * `confirmationType: "email"`, the user gets the code by e-mail; confirm it here
   * with the same `response` blob. The server verifies the e-mail code, sends an
   * **SMS** code, and returns a fresh `response` blob — feed that + the SMS code
   * into `register`. Public; no token needed (the profile is carried in the blob).
   */
  confirmRegistrationEmail(input: ConfirmRegistrationEmailInput): Promise<VerifyRegistrationResult> {
    const body: Record<string, unknown> = {
      verificationCode: input.verificationCode,
      response: input.response,
    };
    if (input.userAgreements !== undefined) body.userAgreements = input.userAgreements;
    return this.http.request<VerifyRegistrationResult>({
      method: "POST",
      path: "/patients/emailConfirmationRegister",
      auth: "public",
      body,
    });
  }

  /** Register a new patient (afterRegister auto-login). Stores tokens on success. */
  async register(input: RegisterInput): Promise<void> {
    const data = await this.http.request<LoginData>({
      method: "POST",
      path: "/patients/addNewPatient",
      auth: "public",
      body: {
        name: input.name,
        surname: input.surname,
        apiUserName: input.apiUserName,
        phoneNumber: input.phoneNumber,
        password: input.password,
        smsVerificationCode: input.smsVerificationCode,
        response: input.response,
        acceptUserAgreement: input.acceptUserAgreement ?? 1,
        apiClientId: input.clientId ?? this.http.clientId,
        apiSecretKey: input.clientSecret ?? this.http.clientSecret,
      },
    });
    await this.storeTokens(data);
  }

  /**
   * Step 1 of social sign-up: register a patient who authenticates via a social
   * provider. Sends the SMS verification code and returns a `response` blob.
   * Public — no CAPTCHA and no partner token (unlike `verifyRegistration`).
   * Feed the returned `response` + the SMS code into `registerSocial`.
   */
  verifyRegistrationSocial(input: VerifyRegistrationSocialInput): Promise<ChallengeResult> {
    const body: Record<string, unknown> = {
      name: input.name,
      surname: input.surname,
      phoneNumber: input.phoneNumber,
      password: input.password,
      passwordAgain: input.password,
      socialType: input.socialType,
      key: input.key,
      acceptUserAgreement: input.acceptUserAgreement ?? 1,
    };
    if (input.email !== undefined) body.email = input.email;
    if (input.userAgreements !== undefined) body.userAgreements = input.userAgreements;
    return this.http.request<ChallengeResult>({
      method: "POST",
      path: "/patients/verifyAddingNewPatientSocial",
      auth: "public",
      body,
    });
  }

  /**
   * Step 2 of social sign-up: create the social patient. Unlike `register`, this
   * does **not** auto-login or store tokens — afterwards call
   * `connect({ loginMode: "social" })` to obtain tokens. Public.
   */
  async registerSocial(input: RegisterSocialInput): Promise<void> {
    const body: Record<string, unknown> = {
      smsVerificationCode: input.smsVerificationCode,
      response: input.response,
    };
    if (input.userAgreements !== undefined) body.userAgreements = input.userAgreements;
    await this.http.request({
      method: "POST",
      path: "/patients/addNewPatientWithSocial",
      auth: "public",
      body,
    });
  }

  /**
   * Step 1 of password reset: send the SMS confirm code to a registered phone and
   * return a `response` blob. Public but a CAPTCHA token (`recaptchaV2` or
   * `captcha`) is required outside the local environment. Feed the returned
   * `response` + the SMS code into `resetPassword`.
   */
  forgotPassword(input: ForgotPasswordInput): Promise<ChallengeResult> {
    const body: Record<string, unknown> = { phoneNumber: input.phoneNumber };
    if (input.birthdate !== undefined) body.birthdate = input.birthdate;
    if (input.recaptchaV2 !== undefined) body["g-recaptcha-response-v2"] = input.recaptchaV2;
    if (input.captcha !== undefined) body.captcha = input.captcha;
    return this.http.request<ChallengeResult>({
      method: "POST",
      path: "/patients/forgotPassword",
      auth: "public",
      body,
    });
  }

  /**
   * Step 2 of password reset: set the new password using the SMS confirm code and
   * the `response` blob from `forgotPassword`. Public.
   */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await this.http.request({
      method: "PUT",
      path: "/patients/forgotPassword",
      auth: "public",
      body: {
        smsConfirmCode: input.smsConfirmCode,
        response: input.response,
        password: input.password,
        passwordAgain: input.password,
      },
    });
  }

  /** Manually refresh the access token using the stored refresh token. */
  refresh(): Promise<void> {
    return this.http.refresh();
  }

  /** Revoke the current tokens server-side and clear the local token store. */
  async disconnect(): Promise<void> {
    try {
      await this.http.request<unknown>({
        method: "POST",
        path: "/general/disconnectApi",
        auth: "bearer",
        body: {},
      });
    } finally {
      await this.http.tokenStore.clear();
    }
  }

  private async storeTokens(data: LoginData): Promise<void> {
    if (!data.access_token) {
      throw new Error("Login response did not contain an access token");
    }
    await this.http.tokenStore.setTokens(data.access_token, data.refresh_token ?? null);
  }
}
