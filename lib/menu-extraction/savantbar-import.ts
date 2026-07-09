/**
 * Import Savant Bar flasklista snapshot into menu_documents + menu_extracted_rows.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  createMenuDocument,
  getCompletedMenuDocumentByContentHash,
  getCurrentMenuDocumentBySlug,
  getStarwinelistSourceBySlug,
  promoteMenuDocumentToCurrent,
  updateMenuDocument,
  upsertStarwinelistSource,
} from "./db";
import {
  diffSavantbarSnapshots,
  type SavantbarSnapshotDiff,
} from "./savantbar-diff";
import {
  normalizeCountry,
  normalizeVintage,
  normalizeWineType,
} from "./normalization";
import type { WineType } from "./types";
import {
  prepareSavantbarSnapshot,
  savantbarSourceUpdatedAt,
  type SavantbarOtherFields,
  type SavantbarPreparedSnapshot,
  type SavantbarVinFields,
} from "./savantbar-schema";
import {
  fetchSavantbarSnapshot,
  firstString,
  hashSavantbarSnapshot,
  type SavantbarAirtableRecord,
  type SavantbarRawSnapshot,
} from "./savantbar-scraper";

const SOURCE_SLUG = "savant-bar-kaffe-and-vin";
const WORKFLOW_VERSION = "savantbar-flasklista-v2";

const SAVANTBAR_WINE_TYPE_MAP: Record<string, WineType> = {
  bubbligt: "sparkling",
  "oxy & flor": "fortified",
  skalmacerat: "orange",
};

function mapSavantbarWineType(raw: string | null): WineType {
  if (!raw?.trim()) return "unknown";
  const key = raw.trim().toLowerCase();
  return SAVANTBAR_WINE_TYPE_MAP[key] ?? normalizeWineType(raw);
}

function buildAttributes(fields: SavantbarVinFields | SavantbarOtherFields): string[] | null {
  const attrs: string[] = [];
  if ("k" in fields && fields.k) attrs.push("K");
  if ("kh" in fields && fields.kh) attrs.push("KH");
  if ("Magnum" in fields && fields.Magnum) attrs.push("MAGNUM");
  const type = firstString(fields.Type);
  if (type) attrs.push(type.toUpperCase());
  return attrs.length > 0 ? attrs : null;
}

function buildRawText(params: {
  producer: string | null;
  wineName: string | null;
  vintage: string | null;
  region: string | null;
  country: string | null;
  grapes: string[] | null;
  priceBottle: number | null;
}): string {
  const parts = [
    params.producer,
    params.vintage,
    params.wineName,
    params.grapes?.join(", "),
    params.region,
    params.country,
    params.priceBottle != null ? String(params.priceBottle) : null,
  ].filter(Boolean);
  return parts.join(" | ");
}

function sectionKeyForWine(fields: SavantbarVinFields): string {
  const type = firstString(fields.Type) ?? "Övrigt";
  const country = firstString(fields.Country) ?? "Okänt land";
  return `${type} – ${country}`;
}

function sectionKeyForOther(fields: SavantbarOtherFields): string {
  return firstString(fields.Type) ?? "Övrigt";
}

/**
 * Savantbar → menu_extracted_rows price columns.
 *
 * price_bottle ← fields.Price (listed bottle price on the menu)
 * price_glass  ← null (no customer-facing numeric glass price on Vin/Other rows)
 *
 * Not mapped to row columns (kept in savantbar_fields only):
 * - "Glass Price Est" — internal estimate
 * - Glass — Airtable linked-record id(s) → /api/data/Glass (separate table)
 * - "Glass copy" — display string, not a price
 */
export function mapSavantbarRowPrices(
  fields: SavantbarVinFields | SavantbarOtherFields,
): { price_bottle: number | null; price_glass: number | null } {
  const price_bottle = typeof fields.Price === "number" ? fields.Price : null;
  return { price_bottle, price_glass: null };
}

/** Active Vin rows: explicitly listed on the menu and not delisted. */
export function isActiveSavantbarVin(fields: SavantbarVinFields): boolean {
  return fields.Listed === true && fields.Delisted !== true;
}

/**
 * Active Other rows: not delisted (Other endpoint has no Listed flag).
 * Ingested as row_type "unknown" — excluded from wine search regardless.
 */
export function isActiveSavantbarOther(fields: SavantbarOtherFields): boolean {
  return fields.Delisted !== true;
}

