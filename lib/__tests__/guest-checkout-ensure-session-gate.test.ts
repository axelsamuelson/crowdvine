import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("ensure-session availability gate", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("isGuestCheckoutEnabled defaults OFF so ensure-session stays platformOpen-only", async () => {
    delete process.env.GUEST_CHECKOUT_ENABLED;
    const { isGuestCheckoutEnabled } = await import(
      "@/lib/checkout/guest-checkout-flag"
    );
    const { isPlatformOpen } = await import("@/lib/platform-open");
    expect(isGuestCheckoutEnabled()).toBe(false);
    // With both off, route returns 403 — covered by flag unit + this invariant.
    expect(isPlatformOpen() || isGuestCheckoutEnabled()).toBe(
      process.env.PLATFORM_OPEN === "true",
    );
  });

  it("GUEST_CHECKOUT_ENABLED=true unlocks ensure-session without PLATFORM_OPEN", async () => {
    process.env.GUEST_CHECKOUT_ENABLED = "true";
    process.env.PLATFORM_OPEN = "false";
    const { isGuestCheckoutEnabled } = await import(
      "@/lib/checkout/guest-checkout-flag"
    );
    const { isPlatformOpen } = await import("@/lib/platform-open");
    expect(isGuestCheckoutEnabled()).toBe(true);
    expect(isPlatformOpen()).toBe(false);
    expect(isPlatformOpen() || isGuestCheckoutEnabled()).toBe(true);
  });
});
