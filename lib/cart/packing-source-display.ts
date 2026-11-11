/**
 * Customer-facing packing-source labels (Margaux final, Axel 2026-11-11).
 * Never show wholesaler company names ("grossist") to customers.
 */

import type { PackingSourceKind } from "@/lib/cart/packing-source";

const FRANCE_SV = "Frankrike";
const FRANCE_EN = "France";

export function uniqueRegions(
  regions: ReadonlyArray<string | null | undefined>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of regions) {
    const r = String(raw ?? "").trim();
    if (!r) continue;
    const key = r.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Region label for a wholesaler mixed box.
 * One region → that name; several / none → France / Frankrike.
 */
export function wholesalerBoxRegionLabel(
  regions: ReadonlyArray<string | null | undefined>,
  locale: "sv" | "en" = "sv",
): string {
  const uniq = uniqueRegions(regions);
  if (uniq.length === 1) return uniq[0]!;
  return locale === "en" ? FRANCE_EN : FRANCE_SV;
}

export function formatPackingSourceCustomerLabel(args: {
  kind: PackingSourceKind;
  /** Producer display name (customer-facing). Ignored for wholesaler. */
  producerName?: string | null;
  regions?: ReadonlyArray<string | null | undefined>;
  locale?: "sv" | "en";
}): string {
  const locale = args.locale ?? "sv";
  if (args.kind === "wholesaler") {
    const region = wholesalerBoxRegionLabel(args.regions ?? [], locale);
    return locale === "en"
      ? `Mixed box from ${region}`
      : `Blandlåda från ${region}`;
  }
  const name = String(args.producerName ?? "").trim();
  return name || (locale === "en" ? "Producer" : "Producent");
}

/** Full boxes already filled from a bottle count (floor). */
export function fullBoxCountFromBottles(bottles: number): number {
  const n = Math.max(0, Math.floor(Number(bottles) || 0));
  return Math.floor(n / 6);
}

/** Boxes needed for a bottle count (ceil). Empty → 0. */
export function targetBoxCountFromBottles(bottles: number): number {
  const n = Math.max(0, Math.floor(Number(bottles) || 0));
  if (n <= 0) return 0;
  return Math.ceil(n / 6);
}

/**
 * Cart summary counters: full boxes vs boxes in progress.
 * - full = Σ floor(nᵢ / 6)
 * - total = Σ ceil(nᵢ / 6)
 * Example: 8 bottles from one source → { full: 1, total: 2 }.
 */
export function packingBoxSummary(
  quantities: ReadonlyArray<number>,
): { full: number; total: number } {
  let full = 0;
  let total = 0;
  for (const q of quantities) {
    full += fullBoxCountFromBottles(q);
    total += targetBoxCountFromBottles(q);
  }
  return { full, total };
}
