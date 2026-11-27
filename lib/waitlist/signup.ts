import { calculateAge, parseIsoDateOnly } from "@/lib/legal/age-check";
import { countryPolicy, normalizeCountryCode } from "@/lib/market/country-registry";

export type WaitlistLine = { wine_id: string; quantity: number };

export type WaitlistDecision =
  | { ok: true; countryCode: string; ageMinimum: number }
  | { ok: false; reason: "invalid_email" | "invalid_birthdate" | "under_age" | "live_country" };

export function normalizeWaitlistEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function evaluateWaitlistSignup(input: {
  email: string;
  countryCode: string;
  dateOfBirth: string;
  now?: Date;
}): WaitlistDecision {
  if (!normalizeWaitlistEmail(input.email)) {
    return { ok: false, reason: "invalid_email" };
  }
  const countryCode = normalizeCountryCode(input.countryCode);
  if (!countryCode) return { ok: false, reason: "under_age" };
  const policy = countryPolicy(countryCode);
  if (policy.status === "live") return { ok: false, reason: "live_country" };
  const dob = parseIsoDateOnly(input.dateOfBirth);
  if (!dob) return { ok: false, reason: "invalid_birthdate" };
  const age = calculateAge(dob, input.now ?? new Date());
  if (age < policy.ageMinimum) return { ok: false, reason: "under_age" };
  return { ok: true, countryCode, ageMinimum: policy.ageMinimum };
}

export function normalizeWaitlistLines(value: unknown): WaitlistLine[] {
  if (!Array.isArray(value)) return [];
  const lines: WaitlistLine[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const wineId = String((row as { wine_id?: unknown }).wine_id ?? "").trim();
    const quantity = Number((row as { quantity?: unknown }).quantity);
    if (!wineId || !Number.isFinite(quantity) || quantity <= 0) continue;
    lines.push({ wine_id: wineId, quantity: Math.min(99, Math.floor(quantity)) });
  }
  return lines;
}
