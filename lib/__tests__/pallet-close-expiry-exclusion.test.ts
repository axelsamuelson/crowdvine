import { describe, expect, it } from "vitest";
import { isReservationOwnedByPalletCloseFlow } from "@/lib/checkout/pallet-close/lifecycle-ownership";
import {
  decideReservationExpiryAction,
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
    payment_mode: "setup_intent",
    payment_status: "pending",
    extensions_confirmed_count: 0,
    extension_ask_sent_at: null,
    extension_reply_by: null,
    ...overrides,
  };
}

const openPallet = { id: "pallet-1", status: "open", is_complete: false };
const day30 = new Date("2026-01-31T00:00:00.000Z");

describe("no double-handling: close flow vs reservation-expiry", () => {
  it("marks SI shared-pallet rows as close-flow-owned when flag on", () => {
    expect(
      isReservationOwnedByPalletCloseFlow(reservation(), {
        palletCloseFlowEnabled: true,
      }),
    ).toBe(true);
  });

  it("does not own rows when close flow is off and no close state", () => {
    expect(
      isReservationOwnedByPalletCloseFlow(reservation(), {
        palletCloseFlowEnabled: false,
      }),
    ).toBe(false);
  });

  it("still owns rows that already entered pallet_close_state (even if flag off)", () => {
    expect(
      isReservationOwnedByPalletCloseFlow(
        reservation({ pallet_close_state: "choice_pending" }),
        { palletCloseFlowEnabled: false },
      ),
    ).toBe(true);
  });

  it("expiry cron skips close-flow-owned reservations at day-30 milestone", () => {
    const withCloseFlow = decideReservationExpiryAction(
      reservation(),
      openPallet,
      day30,
      baseConfig,
      { palletCloseFlowEnabled: true },
    );
    expect(withCloseFlow).toEqual({
      action: "skip",
      reason: "pallet_close_flow_owns",
    });

    // Same row without close flow would still get an extension ask.
    const withoutCloseFlow = decideReservationExpiryAction(
      reservation(),
      openPallet,
      day30,
      baseConfig,
      { palletCloseFlowEnabled: false },
    );
    expect(withoutCloseFlow.action).toBe("send_extension_ask");
  });

  it("expiry never double-handles a choice_pending reservation", () => {
    const decision = decideReservationExpiryAction(
      reservation({ pallet_close_state: "choice_pending" }),
      openPallet,
      day30,
      baseConfig,
      { palletCloseFlowEnabled: false },
    );
    expect(decision).toEqual({
      action: "skip",
      reason: "pallet_close_flow_owns",
    });
  });

  it("does not claim ownership of direct_box rows", () => {
    expect(
      isReservationOwnedByPalletCloseFlow(
        reservation({ fulfillment_channel: "direct_box" }),
        { palletCloseFlowEnabled: true },
      ),
    ).toBe(false);
  });
});
