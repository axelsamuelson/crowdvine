import type {
  SavantbarOtherFields,
  SavantbarPreparedSnapshot,
  SavantbarVinFields,
} from "./savantbar-schema";
import type { SavantbarAirtableRecord } from "./savantbar-scraper";
import { firstString } from "./savantbar-scraper";

function isActiveSavantbarVin(fields: SavantbarVinFields): boolean {
  return fields.Listed === true && fields.Delisted !== true;
}

function isActiveSavantbarOther(fields: SavantbarOtherFields): boolean {
  return fields.Delisted !== true;
}

export interface SavantbarDiffEntry {
  savantbar_id: string;
  kind: "wine" | "other";
  producer: string | null;
  name: string | null;
  price: number | null;
}

export interface SavantbarPriceChange {
  savantbar_id: string;
  kind: "wine" | "other";
  producer: string | null;
  name: string | null;
  old_price: number | null;
  new_price: number | null;
}

export interface SavantbarSnapshotDiff {
  added: SavantbarDiffEntry[];
  removed: SavantbarDiffEntry[];
  priceChanges: SavantbarPriceChange[];
  hasChanges: boolean;
}

function entryFromRecord(
  record: SavantbarAirtableRecord<SavantbarVinFields | SavantbarOtherFields>,
  kind: "wine" | "other",
): SavantbarDiffEntry {
  const f = record.fields;
  return {
    savantbar_id: record.id,
    kind,
    producer: firstString(f["Producer Name"]),
    name: firstString(f.Name),
    price: typeof f.Price === "number" ? f.Price : null,
  };
}

function indexActiveRecords(
  snapshot: SavantbarPreparedSnapshot | null | undefined,
): Map<string, SavantbarDiffEntry> {
  const map = new Map<string, SavantbarDiffEntry>();
  if (!snapshot) return map;

  for (const wine of snapshot.wines) {
    if (!isActiveSavantbarVin(wine.fields)) continue;
    map.set(wine.id, entryFromRecord(wine, "wine"));
  }
  for (const other of snapshot.other) {
    if (!isActiveSavantbarOther(other.fields)) continue;
    map.set(other.id, entryFromRecord(other, "other"));
  }
  return map;
}

/**
 * Compare two prepared Savantbar snapshots by savantbar_id (active listed rows only).
 */
export function diffSavantbarSnapshots(
  oldSnapshot: SavantbarPreparedSnapshot | null | undefined,
  newSnapshot: SavantbarPreparedSnapshot,
): SavantbarSnapshotDiff {
  const oldIndex = indexActiveRecords(oldSnapshot);
  const newIndex = indexActiveRecords(newSnapshot);

  const added: SavantbarDiffEntry[] = [];
  const removed: SavantbarDiffEntry[] = [];
  const priceChanges: SavantbarPriceChange[] = [];

  for (const [id, entry] of newIndex) {
    const prev = oldIndex.get(id);
    if (!prev) {
      added.push(entry);
      continue;
    }
    if (prev.price !== entry.price) {
      priceChanges.push({
        savantbar_id: id,
        kind: entry.kind,
        producer: entry.producer,
        name: entry.name,
        old_price: prev.price,
        new_price: entry.price,
      });
    }
  }

  for (const [id, entry] of oldIndex) {
    if (!newIndex.has(id)) {
      removed.push(entry);
    }
  }

  added.sort((a, b) => (a.producer ?? "").localeCompare(b.producer ?? ""));
  removed.sort((a, b) => (a.producer ?? "").localeCompare(b.producer ?? ""));
  priceChanges.sort((a, b) => (a.producer ?? "").localeCompare(b.producer ?? ""));

  return {
    added,
    removed,
    priceChanges,
    hasChanges: added.length > 0 || removed.length > 0 || priceChanges.length > 0,
  };
}

export function formatSavantbarDiffSummary(diff: SavantbarSnapshotDiff): string {
  return `Savant: ${diff.added.length} new wines, ${diff.removed.length} removed, ${diff.priceChanges.length} price changes.`;
}
