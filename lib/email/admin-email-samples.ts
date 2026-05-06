import type {
  OrderConfirmationData,
  PaymentCancelledEmailBody,
  PaymentConfirmedEmailBody,
  PaymentFailedEmailBody,
} from "@/lib/sendgrid-service";
import type { DigestPayload } from "@/lib/operations-weekly-digest";
import type { PaymentReminderEmailParams } from "@/lib/email/pallet-complete";

/** Example data for admin preview / test sends (Swedish placeholders). */
export const SAMPLE_ORDER_CONFIRMATION: OrderConfirmationData = {
  customerEmail: "kund@exempel.se",
  customerName: "Anna Andersson",
  orderId: "ORD-2026-1842",
  orderDate: "6 maj 2026",
  items: [
    {
      name: "Chianti Classico 2020 — Tenuta Demo",
      quantity: 6,
      price: 1499.4,
    },
    {
      name: "Barolo 2019 — Cascina Exempel",
      quantity: 3,
      price: 2247.0,
    },
  ],
  subtotal: 3746.4,
  tax: 936.6,
  shipping: 99.0,
  total: 4782.0,
  shippingAddress: {
    name: "Anna Andersson",
    street: "Storgatan 12",
    city: "Stockholm",
    postalCode: "111 22",
    country: "Sverige",
  },
};

export const SAMPLE_PAYMENT_CONFIRMED: PaymentConfirmedEmailBody = {
  reservationId: "resv_8f3a2c1d",
  amountSek: 4782,
  palletName: "Pall Nord — vårleverans 2026",
};

export const SAMPLE_PAYMENT_FAILED: PaymentFailedEmailBody = {
  reservationId: "resv_8f3a2c1d",
  reason: "Kortet nekades av banken (insufficient funds).",
  retryHours: 72,
  profileUrl: "https://pactwines.com/profile",
};

export const SAMPLE_PAYMENT_CANCELLED: PaymentCancelledEmailBody = {
  reservationId: "resv_8f3a2c1d",
  reason:
    "Vi kunde inte genomföra betalningen efter flera försök. Reservationen har frigjorts.",
};

export const SAMPLE_PALLET_READY = {
  name: "Anna",
  palletName: "Pall Nord — vårleverans 2026",
  bottleCount: 12,
  totalAmount: "4782.00",
  deadline: "20 maj 2026",
};

export const SAMPLE_PAYMENT_REMINDER: PaymentReminderEmailParams = {
  to: "kund@exempel.se",
  name: "Anna",
  palletName: "Pall Nord — vårleverans 2026",
  bottleCount: 12,
  totalAmount: "4782.00",
  paymentLink: "https://pactwines.com/profile/reservations",
  hoursRemaining: 24,
  reservationId: "resv_8f3a2c1d",
};

export const SAMPLE_DIGEST_PAYLOAD: DigestPayload = {
  periodLabel: "29 apr – 6 maj 2026",
  sinceIso: new Date().toISOString(),
  activityLines: [
    "2026-05-05 14:32 — erik — Q2 lansering: Status changed → in_progress",
    "2026-05-04 09:10 — maria — Frakt zoner SE: Comment activity",
  ],
  commentLines: [
    "2026-05-03 11:00 — johan on Budget: Vi behöver uppdatera prognosen för juni…",
  ],
  newTaskLines: ["2026-05-02 16:20 — Följ upp Stripe-återbetalningar"],
  newProjectLines: ["2026-05-01 10:00 — Admin e-postverktyg"],
};

export const SAMPLE_ACCESS_SIGNUP_URL =
  "https://pactwines.com/signup?token=exempel-token-abc123";
