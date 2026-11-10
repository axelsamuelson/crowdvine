import { describe, expect, it } from "vitest";
import {
  decidePaymentRetrySchedule,
  PAYMENT_RETRY_INTERVAL_MS,
  PAYMENT_RETRY_PAY_WINDOW_MS,
} from "@/lib/payment-retry";
import {
  buildPaymentCancelledHtml,
  buildPaymentCancelledText,
  buildPaymentFailedHtml,
  buildPaymentFailedText,
  paymentFailedSubject,
} from "@/lib/sendgrid-service";

describe("3-day failed-charge pay window", () => {
  const started = new Date("2026-11-10T12:00:00.000Z");

  it("schedules retries inside the 3-day window", () => {
    const now = new Date(started.getTime() + 6 * 60 * 60 * 1000);
    const d = decidePaymentRetrySchedule({ now, windowStartedAt: started });
    expect(d.action).toBe("schedule");
    if (d.action === "schedule") {
      expect(d.payByAt.getTime()).toBe(
        started.getTime() + PAYMENT_RETRY_PAY_WINDOW_MS,
      );
      expect(d.at.getTime()).toBe(now.getTime() + PAYMENT_RETRY_INTERVAL_MS);
    }
  });

  it("cancels once the 3-day window has elapsed", () => {
    const now = new Date(started.getTime() + PAYMENT_RETRY_PAY_WINDOW_MS);
    const d = decidePaymentRetrySchedule({ now, windowStartedAt: started });
    expect(d.action).toBe("cancel");
  });

  it("still schedules near the end of the window when room remains", () => {
    const now = new Date(
      started.getTime() + PAYMENT_RETRY_PAY_WINDOW_MS - 2 * 60 * 60 * 1000,
    );
    const d = decidePaymentRetrySchedule({ now, windowStartedAt: started });
    expect(d.action).toBe("schedule");
    if (d.action === "schedule") {
      expect(d.at.getTime()).toBe(d.payByAt.getTime());
    }
  });

  it("does not use the old 24/72 retryHours framing", () => {
    expect(PAYMENT_RETRY_PAY_WINDOW_MS).toBe(3 * 24 * 60 * 60 * 1000);
    expect(PAYMENT_RETRY_INTERVAL_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe("failed / cancelled payment email domain + copy", () => {
  it("SV failed-charge email uses 3-day copy and pactwines.com", () => {
    const body = {
      reservationId: "ord-1",
      customerName: "Anna",
      amountSek: 1290,
      payByLabel: "13 november 2026",
      paymentUrl: "https://pactwines.com/profile#payment",
      locale: "sv" as const,
    };
    expect(paymentFailedSubject("sv")).toBe(
      "Vi kunde inte dra betalningen för din order",
    );
    const text = buildPaymentFailedText(body);
    expect(text).toContain("3 dagar");
    expect(text).toContain("13 november 2026");
    expect(text).toContain("pactwines.com");
    expect(text).not.toContain("pact.wine");
    expect(text).not.toContain("retry");
    expect(text).not.toContain("72 hours");
    expect(buildPaymentFailedHtml(body)).toContain("Betala nu");
  });

  it("EN failed-charge email mirrors SV", () => {
    const text = buildPaymentFailedText({
      reservationId: "ord-1",
      customerName: "Alex",
      amountSek: 1290,
      payByLabel: "13 November 2026",
      paymentUrl: "https://pactwines.com/profile#payment",
      locale: "en",
    });
    expect(paymentFailedSubject("en")).toMatch(/couldn't take payment/i);
    expect(text).toContain("3 days");
    expect(text).not.toContain("pact.wine");
  });

  it("cancelled payment email uses pactwines.com not pact.wine", () => {
    const html = buildPaymentCancelledHtml({
      reservationId: "ord-1",
      reason: "Payment was not completed within 3 days.",
      locale: "en",
      customerName: "Alex",
    });
    const text = buildPaymentCancelledText({
      reservationId: "ord-1",
      reason: "Payment was not completed within 3 days.",
      locale: "en",
    });
    expect(html).toContain("pactwines.com");
    expect(html).not.toContain("pact.wine");
    expect(text).toContain("pactwines.com");
    expect(text).not.toContain("pact.wine");
    expect(text).toContain("order");
  });
});
