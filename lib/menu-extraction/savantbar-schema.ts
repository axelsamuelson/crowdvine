/**
 * Zod boundary for Savantbar / Systemless Airtable API fields.
 * Known fields are stored; unknown fields are dropped and logged.
 */

import { z } from "zod";
import type { SavantbarAirtableRecord } from "./savantbar-scraper";

const LOG_PREFIX = "[savantbar-import]";

/** Trim leading tabs/whitespace (Name, Producer Name, and grape strings). */
export function trimSavantbarText(value: string): string {
  return value.replace(/^[\s\t]+/, "").trim();
}

const optionalString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null || v === "") return undefined;
    const t = trimSavantbarText(String(v));
    return t || undefined;
  });

const optionalNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number.parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
  });

const optionalBoolean = z.union([z.boolean(), z.null(), z.undefined()]).optional();

const optionalStringArray = z
  .union([z.array(z.union([z.string(), z.null()])), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return undefined;
    const items = Array.isArray(v) ? v : [v];
    const out = items
      .filter((x): x is string => typeof x === "string" && x.trim() !== "")
      .map((s) => trimSavantbarText(s))
      .filter(Boolean);
    return out.length > 0 ? out : undefined;
  });

const optionalLinkedRecordArray = z
  .union([
    z.array(z.union([z.string(), z.null()])),
    z.string(),
    z.null(),
    z.undefined(),
  ])
  .transform((v) => {
    if (v == null) return undefined;
    const items = Array.isArray(v) ? v : [v];
    const out = items.filter((x): x is string => typeof x === "string" && x.trim() !== "");
    return out.length > 0 ? out : undefined;
  });

/** Every field observed on GET /api/data/Vin (live API union, Vin endpoint). */
export const SAVANTBAR_VIN_FIELD_KEYS = [
  "Antal Baren",
  "Antal Källaren",
  "Cost Price",
  "Country",
  "Estimated Price",
  "Glass",
  "Glass Price Est",
  "Glass copy",
  "Grapes",
  "Importer",
  "Issues",
  "Item Type",
  "Last Updated",
  "Listed",
  "Delisted",
  "Magnum",
  "NW Producer (from Producer)",
  "Name",
  "Notes",
  "Price",
  "Producer",
  "Producer Name",
  "Record Created",
  "Region",
  "Region Name",
  "Stock",
  "Subregion",
  "Summa Baren",
  "Summa Källaren",
  "Summa Totalt",
  "Total antal",
  "Type",
  "Vintage",
  "k",
  "kh",
] as const;

/** Every field observed on GET /api/data/Other (live API union, Other endpoint). */
export const SAVANTBAR_OTHER_FIELD_KEYS = [
  "Alcohol",
  "Country",
  "Delisted",
  "Desc",
  "Name",
  "Price",
  "Producer",
  "Producer Name",
  "Region",
  "Region Name",
  "Subregion",
  "Type",
] as const;

export const SavantbarVinFieldsSchema = z
  .object({
    "Antal Baren": optionalNumber,
    "Antal Källaren": optionalNumber,
    "Cost Price": optionalNumber,
    Country: optionalStringArray,
    "Estimated Price": optionalNumber,
    Glass: optionalLinkedRecordArray,
    "Glass Price Est": optionalNumber,
    "Glass copy": optionalNumber,
    Grapes: optionalStringArray,
    Importer: optionalString,
    Issues: optionalString,
    "Item Type": optionalString,
    "Last Updated": optionalString,
    Listed: optionalBoolean,
    Delisted: optionalBoolean,
    Magnum: optionalBoolean,
    "NW Producer (from Producer)": optionalLinkedRecordArray,
    Name: optionalString,
    Notes: optionalString,
    Price: optionalNumber,
    Producer: optionalLinkedRecordArray,
    "Producer Name": optionalStringArray,
    "Record Created": optionalString,
    Region: optionalLinkedRecordArray,
    "Region Name": optionalStringArray,
    Stock: optionalNumber,
    Subregion: optionalStringArray,
    "Summa Baren": optionalNumber,
    "Summa Källaren": optionalNumber,
    "Summa Totalt": optionalNumber,
    "Total antal": optionalNumber,
    Type: optionalString,
    Vintage: optionalString,
    k: optionalBoolean,
    kh: optionalBoolean,
  })
  .strict();

export const SavantbarOtherFieldsSchema = z
  .object({
    Alcohol: optionalNumber,
    Country: optionalStringArray,
    Delisted: optionalBoolean,
    Desc: optionalString,
    Name: optionalString,
    Price: optionalNumber,
    Producer: optionalLinkedRecordArray,
    "Producer Name": optionalStringArray,
    Region: optionalLinkedRecordArray,
    "Region Name": optionalStringArray,
    Subregion: optionalStringArray,
    Type: optionalString,
  })
  .strict();

export type SavantbarVinFields = z.infer<typeof SavantbarVinFieldsSchema>;
export type SavantbarOtherFields = z.infer<typeof SavantbarOtherFieldsSchema>;

const VIN_KEY_SET = new Set<string>(SAVANTBAR_VIN_FIELD_KEYS);
const OTHER_KEY_SET = new Set<string>(SAVANTBAR_OTHER_FIELD_KEYS);

export type SavantbarPrepareStats = {
  wines_in: number;
  wines_out: number;
  wines_skipped: number;
  other_in: number;
  other_out: number;
  other_skipped: number;
  unknown_fields_dropped: string[];
};

