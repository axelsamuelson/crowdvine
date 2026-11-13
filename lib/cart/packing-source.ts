/**
 * Packing source identity for B2C case packing.
 *
 * Each producer or wholesaler packs its own boxes of 6. Mixed wines within
 * the same source are fine. Per source, bottle count must be 6, 12, 18, …
 *
 * Identity (Axel 2026-11-11):
 * - `wines.source_type = 'producer'` (default) → pack by `producer_id`
 * - `wines.source_type = 'wholesaler'|'wholesale'` → pack by `source_name`
 */

export const PACK_BOTTLES_PER_SOURCE = 6;

export type PackingSourceKind = "producer" | "wholesaler";

export type PackingSourceInput = {
  sourceType?: string | null;
  sourceName?: string | null;
  producerId?: string | null;
  /** Optional display label (producer name or wholesaler source_name). */
  displayName?: string | null;
  /** wines.region — used for wholesaler “Blandlåda från {region}”. */
  region?: string | null;
};

export type PackingSource = {
  id: string;
  kind: PackingSourceKind;
  /** Stable key fragment (producer uuid or normalized wholesaler name). */
  key: string;
  displayName: string;
};

function normalizeSourceType(
  sourceType: string | null | undefined,
): PackingSourceKind {
  const t = String(sourceType ?? "producer")
    .trim()
    .toLowerCase();
  if (t === "wholesaler" || t === "wholesale") return "wholesaler";
  return "producer";
}

/**
 * Resolve the packing-source id used to group bottles into boxes of 6.
 */
export function resolvePackingSource(input: PackingSourceInput): PackingSource {
  const kind = normalizeSourceType(input.sourceType);
  if (kind === "wholesaler") {
    const raw = String(input.sourceName ?? "").trim();
    const key = raw ? raw.toLowerCase() : "unknown-wholesaler";
    const displayName =
      String(input.displayName ?? "").trim() || raw || "Wholesaler";
    return {
      id: `wholesaler:${key}`,
      kind,
      key,
      displayName,
    };
  }
  const rawId = String(input.producerId ?? "").trim();
  const key = rawId || "unknown-producer";
  const displayName =
    String(input.displayName ?? "").trim() ||
    (rawId ? `Producer ${rawId.slice(0, 8)}` : "Producer");
  return {
    id: `producer:${key}`,
    kind,
    key,
    displayName,
  };
}

export function resolvePackingSourceId(input: PackingSourceInput): string {
  return resolvePackingSource(input).id;
}

/** True when bottle count is a positive multiple of {@link PACK_BOTTLES_PER_SOURCE}. */
export function isValidPackBottleCount(bottles: number): boolean {
  const n = Math.floor(Number(bottles) || 0);
  return n > 0 && n % PACK_BOTTLES_PER_SOURCE === 0;
}

/**
 * Bottles still needed to reach the next multiple of 6.
 * Empty (0) needs 6. Already valid needs 0.
 */
export function bottlesNeededForPack(bottles: number): number {
  const n = Math.max(0, Math.floor(Number(bottles) || 0));
  if (n === 0) return PACK_BOTTLES_PER_SOURCE;
  const rem = n % PACK_BOTTLES_PER_SOURCE;
  return rem === 0 ? 0 : PACK_BOTTLES_PER_SOURCE - rem;
}

export function nextPackBottleTarget(bottles: number): number {
  const n = Math.max(0, Math.floor(Number(bottles) || 0));
  return n + bottlesNeededForPack(n);
}

export type PackingSourceBottleLine = PackingSourceInput & {
  quantity: number;
};

export type PackingSourceProgress = PackingSource & {
  quantity: number;
  required: number;
  needed: number;
  isValid: boolean;
  /** Distinct wine regions in this source (for wholesaler Blandlåda label). */
  regions: string[];
};

/**
 * Aggregate bottle counts per packing source and report missing bottles.
 * Zero-quantity sources are omitted.
 */
export function computePackingSourceProgress(
  lines: ReadonlyArray<PackingSourceBottleLine>,
): PackingSourceProgress[] {
  const byId = new Map<
    string,
    { source: PackingSource; quantity: number; regions: string[] }
  >();

  for (const line of lines) {
    const quantity = Math.max(0, Math.floor(Number(line.quantity) || 0));
    if (quantity <= 0) continue;
    const source = resolvePackingSource(line);
    const region = String(line.region ?? "").trim();
    const prev = byId.get(source.id);
    if (prev) {
      prev.quantity += quantity;
      if (
        source.displayName &&
        prev.source.displayName.startsWith("Producer ")
      ) {
        prev.source = source;
      }
      if (
        region &&
        !prev.regions.some((r) => r.toLowerCase() === region.toLowerCase())
      ) {
        prev.regions.push(region);
      }
    } else {
      byId.set(source.id, {
        source,
        quantity,
        regions: region ? [region] : [],
      });
    }
  }

  return [...byId.values()].map(({ source, quantity, regions }) => {
    const needed = bottlesNeededForPack(quantity);
    const required = nextPackBottleTarget(quantity);
    return {
      ...source,
      quantity,
      required,
      needed,
      isValid: needed === 0,
      regions,
    };
  });
}

export function packingSourcesAreValid(
  lines: ReadonlyArray<PackingSourceBottleLine>,
): boolean {
  const rows = computePackingSourceProgress(lines);
  if (rows.length === 0) return false;
  return rows.every((row) => row.isValid);
}
