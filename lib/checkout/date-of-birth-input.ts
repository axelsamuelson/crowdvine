/**
 * Checkout DOB text-field helpers (digits + auto-dashes → YYYY-MM-DD).
 * Never use <input type="date"> — browsers localize display (e.g. 01/15/1990 in sv).
 *
 * Auto-hyphen strategy: digit-count caret mapping + Backspace-over-hyphen
 * handling. Unit-tested; paste of "19900115" and "1990-01-15" normalize equal.
 */

import { meetsAgeRequirement } from "@/lib/age-limits";
import { parseIsoDateOnly } from "@/lib/legal/age-check";

export type DobInputParseResult =
  | { ok: true; iso: string }
  | {
      ok: false;
      reason: "incomplete" | "invalid_format" | "nonexistent_date" | "under_age";
      iso: string;
    };

/** Digits-only → YYYY-MM-DD mask (max 8 digits). Paste with or without dashes OK. */
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

/** Count digit characters in `value` before index `caret`. */
export function digitCountBefore(value: string, caret: number): number {
  const end = Math.max(0, Math.min(caret, value.length));
  let n = 0;
  for (let i = 0; i < end; i += 1) {
    if (/\d/.test(value[i]!)) n += 1;
  }
  return n;
}

/** Caret index in `formatted` after the first `digitIndex` digits. */
export function caretAfterDigitCount(
  formatted: string,
  digitIndex: number,
): number {
  if (digitIndex <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i]!)) {
      seen += 1;
      if (seen >= digitIndex) return i + 1;
    }
  }
  return formatted.length;
}

/**
 * Format raw input and place caret after the same digit count the user was on.
 * Used for typing, paste, and delete (except Backspace-on-hyphen special case).
 */
export function formatDobInputChange(
  raw: string,
  selectionStart: number | null | undefined,
): { value: string; caret: number } {
  const prevCaret =
    typeof selectionStart === "number" && Number.isFinite(selectionStart)
      ? selectionStart
      : raw.length;
  const digitsBefore = digitCountBefore(raw, prevCaret);
  const value = maskIsoDateDigits(raw);
  const caret = caretAfterDigitCount(value, digitsBefore);
  return { value, caret };
}

/**
 * If caret sits right after a hyphen, Backspace should delete the digit before
 * that hyphen (not get stuck on the hyphen). Returns null when no special case.
 */
export function applyBackspaceOverHyphen(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; caret: number } | null {
  if (selectionStart !== selectionEnd) return null;
  if (selectionStart <= 0) return null;
  const hyphenIndex = selectionStart - 1;
  if (value[hyphenIndex] !== "-") return null;
  const digitIndex = hyphenIndex - 1;
  if (digitIndex < 0 || !/\d/.test(value[digitIndex]!)) return null;
  // Remove the digit before the hyphen; remask strips leftover dashes.
  const withoutDigit =
    value.slice(0, digitIndex) + value.slice(digitIndex + 1);
  const digitsBefore = digitCountBefore(value, digitIndex);
  const next = maskIsoDateDigits(withoutDigit);
  const caret = caretAfterDigitCount(next, digitsBefore);
  return { value: next, caret };
}

/**
 * Validate a masked DOB string for checkout.
 * Incomplete (still typing) → incomplete; YYYY-MM-DD but not a real day →
 * nonexistent_date; under the required age → under_age.
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
    return { ok: false, reason: "nonexistent_date", iso };
  }
  if (!meetsAgeRequirement(iso, requiredAge, asOf)) {
    return { ok: false, reason: "under_age", iso };
  }
  return { ok: true, iso };
}
