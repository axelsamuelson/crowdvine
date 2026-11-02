/**
 * Seeded organic registry verification (migrations/269_*).
 * Used by the shop Organic filter before/while DB columns are unavailable,
 * and as the canonical producer name list for docs/tests.
 *
 * Meigoon is intentionally absent (in conversion — not Certified).
 * Gregory White, Hors Saison are absent (unverified).
 * Ugo Lestelle is absent (certification lapsed / ARRETEE).
 * Mas Des Mesures is absent (no Organic Certified chip yet).
 */
export const SEED_VERIFIED_ORGANIC_PRODUCER_NAMES = [
  "Château del Ranq",
  "Clos Fantine",
  "Domaine Les Serrals",
  "Julien Peyras",
  "La Graine Sauvage",
  "Mas d'Agalis",
  "Pierre et l'Étoile",
  "Thomas Chany",
  "Peira Levada",
] as const;

const SEED_VERIFIED_ORGANIC_PRODUCER_NAME_SET = new Set<string>(
  SEED_VERIFIED_ORGANIC_PRODUCER_NAMES,
);

/** Producers whose organic registry status is ARRETEE (migrations/269_*). */
export const SEED_LAPSED_ORGANIC_PRODUCER_NAMES = ["Ugo Lestelle"] as const;

const SEED_LAPSED_ORGANIC_PRODUCER_NAME_SET = new Set<string>(
  SEED_LAPSED_ORGANIC_PRODUCER_NAMES,
);

/** True when producer name matches the seeded verified-organic allowlist. */
export function isSeedVerifiedOrganicProducer(
  producerName: string | null | undefined,
): boolean {
  const name = producerName?.trim();
  if (!name) return false;
  return SEED_VERIFIED_ORGANIC_PRODUCER_NAME_SET.has(name);
}

/** True when producer organic certification has lapsed (ARRETEE). */
export function isSeedLapsedOrganicProducer(
  producerName: string | null | undefined,
): boolean {
  const name = producerName?.trim();
  if (!name) return false;
  return SEED_LAPSED_ORGANIC_PRODUCER_NAME_SET.has(name);
}
