import { describe, expect, it } from "vitest";
import { isPalletCloseFlowEnabled } from "@/lib/checkout/pallet-close/flags";

describe("isPalletCloseFlowEnabled", () => {
  it("defaults OFF when no flags set", () => {
    expect(isPalletCloseFlowEnabled({})).toBe(false);
  });

  it("stays OFF when only dual-offer compare is on (defense in depth)", () => {
    expect(
      isPalletCloseFlowEnabled({ CHECKOUT_DUAL_OFFER_COMPARE: "true" }),
    ).toBe(false);
  });

  it("stays OFF when only PALLET_CLOSE_FLOW_ENABLED is on", () => {
    expect(
      isPalletCloseFlowEnabled({ PALLET_CLOSE_FLOW_ENABLED: "true" }),
    ).toBe(false);
  });

  it("enables only when BOTH flags are true", () => {
    expect(
      isPalletCloseFlowEnabled({
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
        PALLET_CLOSE_FLOW_ENABLED: "true",
      }),
    ).toBe(true);
  });

  it("treats false/0/off as disabled for either flag", () => {
    expect(
      isPalletCloseFlowEnabled({
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
        PALLET_CLOSE_FLOW_ENABLED: "false",
      }),
    ).toBe(false);
    expect(
      isPalletCloseFlowEnabled({
        CHECKOUT_DUAL_OFFER_COMPARE: "0",
        PALLET_CLOSE_FLOW_ENABLED: "true",
      }),
    ).toBe(false);
  });
});
