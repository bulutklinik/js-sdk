import type { HttpClient } from "../http";
import type {
  CardInfo,
  DiscountCheckInput,
  DiscountResult,
  PaymentInput,
  PaymentResult,
  SavedCard,
} from "../models";

/** Discount check, saved cards and the 3DS payment entrypoint. */
export class PaymentsResource {
  constructor(private readonly http: HttpClient) {}

  /** Validate a discount code. Note: this endpoint lives under the `patients` prefix. */
  checkDiscountCode(input: DiscountCheckInput): Promise<DiscountResult> {
    return this.http.request<DiscountResult>({
      method: "POST",
      path: "/patients/checkDiscountCode",
      auth: "bearer",
      body: { ...input },
    });
  }

  getCards(): Promise<{ cards: SavedCard[] }> {
    return this.http.request<{ cards: SavedCard[] }>({
      method: "GET",
      path: "/payments/getCards",
      auth: "bearer",
    });
  }

  saveCard(card: CardInfo): Promise<unknown> {
    return this.http.request<unknown>({
      method: "POST",
      path: "/payments/saveCard",
      auth: "bearer",
      body: { ...card },
    });
  }

  /**
   * Start an appointment payment. The amount is computed server-side. On a 3DS
   * flow the result carries `payment3DUrl` — a browser URL to open; the SDK does
   * not follow it. 3DS capture happens via the bank → server callback.
   */
  pay(input: PaymentInput): Promise<PaymentResult> {
    return this.http.request<PaymentResult>({
      method: "POST",
      path: "/payments/interviewPayment",
      auth: "bearer",
      body: {
        doctorId: input.doctorId,
        appointmentDate: input.appointmentDate,
        appointmentType: input.appointmentType ?? "interview",
        is3D: input.is3D,
        termsAccept: input.termsAccept,
        saveCard: input.saveCard ?? 0,
        discountCode: input.discountCode ?? "",
        ...(input.cardId !== undefined ? { cardId: input.cardId } : {}),
        ...(input.cardInfo ? { cardInfo: input.cardInfo } : {}),
        ...(input.caseDetail ? { caseDetail: input.caseDetail } : {}),
      },
    });
  }

  deleteCard(cardId: number | string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "DELETE",
      path: `/payments/deleteCard/${cardId}`,
      auth: "bearer",
    });
  }
}
