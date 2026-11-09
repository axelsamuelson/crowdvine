import { describe, expect, it } from "vitest";
import {
  applyPalletCloseTransition,
  buildPalletCloseChargeIdempotencyKey,
} from "@/lib/checkout/pallet-close/state-machine";
import type { PalletCloseReservationSnapshot } from "@/lib/checkout/pallet-close/types";

function row(
  overrides: Partial<PalletCloseReservationSnapshot> = {},
): PalletCloseReservationSnapshot {
  return {
    id: "res-1",
    pallet_id: "pal-1",
    payment_status: "pending",
    payment_method_id: "pm_1",
    setup_intent_id: "seti_1",
    payment_intent_id: null,
    status: "placed",
    cancelled_at: null,
    charge_deadline_at: "2026-12-01T00:00:00.000Z",
    pallet_close_state: "open",
    pallet_close_choice: null,
    pallet_close_choice_sent_at: null,
    pallet_close_choice_reply_by: null,
    pallet_close_extension_count: 0,
    offsession_charge_failed_at: null,
    offsession_pay_by: null,
    payment_method_detached_at: null,
    pallet_close_charge_idempotency_key: null,
    ...overrides,
  };
}

describe("applyPalletCloseTransition", () => {
  it("moves open → charging when deadline reached and full", () => {
    const r = applyPalletCloseTransition(row(), {
      type: "deadline_reached_full",
      nowIso: "2026-12-01T00:00:00.000Z",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.pallet_close_state).toBe("charging");
    expect(r.sideEffects).toContain("charge_offsession");
  });

  it("moves open → choice_pending when deadline reached and not full", () => {
    const r = applyPalletCloseTransition(row(), {
      type: "deadline_reached_not_full",
      nowIso: "2026-12-01T00:00:00.000Z",
      replyByIso: "2026-12-08T00:00:00.000Z",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.pallet_close_state).toBe("choice_pending");
    expect(r.next.pallet_close_choice_reply_by).toBe(
      "2026-12-08T00:00:00.000Z",
    );
    expect(r.sideEffects).toContain("send_choice_email");
  });

  it("rejects a second choice email once already sent", () => {
    const r = applyPalletCloseTransition(
      row({
        pallet_close_state: "open",
        pallet_close_choice_sent_at: "2026-12-01T00:00:00.000Z",
      }),
      {
        type: "deadline_reached_not_full",
        nowIso: "2026-12-02T00:00:00.000Z",
        replyByIso: "2026-12-09T00:00:00.000Z",
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("choice_already_sent");
  });

  it("extends once from choice_pending (wait)", () => {
    const r = applyPalletCloseTransition(
      row({ pallet_close_state: "choice_pending" }),
      {
        type: "choice_wait",
        nowIso: "2026-12-02T00:00:00.000Z",
        newDeadlineIso: "2026-12-30T00:00:00.000Z",
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.pallet_close_state).toBe("extended");
    expect(r.next.pallet_close_extension_count).toBe(1);
    expect(r.next.charge_deadline_at).toBe("2026-12-30T00:00:00.000Z");
  });

  it("blocks a second extension", () => {
    const r = applyPalletCloseTransition(
      row({
        pallet_close_state: "choice_pending",
        pallet_close_extension_count: 1,
      }),
      {
        type: "choice_wait",
        nowIso: "2026-12-02T00:00:00.000Z",
        newDeadlineIso: "2027-01-27T00:00:00.000Z",
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("extension_limit");
  });

  it("cancels from choice_pending with detach + email side effects", () => {
    const r = applyPalletCloseTransition(
      row({ pallet_close_state: "choice_pending" }),
      { type: "choice_cancel", nowIso: "2026-12-02T00:00:00.000Z" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.pallet_close_state).toBe("closed_cancelled");
    expect(r.sideEffects).toEqual(
      expect.arrayContaining(["detach_payment_method", "send_cancelled_email"]),
    );
  });

  it("choice_timeout cancels at no cost", () => {
    const r = applyPalletCloseTransition(
      row({ pallet_close_state: "choice_pending" }),
      { type: "choice_timeout", nowIso: "2026-12-09T00:00:00.000Z" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.pallet_close_state).toBe("closed_cancelled");
    expect(r.next.cancelled_at).toBe("2026-12-09T00:00:00.000Z");
  });

  it("charge_succeeded marks closed_charged and paid", () => {
    const r = applyPalletCloseTransition(
      row({ pallet_close_state: "charging" }),
      {
        type: "charge_succeeded",
        nowIso: "2026-12-01T01:00:00.000Z",
        idempotencyKey: "pallet_close_charge:res-1:2026-12-01T00:00:00.000Z",
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.pallet_close_state).toBe("closed_charged");
    expect(r.next.payment_status).toBe("paid");
    expect(r.sideEffects).toContain("send_charged_email");
  });

  it("rejects double charge once already closed_charged", () => {
    const r = applyPalletCloseTransition(
      row({
        pallet_close_state: "closed_charged",
        payment_status: "paid",
      }),
      {
        type: "charge_succeeded",
        nowIso: "2026-12-01T02:00:00.000Z",
        idempotencyKey: "pallet_close_charge:res-1:2026-12-01T00:00:00.000Z",
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("terminal_state");
  });

  it("charge_failed opens 3-day pay link window", () => {
    const r = applyPalletCloseTransition(
      row({ pallet_close_state: "charging" }),
      {
        type: "charge_failed",
        nowIso: "2026-12-01T01:00:00.000Z",
        payByIso: "2026-12-04T01:00:00.000Z",
        paymentLinkUrl: "https://checkout.stripe.com/c/pay/cs_test",
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.pallet_close_state).toBe("pay_link_pending");
    expect(r.next.offsession_pay_by).toBe("2026-12-04T01:00:00.000Z");
    expect(r.sideEffects).toEqual(
      expect.arrayContaining([
        "create_payment_link",
        "send_payment_failed_email",
      ]),
    );
  });

  it("pay_link_timeout cancels and detaches", () => {
    const r = applyPalletCloseTransition(
      row({ pallet_close_state: "pay_link_pending" }),
      { type: "pay_link_timeout", nowIso: "2026-12-05T00:00:00.000Z" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.pallet_close_state).toBe("closed_cancelled");
    expect(r.sideEffects).toContain("detach_payment_method");
  });

  it("pay_link_paid recovers to closed_charged", () => {
    const r = applyPalletCloseTransition(
      row({
        pallet_close_state: "pay_link_pending",
        payment_status: "failed",
      }),
      { type: "pay_link_paid", nowIso: "2026-12-03T00:00:00.000Z" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.next.pallet_close_state).toBe("closed_charged");
    expect(r.next.payment_status).toBe("paid");
  });

  it("refuses transitions from cancelled", () => {
    const r = applyPalletCloseTransition(
      row({
        pallet_close_state: "closed_cancelled",
        cancelled_at: "2026-12-01T00:00:00.000Z",
      }),
      {
        type: "deadline_reached_full",
        nowIso: "2026-12-02T00:00:00.000Z",
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("terminal_state");
  });
});

describe("buildPalletCloseChargeIdempotencyKey", () => {
  it("is stable per reservation + deadline (double-charge prevention)", () => {
    const a = buildPalletCloseChargeIdempotencyKey({
      reservationId: "res-1",
      chargeDeadlineAt: "2026-12-01T00:00:00.000Z",
    });
    const b = buildPalletCloseChargeIdempotencyKey({
      reservationId: "res-1",
      chargeDeadlineAt: "2026-12-01T00:00:00.000Z",
    });
    const c = buildPalletCloseChargeIdempotencyKey({
      reservationId: "res-1",
      chargeDeadlineAt: "2026-12-29T00:00:00.000Z",
    });
    expect(a).toBe(b);
    expect(a).toBe("pallet_close_charge:res-1:2026-12-01T00:00:00.000Z");
    expect(c).not.toBe(a);
  });
});
