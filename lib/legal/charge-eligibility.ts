/**
 * Köpvillkor p. 3: en reservation debiteras inte när den är äldre än 90 dagar.
 * GC-dokumentet fråga 6: debitera inte reservationer som saknar villkorsgodkännande
 * eller ålderskontroll.
 * docs/legal/gc-stallningstagande-angerratt-och-villkor.md
 */
export const RESERVATION_MAX_AGE_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ChargeSkipReason =
  | "terms_missing"
  | "age_missing"
  | "reservation_expired";

export type ChargeEligibility =
  | { ok: true }
  | { ok: false; reason: ChargeSkipReason };

export type ChargeEligibilityReservation = {
  terms_version?: string | null;
  terms_accepted_at?: string | null;
  age_verified_at?: string | null;
  created_at?: string | null;
};

/** ISO timestamp: created_at must be strictly after this to stay inside 90 days. */
export function chargeCreatedAfterIso(now: Date): string {
  return new Date(
    now.getTime() - RESERVATION_MAX_AGE_DAYS * DAY_MS,
  ).toISOString();
}

export function isChargeEligible(
  reservation: ChargeEligibilityReservation,
  now: Date,
): ChargeEligibility {
  if (reservation.terms_version == null || reservation.terms_accepted_at == null) {
    return { ok: false, reason: "terms_missing" };
  }
  if (reservation.age_verified_at == null) {
    return { ok: false, reason: "age_missing" };
  }

  const createdAt = reservation.created_at;
  const createdMs =
    typeof createdAt === "string" ? new Date(createdAt).getTime() : Number.NaN;
  if (!Number.isFinite(createdMs)) {
    return { ok: false, reason: "reservation_expired" };
  }

  const cutoffMs = new Date(chargeCreatedAfterIso(now)).getTime();
  if (createdMs <= cutoffMs) {
    return { ok: false, reason: "reservation_expired" };
  }

  return { ok: true };
}
