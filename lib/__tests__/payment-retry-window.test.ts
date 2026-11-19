import { describe, expect, it } from "vitest";
import {
  decidePaymentRetrySchedule,
  PAYMENT_RETRY_INTERVAL_MS,
  PAYMENT_RETRY_PAY_WINDOW_MS,
  paymentRetryMayWritePayWindow,
  palletCloseOwnsPayWindow,
  resolvePaymentRetryPayWindow,
} from "@/lib/payment-retry-window";
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

  it("does not use the old 24/72 retryHours framing", () => {
    expect(PAYMENT_RETRY_PAY_WINDOW_MS).toBe(3 * 24 * 60 * 60 * 1000);
    expect(PAYMENT_RETRY_INTERVAL_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe("pay-window isolation vs pallet-close pay_link_pending", () => {
  const now = new Date("2026-11-10T12:00:00.000Z");
  const closeFailedAt = "2026-11-10T10:00:00.000Z";
  const closePayBy = "2026-11-13T10:00:00.000Z";

  it("pallet-close owns pay_link_pending and charging", () => {
    expect(palletCloseOwnsPayWindow("pay_link_pending")).toBe(true);
    expect(palletCloseOwnsPayWindow("charging")).toBe(true);
    expect(paymentRetryMayWritePayWindow("pay_link_pending")).toBe(false);
    expect(paymentRetryMayWritePayWindow("open")).toBe(true);
    expect(paymentRetryMayWritePayWindow(null)).toBe(true);
  });

  it("does not open or overwrite when pay_link_pending already set the window", () => {
    const resolved = resolvePaymentRetryPayWindow({
      now,
      palletCloseState: "pay_link_pending",
      existingFailedAt: closeFailedAt,
      existingPayBy: closePayBy,
    });
    expect(resolved).toEqual({ kind: "skip_owned_by_pallet_close" });
  });

  it("reuses the same pay-by on subsequent legacy failures (windowOpened=false)", () => {
    const first = resolvePaymentRetryPayWindow({
      now,
      palletCloseState: "open",
      existingFailedAt: null,
      existingPayBy: null,
    });
    expect(first.kind).toBe("open");
    if (first.kind !== "open") return;

    const second = resolvePaymentRetryPayWindow({
      now: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      palletCloseState: "open",
      existingFailedAt: first.windowStartedAt.toISOString(),
      existingPayBy: first.payByAt.toISOString(),
    });
    expect(second.kind).toBe("reuse");
    if (second.kind !== "reuse") return;
    expect(second.windowOpened).toBe(false);
    expect(second.payByAt.toISOString()).toBe(first.payByAt.toISOString());
  });

  it("legacy open cannot claim a write when state is pay_link_pending even if columns look empty", () => {
    const resolved = resolvePaymentRetryPayWindow({
      now,
      palletCloseState: "pay_link_pending",
      existingFailedAt: null,
      existingPayBy: null,
    });
    expect(resolved.kind).toBe("skip_owned_by_pallet_close");
    expect(paymentRetryMayWritePayWindow("pay_link_pending")).toBe(false);
  });
});

describe("failed / cancelled payment email domain + copy", () => {
  it("SV failed-charge email uses 3-day copy and pactwines.com", () => {
    const body = {
      reservationId: "ord-1",
      customerName: "Anna",
      amountSek: 1290,
      payByLabel: "13 november 2026",
      paymentUrl: "https://checkout.stripe.com/c/pay/cs_test",
      locale: "sv" as const,
    };
    expect(paymentFailedSubject("sv")).toBe("Vi kunde inte dra betalningen");
    const text = buildPaymentFailedText(body);
    expect(text).toContain("3 dagar");
    expect(text).toContain("13 november 2026");
    expect(text).not.toContain("pact.wine");
    expect(text).not.toContain("72 hours");
    const html = buildPaymentFailedHtml(body);
    expect(html).toContain("Betala nu");
    expect(html).toContain("font-family:Geist");
    expect(html).toContain("Tartu mnt 67/1-13b");
    expect(html).toContain("customer@pactwines.com");
    expect(html).not.toContain("pact.wine");
    expect(html).toContain("color-scheme");
    expect(text).toContain("Tartu mnt 67/1-13b");
  });

  it("EN failed-charge email mirrors SV", () => {
    const text = buildPaymentFailedText({
      reservationId: "ord-1",
      customerName: "Alex",
      amountSek: 1250,
      payByLabel: "13 November 2026",
      paymentUrl: "https://checkout.stripe.com/c/pay/cs_test",
      locale: "en",
    });
    expect(paymentFailedSubject("en")).toBe("We couldn't take payment");
    expect(text).toContain("3 days");
    expect(text).toContain("SEK 1,250");
    expect(buildPaymentFailedHtml({
      reservationId: "ord-1",
      customerName: "Alex",
      amountSek: 1250,
      payByLabel: "13 November 2026",
      paymentUrl: "https://checkout.stripe.com/c/pay/cs_test",
      locale: "en",
    })).toContain("SEK 1,250");
    expect(text).not.toContain("pact.wine");
  });

  it("payment-cancelled heading/subject use Margaux copy", () => {
    const html = buildPaymentCancelledHtml({
      reservationId: "ord-1",
      reason: "x",
      locale: "sv",
      customerName: "Anna",
    });
    expect(html).toContain(
      "Din order är avbruten – betalningen gick inte igenom",
    );
    expect(html).not.toContain("inget har dragits</h1>");
  });

  it("cancelled payment email — one 3-day sentence, no points, open pallets copy", () => {
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
    expect(html).toContain("font-family:Geist");
    expect(html).toContain(
      "Your order has been cancelled – payment didn't go through",
    );
    expect(text).toContain("open pallets at pactwines.com");
    expect(text).not.toContain("PACT Points");
    // Reason string must not duplicate the 3-day sentence
    expect(text.match(/within 3 days/gi)?.length ?? 0).toBe(1);
    expect(html.match(/within 3 days/gi)?.length ?? 0).toBe(1);

    const sv = buildPaymentCancelledText({
      reservationId: "ord-1",
      reason: "Betalningen gick inte igenom inom 3 dagar.",
      locale: "sv",
    });
    expect(sv.match(/inom 3 dagar/gi)?.length ?? 0).toBe(1);
    expect(sv).toContain("de öppna pallarna på pactwines.com");
    expect(sv).not.toContain("PACT Points");
  });
});
