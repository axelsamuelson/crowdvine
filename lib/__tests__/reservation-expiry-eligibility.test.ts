import { describe, expect, it } from "vitest";
import { isPalletBasedReservation } from "@/lib/commerce/is-pallet-based-reservation";
import {
  decideReservationExpiryAction,
  dueStatusPeriodDay,
  isPalletStillAwaitingFill,
  nextExtensionMilestoneDay,
  nextStatusPeriodDay,
  type ExpiryReservationRow,
} from "@/lib/reservations/expiry-eligibility";

const baseConfig = {
  maxAgeDays: null as number | null,
  extensionDays: 28,
  statusIntervalDays: 28,
  replyDays: 7,
};

function reservation(
  overrides: Partial<ExpiryReservationRow> = {},
): ExpiryReservationRow {
  return {
    id: "res-1",
    status: "placed",
    archived_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    pallet_id: "pallet-1",
    payment_status: "pending",
    extensions_confirmed_count: 0,
    extension_ask_sent_at: null,
    extension_reply_by: null,
    ...overrides,
  };
}

const openPallet = { id: "pallet-1", status: "open", is_complete: false };

describe("isPalletBasedReservation", () => {
  it("requires a pallet_id", () => {
    expect(isPalletBasedReservation({ pallet_id: "abc" })).toBe(true);
    expect(isPalletBasedReservation({ pallet_id: null })).toBe(false);
    expect(isPalletBasedReservation({ pallet_id: "  " })).toBe(false);
  });

  it("excludes direct_box channel even with pallet_id (future-proof)", () => {
    expect(
      isPalletBasedReservation({
        pallet_id: "abc",
        fulfillment_channel: "direct_box",
      }),
    ).toBe(false);
  });
});

describe("isPalletStillAwaitingFill", () => {
  it("treats open/consolidating as awaiting", () => {
    expect(
      isPalletStillAwaitingFill({ status: "open", is_complete: false }),
    ).toBe(true);
    expect(
      isPalletStillAwaitingFill({
        status: "consolidating",
        is_complete: false,
      }),
    ).toBe(true);
  });

  it("excludes complete and shipping-locked pallets", () => {
    expect(
      isPalletStillAwaitingFill({ status: "complete", is_complete: true }),
    ).toBe(false);
    expect(
      isPalletStillAwaitingFill({ status: "shipped", is_complete: true }),
    ).toBe(false);
    expect(
      isPalletStillAwaitingFill({
        status: "open",
        is_complete: true,
      }),
    ).toBe(false);
  });
});

describe("status period helpers", () => {
  it("nextStatusPeriodDay advances by interval", () => {
    expect(nextStatusPeriodDay(null, 28)).toBe(28);
    expect(nextStatusPeriodDay(28, 28)).toBe(56);
    expect(nextStatusPeriodDay(56, 28)).toBe(84);
  });

  it("dueStatusPeriodDay is idempotent per 4-week bucket", () => {
    const created = new Date("2026-01-01T00:00:00.000Z");
    expect(
      dueStatusPeriodDay(created, new Date("2026-01-20T00:00:00.000Z"), 28),
    ).toBeNull();
    expect(
      dueStatusPeriodDay(created, new Date("2026-01-29T00:00:00.000Z"), 28),
    ).toBe(28);
    expect(
      dueStatusPeriodDay(created, new Date("2026-02-10T00:00:00.000Z"), 28),
    ).toBe(28);
    expect(
      dueStatusPeriodDay(created, new Date("2026-02-26T00:00:00.000Z"), 28),
    ).toBe(56);
  });

  it("keeps nextExtensionMilestoneDay helper for legacy callers", () => {
    expect(nextExtensionMilestoneDay(0, 28, null)).toBe(28);
    expect(nextExtensionMilestoneDay(1, 28, null)).toBe(56);
  });
});

