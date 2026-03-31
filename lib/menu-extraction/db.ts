/**
 * Supabase DB layer for menu extraction (menu_documents, sections, extracted_rows, feedback).
 * Uses admin client (bypasses RLS) for server-side use.
 * Isolated domain – no reference to wines tables.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Slug that looks like a Starwinelist 404 page id (e.g. 404, 1066). Exclude from listing and do not create sources for these. */
export function isStarwinelist404Slug(slug: string): boolean {
  return /^\d+$/.test(String(slug).trim());
}
import type {
  MenuDocument,
  MenuDocumentSection,
  MenuExtractedRow,
  CreateMenuDocumentInput,
  AIExtractionResult,
  AIExtractedRow,
  ConfidenceLabel,
  StarwinelistSource,
  MenuManualRun,
  ManualRunStatus,
  ManualRunStep,
  MenuExtractionBatch,
  MenuExtractionBatchStatus,
  MenuExtractionFeedback,
} from "./types";

const MENU_DOCUMENTS_SELECT =
  "id, created_at, updated_at, file_path, file_name, mime_type, source_type, upload_status, extraction_status, page_count, raw_text, ai_raw_response, model_version, prompt_version, workflow_version, extracted_at, last_extraction_attempt_at, error_message, content_hash, source_slug, extraction_input_tokens, extraction_output_tokens, extraction_cache_read_input_tokens, extraction_cache_creation_input_tokens, critic_stats, used_batch_api, extraction_trace";
const MENU_DOCUMENT_SECTIONS_SELECT =
  "id, created_at, document_id, section_name, normalized_section, page_number, section_order";
const MENU_EXTRACTED_ROWS_SELECT =
  "id, created_at, updated_at, document_id, section_id, row_index, page_number, raw_text, row_type, wine_type, producer, wine_name, vintage, region, country, grapes, attributes, format_label, price_glass, price_bottle, price_other, currency, confidence, confidence_label, needs_review, review_reasons, normalized_payload, validation_flags, extraction_version, auto_corrected, extraction_iterations, critic_approved";

const STARWINELIST_SOURCES_SELECT =
  "id, created_at, updated_at, slug, name, city, source_url, swl_updated_at, swl_updated_at_parsed, pdf_url, pdf_last_seen_at, crawl_status, last_crawled_at, last_error, crawl_attempts, latest_document_id";

function confidenceToLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.6) return "medium";
  return "low";
}

export async function createMenuDocument(
  data: CreateMenuDocumentInput
): Promise<MenuDocument> {
  const sb = getSupabaseAdmin();
  const row = {
    file_path: data.file_path,
    file_name: data.file_name,
    mime_type: data.mime_type ?? "application/pdf",
    source_type: data.source_type ?? "pdf",
    upload_status: data.upload_status ?? "uploaded",
    extraction_status: data.extraction_status ?? "pending",
    page_count: data.page_count ?? null,
    raw_text: data.raw_text ?? null,
    ai_raw_response: data.ai_raw_response ?? null,
    model_version: data.model_version ?? null,
    prompt_version: data.prompt_version ?? null,
    workflow_version: data.workflow_version ?? null,
    extracted_at: data.extracted_at ?? null,
    error_message: data.error_message ?? null,
    content_hash: data.content_hash ?? null,
    source_slug: data.source_slug ?? null,
  };
  const { data: out, error } = await sb
    .from("menu_documents")
    .insert(row)
    .select(MENU_DOCUMENTS_SELECT)
    .single();
  if (error) throw new Error(`createMenuDocument: ${error.message}`);
  return out as MenuDocument;
}

