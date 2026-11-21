import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("migration 299 source contacts / email log / submitted", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "migrations/299_source_contacts_email_log_submitted.sql",
    ),
    "utf8",
  );

  it("creates wholesaler_sources with packing-key check and admin RLS", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.wholesaler_sources/);
    expect(sql).toMatch(/source_key TEXT PRIMARY KEY/);
    expect(sql).toMatch(/wholesaler:%/);
    expect(sql).toMatch(/contact_locale TEXT NOT NULL DEFAULT 'fr'/);
    expect(sql).toMatch(/is_platform_admin\(\)/);
    expect(sql).toMatch(/GRANT ALL ON public\.wholesaler_sources TO service_role/);
  });

  it("adds producers.contact_locale default fr", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS contact_locale TEXT/);
    expect(sql).toMatch(/ALTER COLUMN contact_locale SET DEFAULT 'fr'/);
  });

  it("creates source_email_sends with unique \(event, reservation_id, source_key\)", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.source_email_sends/);
    expect(sql).toMatch(
      /UNIQUE \(event, reservation_id, source_key\)/,
    );
    expect(sql).toMatch(/resend_id TEXT/);
    expect(sql).toMatch(/status TEXT NOT NULL DEFAULT 'claimed'/);
  });

  it("adds submitted_at / submitted_by on order_reservation_shipments", () => {
    expect(sql).toMatch(
      /order_reservation_shipments[\s\S]*ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ/,
    );
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS submitted_by UUID/,
    );
  });
});
