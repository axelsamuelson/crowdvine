import { describe, expect, it } from "vitest";
import { resolvePalletCloseSwitchDirectEntry } from "@/lib/checkout/pallet-close/switch-direct";

describe("resolvePalletCloseSwitchDirectEntry", () => {
  it("returns not_requested when param absent", () => {
    expect(
      resolvePalletCloseSwitchDirectEntry({
        env: { DIRECT_BOX_CHECKOUT_ENABLED: "true" },
      }),
    ).toEqual({ ok: false, reason: "not_requested" });
  });

  it("is unreachable when DIRECT_BOX_CHECKOUT_ENABLED is false", () => {
    expect(
      resolvePalletCloseSwitchDirectEntry({
        palletCloseSwitch: "res-1",
        fulfillment: "direct_box",
        env: { DIRECT_BOX_CHECKOUT_ENABLED: "false" },
      }),
    ).toEqual({ ok: false, reason: "direct_box_disabled" });

    expect(
      resolvePalletCloseSwitchDirectEntry({
        palletCloseSwitch: "res-1",
        env: {},
      }),
    ).toEqual({ ok: false, reason: "direct_box_disabled" });
  });

  it("requires a new quote and explicit acceptance when allowed", () => {
    expect(
      resolvePalletCloseSwitchDirectEntry({
        palletCloseSwitch: "res-99",
        fulfillment: "direct_box",
        env: { DIRECT_BOX_CHECKOUT_ENABLED: "true" },
      }),
    ).toEqual({
      ok: true,
      reservationId: "res-99",
      requireNewQuote: true,
      requireExplicitAcceptance: true,
      preferredFulfillment: "direct_box",
    });
  });
});