export async function getMenuDocumentById(
  id: string
): Promise<MenuDocument | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_documents")
    .select(MENU_DOCUMENTS_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getMenuDocumentById: ${error.message}`);
  return data as MenuDocument | null;
}

/** Get a single document by exact file_path (e.g. babette/2026-03-10T23-24-53-885Z.pdf). */
export async function getMenuDocumentByFilePath(
  file_path: string
): Promise<MenuDocument | null> {
  const sb = getSupabaseAdmin();
  const path = file_path.trim();
  if (!path) return null;
  const { data, error } = await sb
    .from("menu_documents")
    .select(MENU_DOCUMENTS_SELECT)
    .eq("file_path", path)
    .maybeSingle();
  if (error) throw new Error(`getMenuDocumentByFilePath: ${error.message}`);
  return data as MenuDocument | null;
}

export async function listMenuDocuments(): Promise<MenuDocument[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_documents")
    .select(MENU_DOCUMENTS_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listMenuDocuments: ${error.message}`);
  return (data ?? []) as MenuDocument[];
}

/** Delete a menu document by id. Cascades to sections and rows. Used for force re-crawl. */
export async function deleteMenuDocument(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("menu_documents").delete().eq("id", id);
  if (error) throw new Error(`deleteMenuDocument: ${error.message}`);
}

/**
 * Delete the most recent menu document for a Starwinelist source (by slug).
 * Clears latest_document_id on the source (FK ON DELETE SET NULL). Use with --force in smoke test.
 */
export async function deleteMostRecentDocumentForSlug(slug: string): Promise<void> {
  const source = await getStarwinelistSourceBySlug(slug);
  if (!source?.latest_document_id) return;
  await deleteMenuDocument(source.latest_document_id);
}

/**
 * Get the latest menu document for a slug (for idempotency check).
 * Prefer document linked by starwinelist_sources.latest_document_id; else latest by source_slug.
 */