describe("decideReservationExpiryAction — no auto-cancellation", () => {
  it("waits before the first 4-week status email", () => {
    const now = new Date("2026-01-20T00:00:00.000Z");
    expect(
      decideReservationExpiryAction(
        reservation(),
        openPallet,
        now,
        baseConfig,
      ),
    ).toEqual({ action: "wait", reason: "before_next_milestone" });
  });

  it("sends a status email at day 28", () => {
    const now = new Date("2026-01-29T00:00:00.000Z");
    const decision = decideReservationExpiryAction(
      reservation(),
      openPallet,
      now,
      baseConfig,
    );
    expect(decision).toEqual({
      action: "send_status_email",
      periodDay: 28,
    });
  });

  it("is idempotent for the same period once recorded", () => {
    const now = new Date("2026-02-10T00:00:00.000Z");
    expect(
      decideReservationExpiryAction(
        reservation({
          extension_ask_sent_at: "2026-01-29T00:00:00.000Z",
          extension_ask_milestone_day: 28,
        }),
        openPallet,
        now,
        baseConfig,
      ),
    ).toEqual({
      action: "wait",
      reason: "status_already_sent_for_period",
    });
  });

  it("sends again for the next 4-week period", () => {
    const now = new Date("2026-02-26T00:00:00.000Z");
    expect(
      decideReservationExpiryAction(
        reservation({
          extension_ask_sent_at: "2026-01-29T00:00:00.000Z",
          extension_ask_milestone_day: 28,
        }),
        openPallet,
        now,
        baseConfig,
      ),
    ).toEqual({
      action: "send_status_email",
      periodDay: 56,
    });
  });

  it("never auto-cancels when a legacy extension reply window has lapsed", () => {
    const now = new Date("2026-02-08T00:00:00.000Z");
    const decision = decideReservationExpiryAction(
      reservation({
        extension_ask_sent_at: "2026-01-31T00:00:00.000Z",
        extension_ask_milestone_day: 30,
        extension_reply_by: "2026-02-07T00:00:00.000Z",
      }),
      openPallet,
      now,
      baseConfig,
    );
    expect(decision.action).not.toBe("cancel_no_reply");
    expect(decision.action).not.toBe("hard_expire");
    // Day 38 → due period 28; last sent milestone 30 ≥ 28 → wait
    expect(decision).toEqual({
      action: "wait",
      reason: "status_already_sent_for_period",
    });
  });

  it("never hard-expires even if a max-age env value would have applied", () => {
    const now = new Date("2026-04-01T00:00:00.000Z");
    const decision = decideReservationExpiryAction(
      reservation({ extensions_confirmed_count: 2 }),
      openPallet,
      now,
      { ...baseConfig, maxAgeDays: 90 },
    );
    expect(decision.action).not.toBe("hard_expire");
    expect(decision.action).not.toBe("cancel_no_reply");
  });

  it("never cancels an open order that is merely waiting on volume", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const decision = decideReservationExpiryAction(
      reservation({
        created_at: "2025-01-01T00:00:00.000Z",
        extension_ask_milestone_day: 364,
        extension_reply_by: "2025-06-01T00:00:00.000Z",
      }),
      openPallet,
      now,
      baseConfig,
    );
    expect(["wait", "send_status_email", "skip", "flag_charged"]).toContain(
      decision.action,
    );
    expect(decision.action).not.toBe("cancel_no_reply");
    expect(decision.action).not.toBe("hard_expire");
  });

  it("skips direct boxes / missing pallet / ready pallets / archived / charged", () => {
    const now = new Date("2026-03-01T00:00:00.000Z");

    expect(
      decideReservationExpiryAction(
        reservation({ fulfillment_channel: "direct_box" }),
        openPallet,
        now,
        baseConfig,
      ),
    ).toEqual({ action: "skip", reason: "not_pallet_based" });

    expect(
      decideReservationExpiryAction(
        reservation({ pallet_id: null }),
        openPallet,
        now,
        baseConfig,
      ),
    ).toEqual({ action: "skip", reason: "not_pallet_based" });

    expect(
      decideReservationExpiryAction(
        reservation(),
        { status: "complete", is_complete: true },
        now,
        baseConfig,
      ),
    ).toEqual({ action: "skip", reason: "pallet_ready_or_locked" });

    expect(
      decideReservationExpiryAction(
        reservation({ status: "archived", archived_at: "2026-02-01T00:00:00Z" }),
        openPallet,
        now,
        baseConfig,
      ),
    ).toEqual({ action: "skip", reason: "archived" });

    expect(
      decideReservationExpiryAction(
        reservation({ payment_status: "paid" }),
        openPallet,
        now,
        baseConfig,
      ),
    ).toEqual({ action: "flag_charged", reason: "already_charged" });
  });
});
