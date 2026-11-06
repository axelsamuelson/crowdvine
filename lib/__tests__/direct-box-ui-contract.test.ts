import { describe, expect, it } from "vitest";
import { buildDirectBoxUiAvailability } from "@/lib/commerce/direct-box-ui-contract";

describe("buildDirectBoxUiAvailability (MED5)", () => {
  it("flag off → not offered", () => {
    expect(
      buildDirectBoxUiAvailability({
        env: { DIRECT_BOX_CHECKOUT_ENABLED: "false" },
      }),
    ).toEqual({
      offered: false,
      deliverySelectable: false,
      reason: "flag_off",
      messageKey: null,
    });
  });

  it("flag on without carrier → offered but not selectable (no secret leakage)", () => {
    const r = buildDirectBoxUiAvailability({
      env: { DIRECT_BOX_CHECKOUT_ENABLED: "true" },
      countryCode: "SE",
    });
    expect(r.offered).toBe(true);
    expect(r.deliverySelectable).toBe(false);
    expect(r.reason).toBe("carrier_unconfigured");
    expect(JSON.stringify(r)).not.toMatch(/DIRECT_BOX_CARRIER/);
  });

  it("flag on with quoting carrier → selectable", () => {
    const r = buildDirectBoxUiAvailability({
      env: {
        DIRECT_BOX_CHECKOUT_ENABLED: "true",
        DIRECT_BOX_CARRIER_ID: "test_only",
        DIRECT_BOX_CARRIER_PRODUCT: "TEST",
        DIRECT_BOX_CARRIER_QUOTING_ENABLED: "true",
        DIRECT_BOX_CARRIER_COUNTRIES: "SE",
      },
      countryCode: "SE",
    });
    expect(r).toMatchObject({
      offered: true,
      deliverySelectable: true,
      reason: "eligible",
    });
  });
});