export async function getLatestDocumentForSlug(slug: string): Promise<MenuDocument | null> {
  const source = await getStarwinelistSourceBySlug(slug);
  if (source?.latest_document_id) {
    const doc = await getMenuDocumentById(source.latest_document_id);
    if (doc) return doc;
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_documents")
    .select(MENU_DOCUMENTS_SELECT)
    .eq("source_slug", slug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestDocumentForSlug: ${error.message}`);
  return data as MenuDocument | null;
}

export async function updateMenuDocument(
  id: string,
  updates: Partial<MenuDocument>
): Promise<MenuDocument> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_documents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(MENU_DOCUMENTS_SELECT)
    .single();
  if (error) throw new Error(`updateMenuDocument: ${error.message}`);
  return data as MenuDocument;
}

/** Map AI row to DB row payload (no id, document_id, section_id, row_index, page_number set by caller). */
function aiRowToDbRow(
  ai: AIExtractedRow,
  documentId: string,
  sectionId: string | null,
  rowIndex: number,
  pageNumber: number | null,
  extractionVersion: string | null
): Record<string, unknown> {
  const confidenceLabel = confidenceToLabel(ai.confidence);
  const needsReview =
    ai.review_reasons.length > 0 || ai.confidence < 0.6;
  return {
    document_id: documentId,
    section_id: sectionId,
    row_index: rowIndex,
    page_number: pageNumber,
    raw_text: ai.raw_text,
    row_type: ai.row_type,
    wine_type: ai.wine_type,
    producer: ai.producer,
    wine_name: ai.wine_name,
    vintage: ai.vintage,
    region: ai.region,
    country: ai.country,
    grapes: ai.grapes.length > 0 ? ai.grapes : null,
    attributes: ai.attributes.length > 0 ? ai.attributes : null,
    format_label: ai.format_label,
    price_glass: ai.price_glass,
    price_bottle: ai.price_bottle,
    price_other: ai.price_other,
    currency: ai.currency,
    confidence: ai.confidence,
    confidence_label: confidenceLabel,
    needs_review: needsReview,
    review_reasons: ai.review_reasons.length > 0 ? ai.review_reasons : null,
    normalized_payload: null,
    validation_flags: null,
    extraction_version: extractionVersion,
    extraction_iterations: 1,
    critic_approved: null,
  };
}

/** Row payload from service (with section_order); id/created_at/updated_at set by DB. */
export type MenuExtractedRowForInsert = Omit<
  MenuExtractedRow,
  "id" | "created_at" | "updated_at"
> & { section_order: number };

/**
 * Persist AI extraction result: clear existing sections/rows for document, then insert
 * sections and rows. When normalizedRows is provided (from service validation/normalization),
 * those are inserted; otherwise rows are derived from aiRawResponse.
 * Re-processing is idempotent (no duplicate rows).
 */
export async function saveMenuExtractionResult(params: {
  documentId: string;
  aiRawResponse: AIExtractionResult;
  meta: { modelVersion: string; promptVersion: string; workflowVersion: string };
  normalizedRows?: MenuExtractedRowForInsert[];
}): Promise<void> {
  const sb = getSupabaseAdmin();
  const { documentId, aiRawResponse, meta, normalizedRows } = params;

  const { error: delRowsError } = await sb
    .from("menu_extracted_rows")
    .delete()
    .eq("document_id", documentId);
  if (delRowsError) throw new Error(`saveMenuExtractionResult (delete rows): ${delRowsError.message}`);

  const { error: delSectionsError } = await sb
    .from("menu_document_sections")
    .delete()
    .eq("document_id", documentId);
  if (delSectionsError) throw new Error(`saveMenuExtractionResult (delete sections): ${delSectionsError.message}`);

  const sectionIds: string[] = [];
  for (let i = 0; i < aiRawResponse.sections.length; i++) {
    const sec = aiRawResponse.sections[i];
    const { data: inserted, error } = await sb
      .from("menu_document_sections")
      .insert({
        document_id: documentId,
        section_name: sec.section_name,
        normalized_section: sec.normalized_section,
        page_number: null,
        section_order: i,
      })
      .select("id")
      .single();
    if (error) throw new Error(`saveMenuExtractionResult (insert section): ${error.message}`);
    sectionIds.push((inserted as { id: string }).id);
  }

  const rowsToInsert: Record<string, unknown>[] = [];
  if (normalizedRows?.length) {
    for (const row of normalizedRows) {
      const { section_order, ...rest } = row;
      const sectionId = sectionIds[section_order] ?? null;
      rowsToInsert.push({ ...rest, document_id: documentId, section_id: sectionId });
    }
  } else {
    let globalRowIndex = 0;
    for (let si = 0; si < aiRawResponse.sections.length; si++) {
      const section = aiRawResponse.sections[si];
      const sectionId = sectionIds[si] ?? null;
      for (let ri = 0; ri < section.rows.length; ri++) {
        const aiRow = section.rows[ri];
        rowsToInsert.push(
          aiRowToDbRow(
            aiRow,
            documentId,
            sectionId,
            globalRowIndex,
            null,
            meta.workflowVersion
          )
        );
        globalRowIndex++;
      }
    }
  }

  if (rowsToInsert.length > 0) {
    const { error: insertRowsError } = await sb
      .from("menu_extracted_rows")
      .insert(rowsToInsert);
    if (insertRowsError) throw new Error(`saveMenuExtractionResult (insert rows): ${insertRowsError.message}`);
  }

  // Update document with AI raw response and extraction meta (updated_at set inside updateMenuDocument)
  const finishedAt = new Date().toISOString();
  await updateMenuDocument(documentId, {
    ai_raw_response: aiRawResponse as unknown,
    extraction_status: "completed",
    extracted_at: finishedAt,
    last_extraction_attempt_at: finishedAt,
    model_version: meta.modelVersion,
    prompt_version: meta.promptVersion,
    workflow_version: meta.workflowVersion,
    error_message: null,
  });
}

export async function getExtractedRowsByDocumentId(
  documentId: string
): Promise<MenuExtractedRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_extracted_rows")
    .select(MENU_EXTRACTED_ROWS_SELECT)
    .eq("document_id", documentId)
    .order("row_index", { ascending: true });
  if (error) throw new Error(`getExtractedRowsByDocumentId: ${error.message}`);
  return (data ?? []) as MenuExtractedRow[];
}

export async function getExtractedRowById(rowId: string): Promise<MenuExtractedRow | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_extracted_rows")
    .select(MENU_EXTRACTED_ROWS_SELECT)
    .eq("id", rowId)
    .maybeSingle();
  if (error) throw new Error(`getExtractedRowById: ${error.message}`);
  return data as MenuExtractedRow | null;
}

/** Allowed fields for human review edits and auto-correction (not raw_text, row_index, document_id, etc.). */
const UPDATE_EXTRACTED_ROW_ALLOWED_KEYS = new Set([
  "producer",
  "wine_name",
  "vintage",
  "region",
  "country",
  "price_glass",
  "price_bottle",
  "price_other",
  "needs_review",
  "review_reasons",
  "auto_corrected",
]);

export async function updateExtractedRow(
  rowId: string,
  data: Partial<Pick<
    MenuExtractedRow,
    | "producer"
    | "wine_name"
    | "vintage"
    | "region"
    | "country"
    | "price_glass"
    | "price_bottle"
    | "price_other"
    | "needs_review"
    | "review_reasons"
    | "auto_corrected"
  >>
): Promise<MenuExtractedRow> {
  const sb = getSupabaseAdmin();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(data)) {
    if (UPDATE_EXTRACTED_ROW_ALLOWED_KEYS.has(k)) updates[k] = v;
  }
  const { data: out, error } = await sb
    .from("menu_extracted_rows")
    .update(updates)
    .eq("id", rowId)
    .select(MENU_EXTRACTED_ROWS_SELECT)
    .single();
  if (error) throw new Error(`updateExtractedRow: ${error.message}`);
  return out as MenuExtractedRow;
}

const MENU_EXTRACTION_FEEDBACK_SELECT =
  "id, created_at, row_id, document_id, original_prediction, corrected_payload, error_types, corrected_by, notes";

export async function createExtractionFeedback(params: {
  rowId: string;
  documentId: string;
  originalPrediction: Record<string, unknown>;
  correctedPayload: Record<string, unknown>;
  errorTypes?: string[] | null;
  correctedBy?: string | null;
  notes?: string | null;
}): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("menu_extraction_feedback").insert({
    row_id: params.rowId,
    document_id: params.documentId,
    original_prediction: params.originalPrediction,
    corrected_payload: params.correctedPayload,
    error_types: params.errorTypes ?? null,
    corrected_by: params.correctedBy ?? null,
    notes: params.notes ?? null,
  });
  if (error) throw new Error(`createExtractionFeedback: ${error.message}`);
}

/** List feedback rows for a document. TODO(menu-extraction): surface in admin UI (correction history). */
export async function getExtractionFeedbackByDocumentId(
  documentId: string
): Promise<MenuExtractionFeedback[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_extraction_feedback")
    .select(MENU_EXTRACTION_FEEDBACK_SELECT)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getExtractionFeedbackByDocumentId: ${error.message}`);
  return (data ?? []) as MenuExtractionFeedback[];
}

/** Get feedback for all documents linked to a Starwinelist slug (for few-shot per restaurant). Max 20, newest first. */
export async function getExtractionFeedbackBySlug(
  slug: string
): Promise<MenuExtractionFeedback[]> {
  const sb = getSupabaseAdmin();
  const { data: docs, error: docsError } = await sb
    .from("menu_documents")
    .select("id")
    .eq("source_slug", slug);
  if (docsError) throw new Error(`getExtractionFeedbackBySlug (docs): ${docsError.message}`);
  const documentIds = (docs ?? []).map((d: { id: string }) => d.id);
  if (documentIds.length === 0) return [];
  const { data, error } = await sb
    .from("menu_extraction_feedback")
    .select(MENU_EXTRACTION_FEEDBACK_SELECT)
    .in("document_id", documentIds)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`getExtractionFeedbackBySlug: ${error.message}`);
  return (data ?? []) as MenuExtractionFeedback[];
}

