import { afterEach, describe, expect, it } from "vitest";
import { defaultResendFrom } from "@/lib/email";
import {
  getReservationExpiryConfig,
  reservationExpiryFrom,
  reservationExpiryReplyTo,
  RESERVATION_EXPIRY_FROM_HARDCODED,
  RESERVATION_EXPIRY_REPLY_TO_HARDCODED,
} from "@/lib/reservations/expiry-config";

const KEYS = [
  "RESERVATION_EXPIRY_ENABLED",
  "RESERVATION_EXPIRY_DRY_RUN",
  "RESERVATION_EXPIRY_SEND_EMAIL",
  "RESERVATION_EXTENSION_DAYS",
  "RESERVATION_EXTENSION_REPLY_DAYS",
  "RESERVATION_MAX_AGE_DAYS",
  "RESERVATION_EXPIRY_FROM",
  "RESERVATION_EXPIRY_REPLY_TO",
  "RESEND_FROM",
  "RESEND_REPLY_TO",
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
  it("defaults to enabled, live (not dry-run), send on, unlimited cap", () => {
    for (const key of KEYS) setEnv(key, undefined);
    const cfg = getReservationExpiryConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.dryRun).toBe(false);
    expect(cfg.sendEmail).toBe(true);
    expect(cfg.maxAgeDays).toBeNull();
    expect(cfg.extensionDays).toBe(30);
    expect(cfg.replyDays).toBe(7);
  });

  it("allows env overrides to disable or dry-run", () => {
    setEnv("RESERVATION_EXPIRY_ENABLED", "false");
    setEnv("RESERVATION_EXPIRY_DRY_RUN", "true");
    setEnv("RESERVATION_EXPIRY_SEND_EMAIL", "false");
    const cfg = getReservationExpiryConfig();
    expect(cfg.enabled).toBe(false);
    expect(cfg.dryRun).toBe(true);
    expect(cfg.sendEmail).toBe(false);
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

  it("hard-codes From and Reply-To for expiry mail (ignores RESEND_FROM / noreply)", () => {
    expect(RESERVATION_EXPIRY_FROM_HARDCODED).toBe(
      "PACT <customer@pactwines.com>",
    );
    expect(RESERVATION_EXPIRY_REPLY_TO_HARDCODED).toBe(
      "customer@pactwines.com",
    );

    setEnv("RESEND_FROM", "PACT <noreply@pactwines.com>");
    setEnv("RESEND_REPLY_TO", "orders@pactwines.com");
    setEnv("RESERVATION_EXPIRY_FROM", "PACT <other@pactwines.com>");
    setEnv("RESERVATION_EXPIRY_REPLY_TO", "other@pactwines.com");

    expect(reservationExpiryFrom()).toBe("PACT <customer@pactwines.com>");
    expect(reservationExpiryReplyTo()).toBe("customer@pactwines.com");
    // Other transactional mail still uses the global From env.
    expect(defaultResendFrom()).toBe("PACT <noreply@pactwines.com>");
  });
});
