import { describe, expect, it } from "vitest";
import {
  buildDirectBoxReservationInsertPatch,
  DIRECT_BOX_FULFILLMENT_DISPATCH_PENDING,
  DIRECT_BOX_FULFILLMENT_PENDING_REASON,
  isBillingChargeHoldReason,
  isDirectBoxFulfillmentAlreadyPending,
  isDirectBoxFulfillmentProgressed,
  isDirectBoxSchemaUnreadyError,
  isMissingSchemaColumnError,
  resolveCheckoutGroupPalletAssignment,
} from "@/lib/commerce/direct-box-reservation-persistence";

describe("resolveCheckoutGroupPalletAssignment (HIGH1)", () => {
  it("direct_box forces null pallet even with selectedPalletId / shared findOrCreate", () => {
    const r = resolveCheckoutGroupPalletAssignment({
      channel: "direct_box",
      bodySelectedPalletId: "pal-client",
      topLevelPalletId: "pal-top",
      sharedGroupPalletId: "pal-region",
      sharedGroupShippingRegionId: "sr-1",
    });
    expect(r).toEqual({
      pallet_id: null,
      shipping_region_id: null,
      countsTowardPalletFill: false,
      fulfillment_channel: "direct_box",
    });
  });

  it("shared_pallet still honors selected / shared pallet", () => {
    const r = resolveCheckoutGroupPalletAssignment({
      channel: "shared_pallet",
      bodySelectedPalletId: "pal-client",
      topLevelPalletId: null,
      sharedGroupPalletId: "pal-region",
      sharedGroupShippingRegionId: "sr-1",
    });
    expect(r.pallet_id).toBe("pal-client");
    expect(r.countsTowardPalletFill).toBe(true);
  });
});

describe("direct_box insert patch + dispatch status (no charge hold)", () => {
  it("writes fulfillment_dispatch_status, not charge_blocked_reason", () => {
    expect(buildDirectBoxReservationInsertPatch()).toEqual({
      pallet_id: null,
      shipping_region_id: null,
      fulfillment_channel: "direct_box",
      fulfillment_dispatch_status: DIRECT_BOX_FULFILLMENT_DISPATCH_PENDING,
    });
    expect(buildDirectBoxReservationInsertPatch()).not.toHaveProperty(
      "charge_blocked_reason",
    );
  });

  it("detects schema-unready for fail-closed", () => {
    expect(
      isDirectBoxSchemaUnreadyError({
        message:
          "Could not find the 'fulfillment_dispatch_status' column of 'order_reservations' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isMissingSchemaColumnError(
        {
          message:
            "Could not find the 'fulfillment_channel' column of 'order_reservations' in the schema cache",
        },
        "fulfillment_channel",
      ),
    ).toBe(true);
  });

  it("idempotent pending + progressed detection", () => {
    expect(
      isDirectBoxFulfillmentAlreadyPending({
        fulfillment_dispatch_status: DIRECT_BOX_FULFILLMENT_DISPATCH_PENDING,
      }),
    ).toBe(true);
    expect(
      isDirectBoxFulfillmentAlreadyPending({
        charge_blocked_reason: DIRECT_BOX_FULFILLMENT_PENDING_REASON,
      }),
    ).toBe(true);
    expect(isDirectBoxFulfillmentProgressed("booked")).toBe(true);
    expect(isDirectBoxFulfillmentProgressed("pending_manual_handoff")).toBe(
      false,
    );
    expect(isBillingChargeHoldReason(DIRECT_BOX_FULFILLMENT_PENDING_REASON)).toBe(
      false,
    );
    expect(isBillingChargeHoldReason("US_CONDITIONAL")).toBe(true);
  });
});
