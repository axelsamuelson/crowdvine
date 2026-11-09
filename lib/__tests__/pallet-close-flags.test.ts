import { afterEach, describe, expect, it } from "vitest";
import { isPalletCloseFlowEnabled } from "@/lib/checkout/pallet-close/flags";

const KEYS = ["PALLET_CLOSE_FLOW_ENABLED", "CHECKOUT_DUAL_OFFER_COMPARE"] as const;
const saved: Record<string, string | undefined> = {};

afterEach(() => {
  for (const key of KEYS) {
    if (key in saved) {
      const v = saved[key];
      if (v === undefined) delete process.env[key];
      else process.env[key] = v;
      delete saved[key];
    }
  }
});

function setEnv(key: (typeof KEYS)[number], value: string | undefined) {
  if (!(key in saved)) saved[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("isPalletCloseFlowEnabled", () => {
  it("defaults OFF when no flags set", () => {
    for (const key of KEYS) setEnv(key, undefined);
    expect(isPalletCloseFlowEnabled({})).toBe(false);
  });

  it("enables when CHECKOUT_DUAL_OFFER_COMPARE=true", () => {
    expect(
      isPalletCloseFlowEnabled({ CHECKOUT_DUAL_OFFER_COMPARE: "true" }),
    ).toBe(true);
  });

  it("force-enables with PALLET_CLOSE_FLOW_ENABLED", () => {
    expect(
      isPalletCloseFlowEnabled({
        CHECKOUT_DUAL_OFFER_COMPARE: "false",
        PALLET_CLOSE_FLOW_ENABLED: "true",
      }),
    ).toBe(true);
  });

  it("force-disables even if dual-offer compare is on", () => {
    expect(
      isPalletCloseFlowEnabled({
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
        PALLET_CLOSE_FLOW_ENABLED: "false",
      }),
    ).toBe(false);
  });
});
