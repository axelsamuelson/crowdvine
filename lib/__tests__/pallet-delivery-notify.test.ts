import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LATE_DELIVERY_CANCEL_AFTER_DAYS,
  LATE_DELIVERY_REFUND_WITHIN_DAYS,
  PALLET_DELIVERY_EMAIL_TYPES,
  addUtcDays,
  isLateDeliveryCancelEligible,
  refundPromisedByIso,
} from "@/lib/checkout/pallet-delivery-notify/eligibility";
import {
  buildPalletDeliveryDayEmail,
  buildPalletDeliveryDelayEmail,
  buildPalletShippedEmail,
} from "@/lib/checkout/pallet-delivery-notify/emails";

describe("late delivery cancel eligibility", () => {
  const closed = new Date("2026-01-01T12:00:00.000Z");

  it("requires closed_at and 30 days elapsed without delivery day", () => {
    expect(
      isLateDeliveryCancelEligible({
        closedAt: closed,
        deliveryDay: null,
        now: addUtcDays(closed, LATE_DELIVERY_CANCEL_AFTER_DAYS - 1),
      }),
    ).toBe(false);

    expect(
      isLateDeliveryCancelEligible({
        closedAt: closed,
        deliveryDay: null,
        now: addUtcDays(closed, LATE_DELIVERY_CANCEL_AFTER_DAYS),
      }),
    ).toBe(true);
  });

  it("hides option when delivery day set or already cancelled", () => {
    expect(
      isLateDeliveryCancelEligible({
        closedAt: closed,
        deliveryDay: "2026-02-10",
        now: addUtcDays(closed, 60),
      }),
    ).toBe(false);
    expect(
      isLateDeliveryCancelEligible({
        closedAt: closed,
        deliveryDay: null,
        cancelledAt: "2026-02-01",
        now: addUtcDays(closed, 60),
      }),
    ).toBe(false);
  });

  it("promises refund within 14 days", () => {
    const cancelAt = new Date("2026-03-01T00:00:00.000Z");
    const promised = new Date(refundPromisedByIso(cancelAt));
    expect(
      promised.getTime() - cancelAt.getTime(),
    ).toBe(LATE_DELIVERY_REFUND_WITHIN_DAYS * 24 * 60 * 60 * 1000);
  });
});

describe("delivery notify email builders (SV+EN, no Budbee)", () => {
  it("builds shipped window email", () => {
    const sv = buildPalletShippedEmail({
      locale: "sv",
      customerName: "Ada",
      reservationId: "r1",
      windowStart: "2026-05-12",
      windowEnd: "2026-05-18",
      palletName: "Stockholm A",
    });
    expect(sv.subject).toBe("Pallen har skickats");
    expect(sv.text).toMatch(/12–18 maj/i);
    expect(sv.text).toContain(
      "Vi mejlar leveransdagen när vinet har nått Sverige",
    );
    expect(sv.html + sv.text).not.toMatch(/Budbee/i);
    expect(sv.html + sv.text).not.toContain("Stockholm A");
    expect(sv.html).toContain("Se din order");
    expect(sv.html).not.toContain("localhost");

    const en = buildPalletShippedEmail({
      locale: "en",
      customerName: "Ada",
      reservationId: "r1",
      windowStart: "2026-05-12",
      windowEnd: "2026-05-18",
    });
    expect(en.subject).toBe("The pallet has shipped");
    expect(en.text).toMatch(/12–18 May/i);
    expect(en.text).toMatch(/Estimated delivery window/);
    expect(en.text).toContain(
      "We'll email the delivery date once the wine has reached Sweden",
    );
  });

  it("builds leveransdag email", () => {
    const sv = buildPalletDeliveryDayEmail({
      locale: "sv",
      customerName: "Ada",
      reservationId: "r1",
      deliveryDayLabel: "2026-04-10",
    });
    expect(sv.subject).toBe("Leveransdag");
    expect(sv.text).toContain("2026-04-10");

    const en = buildPalletDeliveryDayEmail({
      locale: "en",
      customerName: "Ada",
      reservationId: "r1",
      deliveryDayLabel: "2026-04-10",
    });
    expect(en.subject).toBe("Delivery day");
  });

  it("builds delay email with optional cancel link", () => {
    const withCancel = buildPalletDeliveryDelayEmail({
      locale: "sv",
      customerName: "Ada",
      reservationId: "r1",
      expectedDateLabel: "2026-05-01",
      cancelForRefundUrl: "https://example.com/cancel",
    });
    expect(withCancel.subject).toBe("Ny beräknad leveransdag");
    expect(withCancel.text).toMatch(/full återbetalning/);
    expect(withCancel.text).toContain("https://example.com/cancel");
    expect(withCancel.text).toMatch(/14 dagar/);
  });
});

