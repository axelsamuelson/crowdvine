import { afterEach, describe, expect, it, vi } from "vitest";

describe("exit-discount config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to disabled with 14-day validity, 12-month retention, scope all", async () => {
    vi.stubEnv("EXIT_DISCOUNT_ENABLED", undefined);
    vi.stubEnv("NEXT_PUBLIC_EXIT_DISCOUNT_ENABLED", undefined);
    vi.stubEnv("EXIT_DISCOUNT_VALIDITY_DAYS", undefined);
    vi.stubEnv("EXIT_DISCOUNT_RETENTION_MONTHS", undefined);
    vi.stubEnv("EXIT_DISCOUNT_SCOPE", undefined);
    vi.stubEnv("EXIT_DISCOUNT_EMAIL_MODE", undefined);
    const mod = await import("@/lib/exit-discount/config");
    expect(mod.isExitDiscountEnabled()).toBe(false);
    expect(mod.exitDiscountValidityDays()).toBe(14);
    expect(mod.exitDiscountRetentionMonths()).toBe(12);
    expect(mod.exitDiscountScope()).toBe("all");
    expect(mod.exitDiscountEmailMode()).toBe("live");
  });

  it("enables when EXIT_DISCOUNT_ENABLED=true", async () => {
    vi.stubEnv("EXIT_DISCOUNT_ENABLED", "true");
    const mod = await import("@/lib/exit-discount/config");
    expect(mod.isExitDiscountEnabled()).toBe(true);
  });

  it("parses pallet_only scope and email log mode", async () => {
    vi.stubEnv("EXIT_DISCOUNT_SCOPE", "pallet_only");
    vi.stubEnv("EXIT_DISCOUNT_EMAIL_MODE", "log");
    const mod = await import("@/lib/exit-discount/config");
    expect(mod.exitDiscountScope()).toBe("pallet_only");
    expect(mod.exitDiscountEmailMode()).toBe("log");
  });
});
