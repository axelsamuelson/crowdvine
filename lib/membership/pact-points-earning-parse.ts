/**
 * Pure parsers for PACT Points earning switch (safe for client + server).
 * Default when missing: DISABLED (Axel 2026-11-10).
 */

export const PACT_POINTS_EARNING_ENABLED_KEY = "pact_points_earning_enabled";

export function parsePactPointsEarningEnabled(
  raw: string | null | undefined,
): boolean {
  if (raw == null || String(raw).trim() === "") return false;
  const v = String(raw).trim().toLowerCase();
  if (v === "true" || v === "1" || v === "on" || v === "enabled" || v === "yes") {
    return true;
  }
  return false;
}
