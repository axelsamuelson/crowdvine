import { describe, expect, it } from "vitest";
import { isPalletBasedReservation } from "@/lib/commerce/is-pallet-based-reservation";
import {
  decideReservationExpiryAction,
  isPalletStillAwaitingFill,
  nextExtensionMilestoneDay,
  type ExpiryReservationRow,
} from "@/lib/reservations/expiry-eligibility";

const baseConfig = {
  maxAgeDays: null as number | null,
  extensionDays: 30,
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

describe("nextExtensionMilestoneDay", () => {
  it("continues forever when maxAgeDays is null", () => {
    expect(nextExtensionMilestoneDay(0, 30, null)).toBe(30);
    expect(nextExtensionMilestoneDay(1, 30, null)).toBe(60);
    expect(nextExtensionMilestoneDay(2, 30, null)).toBe(90);
    expect(nextExtensionMilestoneDay(9, 30, null)).toBe(300);
  });

  it("stops before an optional finite cap", () => {
    expect(nextExtensionMilestoneDay(0, 30, 90)).toBe(30);
    expect(nextExtensionMilestoneDay(1, 30, 90)).toBe(60);
    expect(nextExtensionMilestoneDay(2, 30, 90)).toBeNull();
  });
});

describe("decideReservationExpiryAction", () => {
  it("waits before the first 30-day milestone", () => {
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

  it("sends an extension ask at day 30 when unlimited", () => {
    const now = new Date("2026-01-31T00:00:00.000Z");
    const decision = decideReservationExpiryAction(
      reservation(),
      openPallet,
      now,
      baseConfig,
    );
    expect(decision.action).toBe("send_extension_ask");
    if (decision.action === "send_extension_ask") {
      expect(decision.milestoneDay).toBe(30);
      expect(decision.replyBy.toISOString()).toBe("2026-02-07T00:00:00.000Z");
    }
  });

  it("asks again at day 90 after two confirmations (no hard end by default)", () => {
    const now = new Date("2026-04-01T00:00:00.000Z");
    const decision = decideReservationExpiryAction(
      reservation({ extensions_confirmed_count: 2 }),
      openPallet,
      now,
      baseConfig,
    );
    expect(decision.action).toBe("send_extension_ask");
    if (decision.action === "send_extension_ask") {
      expect(decision.milestoneDay).toBe(90);
    }
  });

  it("cancels when the 7-day reply window lapses", () => {
    const now = new Date("2026-02-08T00:00:00.000Z");
    expect(
      decideReservationExpiryAction(
        reservation({
          extension_ask_sent_at: "2026-01-31T00:00:00.000Z",
          extension_ask_milestone_day: 30,
          extension_reply_by: "2026-02-07T00:00:00.000Z",
        }),
        openPallet,
        now,
        baseConfig,
      ),
    ).toEqual({
      action: "cancel_no_reply",
      reason: "extension_not_confirmed",
    });
  });

  it("waits while an ask is still open", () => {
    const now = new Date("2026-02-03T00:00:00.000Z");
    expect(
      decideReservationExpiryAction(
        reservation({
          extension_ask_sent_at: "2026-01-31T00:00:00.000Z",
          extension_reply_by: "2026-02-07T00:00:00.000Z",
        }),
        openPallet,
        now,
        baseConfig,
      ),
    ).toEqual({ action: "wait", reason: "awaiting_extension_reply" });
  });

  it("hard-expires only when an optional cap is configured", () => {
    const now = new Date("2026-04-01T00:00:00.000Z");
    expect(
      decideReservationExpiryAction(
        reservation({ extensions_confirmed_count: 2 }),
        openPallet,
        now,
        { ...baseConfig, maxAgeDays: 90 },
      ),
    ).toEqual({ action: "hard_expire", reason: "max_age" });

    expect(
      decideReservationExpiryAction(
        reservation({ extensions_confirmed_count: 2 }),
        openPallet,
        now,
        baseConfig,
      ).action,
    ).toBe("send_extension_ask");
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
