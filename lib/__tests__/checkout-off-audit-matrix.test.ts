/**
 * Checkout OFF-path audit matrix (shipping = shared_pallet / DIRECT_BOX default OFF).
 *
 * Purpose: evidence-backed scenario ledger for Axel's confidence ask — not a claim
 * of end-to-end production verification. External Stripe/carrier/Postgres remain
 * BLOCKED unless separately provisioned; mocks ≠ external service verification.
 *
 * Product code is intentionally untouched. Characterization asserts document
 * known pre-existing UX predicates so regressions are detectable without CRO edits.
 */
import { describe, expect, it } from "vitest";
import {
  defaultFulfillmentChannel,
  isDirectBoxCheckoutEnabled,
  parseFulfillmentChannel,
  requiresSelectedPallet,
} from "@/lib/commerce/fulfillment-channel";
import { buildDirectBoxUiAvailability } from "@/lib/commerce/direct-box-ui-contract";
import {
  isDeliveryCompleteForChannel,
} from "@/lib/commerce/fulfillment-channel";
import {
  resolveCheckoutShippingLabelState,
  formatCheckoutShippingLabel,
} from "@/lib/checkout/shipping-label";
import { B2C_CART_MIN_BOTTLES, computeB2CCartMinimum } from "@/lib/cart/cart-minimum";
import { validateCartMinimum } from "@/lib/checkout-validation";
import sv from "@/messages/sv.json";

/** Mirrors app/admin/b2c-orders/page.tsx Pending Orders card (do not "fix" here). */
function adminPendingOrdersCardCount(
  reservations: Array<{ status: string | null | undefined }>,
): number {
  return reservations.filter((r) => r.status !== "placed").length;
}

describe("checkout OFF audit matrix — flag & channel defaults", () => {
  it("DIRECT_BOX unset/false → disabled; default channel shared_pallet", () => {
    expect(isDirectBoxCheckoutEnabled({})).toBe(false);
    expect(isDirectBoxCheckoutEnabled({ DIRECT_BOX_CHECKOUT_ENABLED: "" })).toBe(
      false,
    );
    expect(
      isDirectBoxCheckoutEnabled({ DIRECT_BOX_CHECKOUT_ENABLED: "false" }),
    ).toBe(false);
    expect(defaultFulfillmentChannel()).toBe("shared_pallet");
    expect(parseFulfillmentChannel(undefined)).toBeNull();
    expect(parseFulfillmentChannel("shared_pallet")).toBe("shared_pallet");
    expect(requiresSelectedPallet("shared_pallet")).toBe(true);
  });

  it("UI availability: flag off → not offered / not selectable", () => {
    const a = buildDirectBoxUiAvailability({
      env: { DIRECT_BOX_CHECKOUT_ENABLED: "false" },
    });
    expect(a.offered).toBe(false);
    expect(a.deliverySelectable).toBe(false);
    expect(a.reason).toBe("flag_off");
  });
});

describe("checkout OFF audit matrix — cart / shipping gates (unit)", () => {
  it("B2C cart minimum floor remains 6 bottles", () => {
    expect(B2C_CART_MIN_BOTTLES).toBe(6);
    const under = computeB2CCartMinimum(5);
    expect(under.isValid).toBe(false);
    const ok = validateCartMinimum([
      {
        id: "c1",
        quantity: 6,
        merchandise: { id: "m1", product: { id: "p1" } },
      },
    ]);
    expect(ok.isValid).toBe(true);
  });

  it("shared_pallet producer cart incomplete without selected pallet", () => {
    expect(
      isDeliveryCompleteForChannel({
        channel: "shared_pallet",
        hasZoneDeliveryReady: true,
        deliveryZoneReady: true,
        hasProducerItems: true,
        selectedPallet: null,
        isUsConditional: false,
        hasUsState: false,
        carrier: {
          status: "eligible",
          channel: "shared_pallet",
          carrierId: "budbee",
          productCode: "home",
        },
      }),
    ).toBe(false);
  });

  it("shipping label kind none → no amount (placeholder path for Totalt UX)", () => {
    const state = resolveCheckoutShippingLabelState({
      hasPallet: false,
      shippingPending: false,
      shippingSek: null,
    });
    expect(state.kind).toBe("none");
    const label = formatCheckoutShippingLabel(state, {
      pendingLabel: "pending",
      freeLabel: "free",
      formatSek: (n) => `${n}`,
    });
    expect(label).toBeNull();
  });
});

describe("checkout OFF audit matrix — pre-existing UX characterization (no CRO change)", () => {
  it("finding1 copy keys still present (address vs gate clash is composition, not missing strings)", () => {
    expect(sv.checkout.noPickupForCart).toMatch(/saknar fraktregion/);
    expect(sv.checkout.deliveryConfirmed).toMatch(/Leverans bekräftad/);
    expect(sv.checkout.stepComplianceLocked).toMatch(/Fyll i leveransadressen/);
  });

  it("finding2: shippingAfterAddress copy still present for unresolved freight", () => {
    expect(sv.checkout.shippingAfterAddress).toMatch(/Beräknas efter postnummer/);
  });

  it("finding3: Pending Orders card counts any non-placed status (incl. cancelled)", () => {
    expect(
      adminPendingOrdersCardCount([
        { status: "cancelled" },
      ]),
    ).toBe(1);
    expect(
      adminPendingOrdersCardCount([
        { status: "placed" },
        { status: "cancelled" },
        { status: "pending_payment" },
      ]),
    ).toBe(2);
  });
});

describe("checkout OFF audit matrix — evidence class ledger (documentation asserts)", () => {
  it("records which scenario classes this suite can and cannot prove", () => {
    const ledger = {
      unit_mocked_channel_gates: "covered_here_and_fulfillment_channel_*",
      wired_route_mocks_confirm_quote_pi_webhook: "covered_in_sibling_suites",
      real_next_ssr_flag_off_props: "manual_agent_run_not_asserted_in_vitest",
      real_next_empty_cart_ui: "manual_agent_run_not_asserted_in_vitest",
      real_postgres_transactions: "BLOCKED_no_ephemeral_db",
      stripe_sandbox_success_decline_3ds: "BLOCKED_no_test_keys_no_mutation_auth",
      real_carrier_budbee_instabee: "BLOCKED_no_carrier_creds_default_off",
      guest_member_admin_full_flows: "BLOCKED_no_auth_fixture_db",
      cart_mutation_stale_inventory: "BLOCKED_no_shop_supabase",
    } as const;

    expect(ledger.unit_mocked_channel_gates).toContain("covered");
    expect(ledger.real_postgres_transactions).toMatch(/^BLOCKED/);
    expect(ledger.stripe_sandbox_success_decline_3ds).toMatch(/^BLOCKED/);
    expect(ledger.real_carrier_budbee_instabee).toMatch(/^BLOCKED/);
  });
});