/** Get Starwinelist source that has this document as latest (by latest_document_id). */
export async function getStarwinelistSourceByDocumentId(
  documentId: string
): Promise<StarwinelistSource | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("starwinelist_sources")
    .select(STARWINELIST_SOURCES_SELECT)
    .eq("latest_document_id", documentId)
    .maybeSingle();
  if (error) throw new Error(`getStarwinelistSourceByDocumentId: ${error.message}`);
  return data as StarwinelistSource | null;
}

export async function getDocumentSectionsByDocumentId(
  documentId: string
): Promise<MenuDocumentSection[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_document_sections")
    .select(MENU_DOCUMENT_SECTIONS_SELECT)
    .eq("document_id", documentId)
    .order("section_order", { ascending: true });
  if (error) throw new Error(`getDocumentSectionsByDocumentId: ${error.message}`);
  return (data ?? []) as MenuDocumentSection[];
}

// ---------------------------------------------------------------------------
// Menu extraction batches (Anthropic Batch API)
// ---------------------------------------------------------------------------

const MENU_EXTRACTION_BATCHES_SELECT =
  "id, created_at, updated_at, anthropic_batch_id, document_ids, status, phase_1_result, error_message, processed_at";

export async function createMenuExtractionBatch(
  documentIds: string[],
  phase1Result: Record<string, { rawText: string; sectionNames: string[] }>,
  anthropicBatchId: string | null,
  status: MenuExtractionBatchStatus = "submitted"
): Promise<MenuExtractionBatch> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_extraction_batches")
    .insert({
      document_ids: documentIds,
      phase_1_result: phase1Result as unknown,
      anthropic_batch_id: anthropicBatchId,
      status,
    })
    .select(MENU_EXTRACTION_BATCHES_SELECT)
    .single();
  if (error) throw new Error(`createMenuExtractionBatch: ${error.message}`);
  return data as MenuExtractionBatch;
}

