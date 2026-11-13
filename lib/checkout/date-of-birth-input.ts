/**
 * Checkout DOB text-field helpers (digits + auto-dashes → YYYY-MM-DD).
 * Never use <input type="date"> — browsers localize display (e.g. 01/15/1990 in sv).
 */

import { meetsAgeRequirement } from "@/lib/age-limits";
import { parseIsoDateOnly } from "@/lib/legal/age-check";

export type DobInputParseResult =
  | { ok: true; iso: string }
  | {
      ok: false;
      reason: "incomplete" | "invalid_format" | "under_age";
      iso: string;
    };

/** Digits-only → YYYY-MM-DD mask (max 8 digits). Preserves typed digits on error. */
export function maskIsoDateDigits(raw: string): string {
  const digits = String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/**
 * Validate a masked DOB string for checkout.
 * Incomplete values (still typing) → incomplete; calendar-invalid → invalid_format;
 * under the required age → under_age. Input string is always preserved in `iso`.
 */
export function parseCheckoutDateOfBirthInput(
  masked: string,
  requiredAge: number,
  asOf: Date = new Date(),
): DobInputParseResult {
  const iso = masked.trim();
  if (!iso) {
    return { ok: false, reason: "incomplete", iso };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { ok: false, reason: "incomplete", iso };
  }
  const born = parseIsoDateOnly(iso);
  if (!born) {
    return { ok: false, reason: "invalid_format", iso };
  }
  if (!meetsAgeRequirement(iso, requiredAge, asOf)) {
    return { ok: false, reason: "under_age", iso };
  }
  return { ok: true, iso };
}
