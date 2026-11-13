import { describe, expect, it } from "vitest";
import { isPublicAppPath } from "@/lib/auth/public-paths";

describe("guest checkout public paths", () => {
  it("keeps /checkout gated when both flags OFF", () => {
    expect(isPublicAppPath("/checkout")).toBe(false);
    expect(
      isPublicAppPath("/checkout", {
        platformOpen: false,
        guestCheckoutEnabled: false,
      }),
    ).toBe(false);
  });

  it("opens /checkout when guestCheckoutEnabled (flag ON)", () => {
    expect(
      isPublicAppPath("/checkout", { guestCheckoutEnabled: true }),
    ).toBe(true);
    expect(
      isPublicAppPath("/checkout/success", { guestCheckoutEnabled: true }),
    ).toBe(true);
  });

  it("still opens /checkout when platformOpen only (unchanged)", () => {
    expect(isPublicAppPath("/checkout", { platformOpen: true })).toBe(true);
  });
});
