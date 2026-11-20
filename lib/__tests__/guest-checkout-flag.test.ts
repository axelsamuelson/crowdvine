import { describe, expect, it } from "vitest";
import { isGuestCheckoutEnabled } from "@/lib/checkout/guest-checkout-flag";

describe("isGuestCheckoutEnabled", () => {
  it("defaults OFF when unset", () => {
    expect(isGuestCheckoutEnabled({})).toBe(false);
  });

  it("defaults OFF for false/0/off/empty", () => {
    expect(isGuestCheckoutEnabled({ GUEST_CHECKOUT_ENABLED: "false" })).toBe(
      false,
    );
    expect(isGuestCheckoutEnabled({ GUEST_CHECKOUT_ENABLED: "0" })).toBe(false);
    expect(isGuestCheckoutEnabled({ GUEST_CHECKOUT_ENABLED: "off" })).toBe(
      false,
    );
    expect(isGuestCheckoutEnabled({ GUEST_CHECKOUT_ENABLED: "" })).toBe(false);
  });

  it("enables for true/1/on (case-insensitive)", () => {
    expect(isGuestCheckoutEnabled({ GUEST_CHECKOUT_ENABLED: "true" })).toBe(
      true,
    );
    expect(isGuestCheckoutEnabled({ GUEST_CHECKOUT_ENABLED: "TRUE" })).toBe(
      true,
    );
    expect(isGuestCheckoutEnabled({ GUEST_CHECKOUT_ENABLED: "1" })).toBe(true);
    expect(isGuestCheckoutEnabled({ GUEST_CHECKOUT_ENABLED: "on" })).toBe(true);
  });
});