describe("pallet delivery notify triggers + idempotency", () => {
  const claimMock = vi.fn();
  const sendEmailMock = vi.fn();
  const updateMock = vi.fn();
  const selectChain: Record<string, unknown> = {};

  beforeEach(() => {
    vi.resetModules();
    claimMock.mockReset();
    sendEmailMock.mockReset();
    updateMock.mockReset();

    vi.doMock("@/lib/email/claim-email-send", () => ({
      claimEmailSend: claimMock,
      sendTransactionalEmailOnce: async (opts: {
        emailType: string;
        reservationId: string;
        send: () => Promise<boolean>;
      }) => {
        const claim = await claimMock({
          emailType: opts.emailType,
          reservationId: opts.reservationId,
        });
        if (claim.status === "already_sent") return "skipped";
        if (claim.status === "error") return "failed";
        await opts.send();
        return "sent";
      },
    }));
    vi.doMock("@/lib/email", () => ({
      sendEmail: sendEmailMock.mockResolvedValue(undefined),
    }));

    const reservationRows = [
      { id: "res-a", status: "confirmed", cancelled_at: null, payment_status: "paid" },
      { id: "res-b", status: "confirmed", cancelled_at: null, payment_status: "paid" },
    ];

    const from = vi.fn((table: string) => {
      if (table === "order_reservations") {
        return {
          select: () => ({
            eq: () => ({
              is: async () => ({ data: reservationRows, error: null }),
              maybeSingle: async () => ({
                data: {
                  user_id: "u1",
                  cancelled_at: null,
                  late_delivery_cancel_at: null,
                  pallet: { name: "Pall X" },
                },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      if (table === "pallets") {
        return {
          update: (payload: unknown) => {
            updateMock(payload);
            return {
              eq: async () => ({ error: null }),
              maybeSingle: async () => ({ data: null, error: null }),
            };
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "pal-1",
                  closed_at: "2026-01-01T00:00:00.000Z",
                  delivery_day: null,
                  delivery_expected_date: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  email: "ada@example.com",
                  full_name: "Ada",
                  preferred_locale: "sv",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return selectChain;
    });

    vi.doMock("@/lib/supabase-admin", () => ({
      getSupabaseAdmin: () => ({ from }),
    }));

    process.env.RESEND_API_KEY = "test-key";
    process.env.PALLET_CLOSE_SEND_EMAIL = "true";
  });

  it("mark shipped fans out once per reservation; second claim skips", async () => {
    const claimed = new Set<string>();
    claimMock.mockImplementation(
      async (opts: { emailType: string; reservationId: string }) => {
        const key = `${opts.emailType}:${opts.reservationId}`;
        if (claimed.has(key)) return { status: "already_sent" };
        claimed.add(key);
        return { status: "claimed" };
      },
    );

    const { markPalletShippedAndNotify } = await import(
      "@/lib/checkout/pallet-delivery-notify/notify"
    );

    const first = await markPalletShippedAndNotify({
      palletId: "pal-1",
      windowStart: "2026-04-01",
      windowEnd: "2026-04-07",
      env: {
        PALLET_CLOSE_FLOW_ENABLED: "true",
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
      },
    });
    expect(first.ok).toBe(true);
    expect(first.sent).toBe(2);
    expect(first.skipped).toBe(0);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);

    const second = await markPalletShippedAndNotify({
      palletId: "pal-1",
      windowStart: "2026-04-01",
      windowEnd: "2026-04-07",
      env: {
        PALLET_CLOSE_FLOW_ENABLED: "true",
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
      },
    });
    expect(second.sent).toBe(0);
    expect(second.skipped).toBe(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(claimed.has(`${PALLET_DELIVERY_EMAIL_TYPES.shipped}:res-a`)).toBe(
      true,
    );
  });

  it("arrived Sweden and delay use distinct once-per-reservation keys", async () => {
    const claimed = new Set<string>();
    claimMock.mockImplementation(
      async (opts: { emailType: string; reservationId: string }) => {
        const key = `${opts.emailType}:${opts.reservationId}`;
        if (claimed.has(key)) return { status: "already_sent" };
        claimed.add(key);
        return { status: "claimed" };
      },
    );

    const {
      markPalletArrivedSwedenAndNotify,
      setPalletExpectedDateAndNotify,
    } = await import("@/lib/checkout/pallet-delivery-notify/notify");

    const arrived = await markPalletArrivedSwedenAndNotify({
      palletId: "pal-1",
      deliveryDay: "2026-04-15",
      env: {
        PALLET_CLOSE_FLOW_ENABLED: "true",
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
      },
    });
    expect(arrived.sent).toBe(2);

    const delay = await setPalletExpectedDateAndNotify({
      palletId: "pal-1",
      expectedDate: "2026-04-20",
      env: {
        PALLET_CLOSE_FLOW_ENABLED: "true",
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
      },
    });
    expect(delay.sent).toBe(2);

    const delayAgain = await setPalletExpectedDateAndNotify({
      palletId: "pal-1",
      expectedDate: "2026-04-20",
      env: {
        PALLET_CLOSE_FLOW_ENABLED: "true",
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
      },
    });
    expect(delayAgain.skipped).toBe(2);
    expect(delayAgain.sent).toBe(0);

    expect(
      claimed.has(`${PALLET_DELIVERY_EMAIL_TYPES.deliveryDay}:res-a`),
    ).toBe(true);
    expect(
      claimed.has(
        `${PALLET_DELIVERY_EMAIL_TYPES.delayForDate("2026-04-20")}:res-a`,
      ),
    ).toBe(true);
  });

  it("does not send when close-flow flag is off (fields still persist)", async () => {
    claimMock.mockResolvedValue({ status: "claimed" });
    const { markPalletShippedAndNotify } = await import(
      "@/lib/checkout/pallet-delivery-notify/notify"
    );
    const result = await markPalletShippedAndNotify({
      palletId: "pal-1",
      windowStart: "2026-04-01",
      windowEnd: "2026-04-07",
      env: { PALLET_CLOSE_FLOW_ENABLED: "false" },
    });
    expect(result.ok).toBe(true);
    expect(result.emailsEnabled).toBe(false);
    expect(result.sent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
  });
});