function wineToRow(
  record: SavantbarAirtableRecord<SavantbarVinFields | SavantbarOtherFields>,
  rowType: "wine_row" | "unknown" = "wine_row",
): Record<string, unknown> {
  const f = record.fields;
  const producer = firstString(f["Producer Name"]);
  const wineName = firstString(f.Name);
  const vintage = "Vintage" in f ? normalizeVintage(firstString(f.Vintage)) : null;
  const region = firstString(f.Subregion) ?? firstString(f["Region Name"]);
  const country = normalizeCountry(firstString(f.Country));
  const grapes =
    "Grapes" in f && Array.isArray(f.Grapes) ? f.Grapes.filter(Boolean) : null;
  const { price_bottle: priceBottle, price_glass: priceGlass } = mapSavantbarRowPrices(f);
  const wineType = mapSavantbarWineType(firstString(f.Type));
  const needsReview = !producer || !wineName || priceBottle == null;
  const reviewReasons: string[] = [];
  if (!producer) reviewReasons.push("missing_producer");
  if (!wineName) reviewReasons.push("missing_wine_name");
  if (priceBottle == null) reviewReasons.push("missing_price");

  const sourceUpdatedAt =
    "Last Updated" in f ? savantbarSourceUpdatedAt(f) : null;

  return {
    row_type: rowType,
    wine_type: wineType,
    producer,
    wine_name: wineName,
    vintage,
    region,
    country,
    grapes,
    attributes: buildAttributes(f),
    format_label: "Magnum" in f && f.Magnum ? "Magnum" : null,
    price_glass: priceGlass,
    price_bottle: priceBottle,
    price_other: null,
    currency: "SEK",
    confidence: needsReview ? 0.75 : 0.95,
    confidence_label: needsReview ? "medium" : "high",
    needs_review: needsReview,
    review_reasons: reviewReasons.length > 0 ? reviewReasons : null,
    raw_text: buildRawText({ producer, wineName, vintage, region, country, grapes, priceBottle }),
    normalized_payload: {
      savantbar_id: record.id,
      savantbar_created_time: record.createdTime,
      source_updated_at: sourceUpdatedAt,
      savantbar_fields: f,
      source: "flasklista.savantbar.se",
    },
    validation_flags: null,
    extraction_version: WORKFLOW_VERSION,
    extraction_iterations: 1,
    critic_approved: true,
    page_number: null,
  };
}

export interface SavantbarImportResult {
  skipped: boolean;
  skip_reason?: string;
  document_id?: string;
  content_hash: string;
  wine_count: number;
  other_count: number;
  row_count: number;
  section_count: number;
  prepare_stats?: SavantbarPreparedSnapshot["prepare_stats"];
  diff?: SavantbarSnapshotDiff;
}

