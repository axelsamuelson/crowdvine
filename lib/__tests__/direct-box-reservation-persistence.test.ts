import { describe, expect, it } from "vitest";
import {
  buildDirectBoxReservationInsertPatch,
  DIRECT_BOX_FULFILLMENT_PENDING_REASON,
  isDirectBoxFulfillmentAlreadyPending,
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

describe("direct_box insert patch + pending detection", () => {
  it("includes channel + DIRECT_BOX_FULFILLMENT_PENDING reason", () => {
    expect(buildDirectBoxReservationInsertPatch()).toEqual({
      pallet_id: null,
      shipping_region_id: null,
      fulfillment_channel: "direct_box",
      charge_blocked_reason: DIRECT_BOX_FULFILLMENT_PENDING_REASON,
    });
    expect(
      buildDirectBoxReservationInsertPatch({ includeChannelColumn: false }),
    ).toEqual({
      pallet_id: null,
      shipping_region_id: null,
      charge_blocked_reason: DIRECT_BOX_FULFILLMENT_PENDING_REASON,
    });
  });

  it("detects missing schema column for strip-retry", () => {
    expect(
      isMissingSchemaColumnError(
        { message: "Could not find the 'fulfillment_channel' column of 'order_reservations' in the schema cache" },
        "fulfillment_channel",
      ),
    ).toBe(true);
    expect(
      isMissingSchemaColumnError({ message: "unique violation" }, "fulfillment_channel"),
    ).toBe(false);
  });

  it("idempotent pending detection", () => {
    expect(
      isDirectBoxFulfillmentAlreadyPending({
        charge_blocked_reason: DIRECT_BOX_FULFILLMENT_PENDING_REASON,
      }),
    ).toBe(true);
    expect(
      isDirectBoxFulfillmentAlreadyPending({ charge_blocked_reason: null }),
    ).toBe(false);
  });
});
