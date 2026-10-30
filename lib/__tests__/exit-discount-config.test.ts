import { afterEach, describe, expect, it, vi } from "vitest";

describe("exit-discount config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to disabled with 14-day validity and 12-month retention", async () => {
    vi.stubEnv("EXIT_DISCOUNT_ENABLED", undefined);
    vi.stubEnv("NEXT_PUBLIC_EXIT_DISCOUNT_ENABLED", undefined);
    vi.stubEnv("EXIT_DISCOUNT_VALIDITY_DAYS", undefined);
    vi.stubEnv("EXIT_DISCOUNT_RETENTION_MONTHS", undefined);
    const mod = await import("@/lib/exit-discount/config");
    expect(mod.isExitDiscountEnabled()).toBe(false);
    expect(mod.exitDiscountValidityDays()).toBe(14);
    expect(mod.exitDiscountRetentionMonths()).toBe(12);
  });

  it("enables when EXIT_DISCOUNT_ENABLED=true", async () => {
    vi.stubEnv("EXIT_DISCOUNT_ENABLED", "true");
    const mod = await import("@/lib/exit-discount/config");
    expect(mod.isExitDiscountEnabled()).toBe(true);
  });
});