export async function getMenuExtractionBatchById(id: string): Promise<MenuExtractionBatch | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_extraction_batches")
    .select(MENU_EXTRACTION_BATCHES_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getMenuExtractionBatchById: ${error.message}`);
  return data as MenuExtractionBatch | null;
}

export async function updateMenuExtractionBatch(
  id: string,
  updates: Partial<Pick<MenuExtractionBatch, "anthropic_batch_id" | "status" | "error_message" | "processed_at">>
): Promise<MenuExtractionBatch> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_extraction_batches")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(MENU_EXTRACTION_BATCHES_SELECT)
    .single();
  if (error) throw new Error(`updateMenuExtractionBatch: ${error.message}`);
  return data as MenuExtractionBatch;
}

// ---------------------------------------------------------------------------
// Starwinelist sources
// ---------------------------------------------------------------------------

export async function upsertStarwinelistSource(
  data: Partial<StarwinelistSource> & { slug: string }
): Promise<StarwinelistSource> {
  const existing = await getStarwinelistSourceBySlug(data.slug);
  const merged = {
    slug: data.slug,
    name: data.name ?? existing?.name ?? null,
    city: data.city ?? existing?.city ?? "stockholm",
    source_url: data.source_url ?? existing?.source_url ?? `https://starwinelist.com/wine-place/${data.slug}`,
    swl_updated_at: data.swl_updated_at ?? existing?.swl_updated_at ?? null,
    swl_updated_at_parsed: data.swl_updated_at_parsed ?? existing?.swl_updated_at_parsed ?? null,
    pdf_url: data.pdf_url ?? existing?.pdf_url ?? null,
    pdf_last_seen_at: data.pdf_last_seen_at ?? existing?.pdf_last_seen_at ?? null,
    crawl_status: data.crawl_status ?? existing?.crawl_status ?? "pending",
    last_crawled_at: data.last_crawled_at ?? existing?.last_crawled_at ?? null,
    last_error: data.last_error ?? existing?.last_error ?? null,
    crawl_attempts: data.crawl_attempts ?? existing?.crawl_attempts ?? 0,
    latest_document_id: data.latest_document_id ?? existing?.latest_document_id ?? null,
  };
  if (existing?.id) {
    return updateStarwinelistSource(existing.id, merged);
  }
  const sb = getSupabaseAdmin();
  const { data: out, error } = await sb
    .from("starwinelist_sources")
    .insert(merged)
    .select(STARWINELIST_SOURCES_SELECT)
    .single();
  if (error) throw new Error(`upsertStarwinelistSource: ${error.message}`);
  return out as StarwinelistSource;
}

