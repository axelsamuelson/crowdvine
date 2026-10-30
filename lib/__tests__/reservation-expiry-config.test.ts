import { afterEach, describe, expect, it } from "vitest";
import { getReservationExpiryConfig } from "@/lib/reservations/expiry-config";

const KEYS = [
  "RESERVATION_EXPIRY_ENABLED",
  "RESERVATION_EXPIRY_DRY_RUN",
  "RESERVATION_EXPIRY_SEND_EMAIL",
  "RESERVATION_EXTENSION_DAYS",
  "RESERVATION_EXTENSION_REPLY_DAYS",
  "RESERVATION_MAX_AGE_DAYS",
] as const;

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

describe("getReservationExpiryConfig", () => {
  it("defaults to disabled, dry-run, no send, unlimited cap", () => {
    for (const key of KEYS) setEnv(key, undefined);
    const cfg = getReservationExpiryConfig();
    expect(cfg.enabled).toBe(false);
    expect(cfg.dryRun).toBe(true);
    expect(cfg.sendEmail).toBe(false);
    expect(cfg.maxAgeDays).toBeNull();
    expect(cfg.extensionDays).toBe(30);
    expect(cfg.replyDays).toBe(7);
  });

  it("treats empty/null/unlimited max age as unlimited", () => {
    setEnv("RESERVATION_MAX_AGE_DAYS", "");
    expect(getReservationExpiryConfig().maxAgeDays).toBeNull();
    setEnv("RESERVATION_MAX_AGE_DAYS", "null");
    expect(getReservationExpiryConfig().maxAgeDays).toBeNull();
    setEnv("RESERVATION_MAX_AGE_DAYS", "unlimited");
    expect(getReservationExpiryConfig().maxAgeDays).toBeNull();
  });

  it("accepts a finite optional cap", () => {
    setEnv("RESERVATION_MAX_AGE_DAYS", "90");
    expect(getReservationExpiryConfig().maxAgeDays).toBe(90);
  });
});