function pickKnownFields(
  raw: Record<string, unknown>,
  allowed: Set<string>,
  recordId: string,
  endpoint: "Vin" | "Other",
): { picked: Record<string, unknown>; dropped: string[] } {
  const picked: Record<string, unknown> = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (allowed.has(key)) {
      picked[key] = value;
    } else {
      dropped.push(key);
      console.warn(`${LOG_PREFIX} unknown field dropped: ${key} (${endpoint} record ${recordId})`);
    }
  }
  return { picked, dropped };
}

function logGrapeWhitespaceIssues(
  raw: Record<string, unknown>,
  normalized: SavantbarVinFields,
  recordId: string,
): void {
  const rawGrapes = raw.Grapes;
  if (!Array.isArray(rawGrapes)) return;
  for (const g of rawGrapes) {
    if (typeof g !== "string") continue;
    if (/^[\s\t]/.test(g)) {
      console.warn(
        `${LOG_PREFIX} grape had leading whitespace (trimmed, typo not corrected): "${g}" (Vin record ${recordId})`,
      );
    }
  }
  const norm = normalized.Grapes ?? [];
  for (let i = 0; i < rawGrapes.length; i++) {
    const rawG = rawGrapes[i];
    const normG = norm[i];
    if (typeof rawG === "string" && typeof normG === "string" && rawG !== normG && rawG.trim() === normG) {
      // covered by leading-whitespace log above
    }
  }
}

export function prepareSavantbarVinRecord(
  record: SavantbarAirtableRecord<Record<string, unknown>>,
): SavantbarAirtableRecord<SavantbarVinFields> | null {
  const { picked, dropped } = pickKnownFields(record.fields, VIN_KEY_SET, record.id, "Vin");
  const parsed = SavantbarVinFieldsSchema.safeParse(picked);
  if (!parsed.success) {
    console.warn(
      `${LOG_PREFIX} record validation failed, skipping: ${record.id} (Vin)`,
      parsed.error.flatten().fieldErrors,
    );
    return null;
  }
  if (dropped.length > 0) {
    // pickKnownFields already logged each dropped key
  }
  logGrapeWhitespaceIssues(record.fields, parsed.data, record.id);
  return { id: record.id, createdTime: record.createdTime, fields: parsed.data };
}

export function prepareSavantbarOtherRecord(
  record: SavantbarAirtableRecord<Record<string, unknown>>,
): SavantbarAirtableRecord<SavantbarOtherFields> | null {
  const { picked, dropped } = pickKnownFields(record.fields, OTHER_KEY_SET, record.id, "Other");
  const parsed = SavantbarOtherFieldsSchema.safeParse(picked);
  if (!parsed.success) {
    console.warn(
      `${LOG_PREFIX} record validation failed, skipping: ${record.id} (Other)`,
      parsed.error.flatten().fieldErrors,
    );
    return null;
  }
  if (dropped.length > 0) {
    // pickKnownFields already logged each dropped key
  }
  return { id: record.id, createdTime: record.createdTime, fields: parsed.data };
}

export type SavantbarPreparedSnapshot = {
  fetched_at: string;
  source_url: string;
  source_slug: string;
  wines: SavantbarAirtableRecord<SavantbarVinFields>[];
  other: SavantbarAirtableRecord<SavantbarOtherFields>[];
  producers: SavantbarAirtableRecord<Record<string, unknown>>[];
  prepare_stats: SavantbarPrepareStats;
};

/**
 * Apply schema boundary + normalization to a raw snapshot (no DB writes).
 */
export function prepareSavantbarSnapshot(snapshot: {
  fetched_at: string;
  source_url: string;
  source_slug: string;
  wines: SavantbarAirtableRecord<Record<string, unknown>>[];
  other: SavantbarAirtableRecord<Record<string, unknown>>[];
  producers: SavantbarAirtableRecord<Record<string, unknown>>[];
}): SavantbarPreparedSnapshot {
  const unknown_fields_dropped: string[] = [];
  const wines: SavantbarAirtableRecord<SavantbarVinFields>[] = [];
  for (const raw of snapshot.wines) {
    const before = Object.keys(raw.fields);
    const prepared = prepareSavantbarVinRecord(raw);
    if (prepared) {
      wines.push(prepared);
    }
    for (const k of before) {
      if (!VIN_KEY_SET.has(k)) unknown_fields_dropped.push(`Vin:${raw.id}:${k}`);
    }
  }

  const other: SavantbarAirtableRecord<SavantbarOtherFields>[] = [];
  for (const raw of snapshot.other) {
    const before = Object.keys(raw.fields);
    const prepared = prepareSavantbarOtherRecord(raw);
    if (prepared) {
      other.push(prepared);
    }
    for (const k of before) {
      if (!OTHER_KEY_SET.has(k)) unknown_fields_dropped.push(`Other:${raw.id}:${k}`);
    }
  }

  return {
    fetched_at: snapshot.fetched_at,
    source_url: snapshot.source_url,
    source_slug: snapshot.source_slug,
    wines,
    other,
    producers: snapshot.producers,
    prepare_stats: {
      wines_in: snapshot.wines.length,
      wines_out: wines.length,
      wines_skipped: snapshot.wines.length - wines.length,
      other_in: snapshot.other.length,
      other_out: other.length,
      other_skipped: snapshot.other.length - other.length,
      unknown_fields_dropped,
    },
  };
}

/** Parse ISO timestamp from Savantbar "Last Updated" for incremental sync. */
export function savantbarSourceUpdatedAt(fields: {
  "Last Updated"?: string;
}): string | null {
  const raw = fields["Last Updated"]?.trim();
  if (!raw) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return raw;
  return new Date(t).toISOString();
}