export async function importSavantbarSnapshot(
  rawSnapshot: SavantbarRawSnapshot,
  options?: { force?: boolean },
): Promise<SavantbarImportResult> {
  const prepared = prepareSavantbarSnapshot(rawSnapshot);
  const { prepare_stats } = prepared;

  if (prepare_stats.wines_skipped > 0 || prepare_stats.other_skipped > 0) {
    console.warn("[savantbar-import] prepare summary:", prepare_stats);
  }

  const contentHash = hashSavantbarSnapshot(prepared);
  if (!options?.force) {
    const existing = await getCompletedMenuDocumentByContentHash(SOURCE_SLUG, contentHash);
    if (existing) {
      return {
        skipped: true,
        skip_reason: "unchanged",
        document_id: existing.id,
        content_hash: contentHash,
        wine_count: prepared.wines.length,
        other_count: prepared.other.length,
        row_count: 0,
        section_count: 0,
        prepare_stats,
        diff: {
          added: [],
          removed: [],
          priceChanges: [],
          hasChanges: false,
        },
      };
    }
  }

  const currentDoc = await getCurrentMenuDocumentBySlug(SOURCE_SLUG);
  const oldPrepared = currentDoc?.ai_raw_response as SavantbarPreparedSnapshot | null;
  const diff = diffSavantbarSnapshots(oldPrepared, prepared);
  if (diff.hasChanges) {
    console.warn("[savantbar-import] snapshot diff:", {
      added: diff.added.length,
      removed: diff.removed.length,
      priceChanges: diff.priceChanges.length,
    });
  }

  const timestamp = prepared.fetched_at.replace(/[:.]/g, "-");
  const filePath = `${SOURCE_SLUG}/flasklista_${timestamp}.json`;

  const doc = await createMenuDocument({
    file_path: filePath,
    file_name: `flasklista_${timestamp}.json`,
    mime_type: "application/json",
    source_type: "savantbar_flasklista",
    source_slug: SOURCE_SLUG,
    content_hash: contentHash,
    extraction_status: "processing",
    raw_text: null,
    ai_raw_response: prepared,
    workflow_version: WORKFLOW_VERSION,
    model_version: "systemless-api",
    prompt_version: "n/a",
  });

  const listedWines = prepared.wines.filter((w) => isActiveSavantbarVin(w.fields));
  const listedOther = prepared.other.filter((o) => isActiveSavantbarOther(o.fields));

  const sectionOrder: string[] = [];
  const sectionRows = new Map<string, Record<string, unknown>[]>();

  for (const wine of listedWines) {
    const key = sectionKeyForWine(wine.fields);
    if (!sectionRows.has(key)) {
      sectionRows.set(key, []);
      sectionOrder.push(key);
    }
    sectionRows.get(key)!.push(wineToRow(wine));
  }

  for (const other of listedOther) {
    const key = sectionKeyForOther(other.fields);
    if (!sectionRows.has(key)) {
      sectionRows.set(key, []);
      sectionOrder.push(key);
    }
    sectionRows.get(key)!.push(wineToRow(other, "unknown"));
  }

  const sb = getSupabaseAdmin();
  const sectionIds: string[] = [];
  for (let i = 0; i < sectionOrder.length; i++) {
    const sectionName = sectionOrder[i];
    const typePart = sectionName.split(" – ")[0] ?? sectionName;
    const { data: inserted, error } = await sb
      .from("menu_document_sections")
      .insert({
        document_id: doc.id,
        section_name: sectionName,
        normalized_section: normalizeWineType(typePart) !== "unknown"
          ? normalizeWineType(typePart)
          : typePart.toLowerCase().replace(/\s+/g, "_"),
        page_number: null,
        section_order: i,
      })
      .select("id")
      .single();
    if (error) throw new Error(`importSavantbarSnapshot (section): ${error.message}`);
    sectionIds.push((inserted as { id: string }).id);
  }

  const rowsToInsert: Record<string, unknown>[] = [];
  let rowIndex = 0;
  for (let si = 0; si < sectionOrder.length; si++) {
    const rows = sectionRows.get(sectionOrder[si]) ?? [];
    const sectionId = sectionIds[si] ?? null;
    for (const row of rows) {
      rowsToInsert.push({
        ...row,
        document_id: doc.id,
        section_id: sectionId,
        row_index: rowIndex++,
      });
    }
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await sb.from("menu_extracted_rows").insert(rowsToInsert);
    if (insertError) throw new Error(`importSavantbarSnapshot (rows): ${insertError.message}`);
  }

  const finishedAt = new Date().toISOString();
  await updateMenuDocument(doc.id, {
    extraction_status: "completed",
    extracted_at: finishedAt,
    last_extraction_attempt_at: finishedAt,
    error_message: null,
  });
  await promoteMenuDocumentToCurrent(doc.id);

  const existingSource = await getStarwinelistSourceBySlug(SOURCE_SLUG);
  await upsertStarwinelistSource({
    slug: SOURCE_SLUG,
    name: existingSource?.name ?? "Savant Bar",
    city: "stockholm",
    source_url: existingSource?.source_url ?? `https://starwinelist.com/wine-place/${SOURCE_SLUG}`,
    menu_provider: "systemless",
    api_base_url: existingSource?.api_base_url ?? "https://flasklista.savantbar.se",
    crawl_status: "completed",
    last_synced_at: finishedAt,
    latest_document_id: doc.id,
  });

  return {
    skipped: false,
    document_id: doc.id,
    content_hash: contentHash,
    wine_count: listedWines.length,
    other_count: listedOther.length,
    row_count: rowsToInsert.length,
    section_count: sectionOrder.length,
    prepare_stats,
    diff,
  };
}

export async function importSavantbarBottleList(options?: {
  force?: boolean;
}): Promise<SavantbarImportResult> {
  const snapshot = await fetchSavantbarSnapshot();
  return importSavantbarSnapshot(snapshot, options);
}

/** Fetch + schema-boundary prepare only (no DB writes). */
export async function dryRunSavantbarImport(): Promise<SavantbarPreparedSnapshot> {
  const raw = await fetchSavantbarSnapshot();
  return prepareSavantbarSnapshot(raw);
}