export async function getStarwinelistSourceBySlug(
  slug: string
): Promise<StarwinelistSource | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("starwinelist_sources")
    .select(STARWINELIST_SOURCES_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getStarwinelistSourceBySlug: ${error.message}`);
  return data as StarwinelistSource | null;
}

export async function listStarwinelistSources(
  city?: string
): Promise<StarwinelistSource[]> {
  const sb = getSupabaseAdmin();
  let q = sb.from("starwinelist_sources").select(STARWINELIST_SOURCES_SELECT).order("slug", { ascending: true });
  if (city) q = q.eq("city", city);
  const { data, error } = await q;
  if (error) throw new Error(`listStarwinelistSources: ${error.message}`);
  const list = (data ?? []) as StarwinelistSource[];
  return list.filter((s) => !isStarwinelist404Slug(s.slug));
}

export async function updateStarwinelistSource(
  id: string,
  data: Partial<StarwinelistSource>
): Promise<StarwinelistSource> {
  const sb = getSupabaseAdmin();
  const { data: out, error } = await sb
    .from("starwinelist_sources")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(STARWINELIST_SOURCES_SELECT)
    .single();
  if (error) throw new Error(`updateStarwinelistSource: ${error.message}`);
  return out as StarwinelistSource;
}

export async function listPendingCrawlSources(
  limit?: number
): Promise<StarwinelistSource[]> {
  const sb = getSupabaseAdmin();
  let q = sb
    .from("starwinelist_sources")
    .select(STARWINELIST_SOURCES_SELECT)
    .in("crawl_status", ["pending", "failed"])
    .order("last_crawled_at", { ascending: true, nullsFirst: true });
  if (limit != null && limit > 0) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw new Error(`listPendingCrawlSources: ${error.message}`);
  const list = (data ?? []) as StarwinelistSource[];
  return list.filter((s) => !isStarwinelist404Slug(s.slug));
}

// ---------------------------------------------------------------------------
// Manual run tracking (menu_manual_runs)
// ---------------------------------------------------------------------------

const MENU_MANUAL_RUNS_SELECT =
  "id, created_at, updated_at, slug, city, status, document_id, content_hash, steps, error_message, started_at, finished_at";

export async function createMenuManualRun(params: {
  slug: string;
  city?: string | null;
}): Promise<MenuManualRun> {
  const sb = getSupabaseAdmin();
  const row = {
    slug: params.slug,
    city: params.city ?? "stockholm",
    status: "pending" as ManualRunStatus,
    steps: [],
  };
  const { data, error } = await sb
    .from("menu_manual_runs")
    .insert(row)
    .select(MENU_MANUAL_RUNS_SELECT)
    .single();
  if (error) throw new Error(`createMenuManualRun: ${error.message}`);
  return data as MenuManualRun;
}

export async function getMenuManualRunById(id: string): Promise<MenuManualRun | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_manual_runs")
    .select(MENU_MANUAL_RUNS_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getMenuManualRunById: ${error.message}`);
  return data as MenuManualRun | null;
}

export async function updateMenuManualRun(
  id: string,
  updates: {
    status?: ManualRunStatus;
    document_id?: string | null;
    content_hash?: string | null;
    steps?: ManualRunStep[];
    error_message?: string | null;
    started_at?: string | null;
    finished_at?: string | null;
  }
): Promise<MenuManualRun> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("menu_manual_runs")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(MENU_MANUAL_RUNS_SELECT)
    .single();
  if (error) throw new Error(`updateMenuManualRun: ${error.message}`);
  return data as MenuManualRun;
}
