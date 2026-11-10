import { afterEach, describe, expect, it } from "vitest";
import { defaultResendFrom } from "@/lib/email";
import {
  getReservationExpiryConfig,
  reservationExpiryFrom,
  reservationExpiryReplyTo,
  RESERVATION_EXPIRY_FROM_HARDCODED,
  RESERVATION_EXPIRY_REPLY_TO_HARDCODED,
  statusUpdateEmailType,
} from "@/lib/reservations/expiry-config";

const KEYS = [
  "RESERVATION_EXPIRY_ENABLED",
  "RESERVATION_EXPIRY_DRY_RUN",
  "RESERVATION_EXPIRY_SEND_EMAIL",
  "RESERVATION_STATUS_EMAIL_DAYS",
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
  it("defaults to enabled, live, send on, 4-week status cadence, no max age", () => {
    for (const key of KEYS) setEnv(key, undefined);
    const cfg = getReservationExpiryConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.dryRun).toBe(false);
    expect(cfg.sendEmail).toBe(true);
    expect(cfg.maxAgeDays).toBeNull();
    expect(cfg.statusIntervalDays).toBe(28);
    expect(cfg.extensionDays).toBe(28);
  });

  it("ignores RESERVATION_MAX_AGE_DAYS so open orders are never hard-expired", () => {
    setEnv("RESERVATION_MAX_AGE_DAYS", "90");
    expect(getReservationExpiryConfig().maxAgeDays).toBeNull();
  });

  it("allows status interval override", () => {
    setEnv("RESERVATION_STATUS_EMAIL_DAYS", "14");
    expect(getReservationExpiryConfig().statusIntervalDays).toBe(14);
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

  it("builds period-scoped email types for idempotency", () => {
    expect(statusUpdateEmailType(28)).toBe("pallet_status_update_28");
    expect(statusUpdateEmailType(56)).toBe("pallet_status_update_56");
  });

  it("hard-codes From and Reply-To for status mail", () => {
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
    expect(defaultResendFrom()).toBe("PACT <noreply@pactwines.com>");
  });
});
