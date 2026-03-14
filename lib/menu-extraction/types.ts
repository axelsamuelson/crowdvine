/**
 * Types for menu extraction (lib/menu-extraction).
 * Isolated ingestion domain – does not reference wines tables.
 * AI is never source of truth; system controls what is stored.
 * TODO(menu-extraction): Add Insert/Update helper types if needed for stricter create/update APIs.
 */

export type ExtractionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type UploadStatus = "uploaded" | "processing" | "failed";

export type RowType =
  | "wine_row"
  | "header"
  | "description"
  | "noise"
  | "unknown";

export type WineType =
  | "sparkling"
  | "white"
  | "orange"
  | "rose"
  | "red"
  | "sweet"
  | "fortified"
  | "non_alcoholic"
  | "unknown";

export type ConfidenceLabel = "high" | "medium" | "low";

export type ReviewReason =
  | "missing_price"
  | "missing_wine_name"
  | "missing_producer"
  | "unknown_country"
  | "grapes_inferred"
  | "suspicious_vintage"
  | "multiple_price_formats"
  | "low_confidence"
  | "likely_non_wine_row"
  | "ambiguous_format"
  | "region_country_mismatch"
  | "missing_region";

// ---------------------------------------------------------------------------
// DB entities (mirror tables)
// ---------------------------------------------------------------------------

export interface MenuDocument {
  id: string;
  created_at?: string;
  updated_at?: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  source_type: string;
  upload_status: UploadStatus;
  extraction_status: ExtractionStatus;
  page_count: number | null;
  raw_text: string | null;
  ai_raw_response: unknown | null;
  model_version: string | null;
  prompt_version: string | null;
  workflow_version: string | null;
  extracted_at: string | null;
  error_message: string | null;
  content_hash: string | null;
  source_slug: string | null;
}

export interface MenuDocumentSection {
  id: string;
  created_at?: string;
  document_id: string;
  section_name: string;
  normalized_section: string | null;
  page_number: number | null;
  section_order: number;
}

export interface MenuExtractedRow {
  id: string;
  created_at?: string;
  updated_at?: string;
  document_id: string;
  section_id: string | null;
  row_index: number;
  page_number: number | null;
  raw_text: string;
  row_type: RowType;
  wine_type: WineType | null;
  producer: string | null;
  wine_name: string | null;
  vintage: string | null;
  region: string | null;
  country: string | null;
  grapes: string[] | null;
  attributes: string[] | null;
  format_label: string | null;
  price_glass: number | null;
  price_bottle: number | null;
  price_other: number | null;
  currency: string;
  confidence: number | null;
  confidence_label: ConfidenceLabel | null;
  needs_review: boolean;
  review_reasons: ReviewReason[] | null;
  normalized_payload: Record<string, unknown> | null;
  validation_flags: Record<string, unknown> | null;
  extraction_version: string | null;
}

export interface MenuExtractionFeedback {
  id: string;
  created_at?: string;
  row_id: string;
  document_id: string;
  original_prediction: Record<string, unknown>;
  corrected_payload: Record<string, unknown>;
  error_types: string[] | null;
  corrected_by: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Create/update inputs
// ---------------------------------------------------------------------------

export interface CreateMenuDocumentInput {
  file_path: string;
  file_name: string;
  mime_type?: string;
  source_type?: string;
  upload_status?: UploadStatus;
  extraction_status?: ExtractionStatus;
  page_count?: number | null;
  raw_text?: string | null;
  ai_raw_response?: unknown | null;
  model_version?: string | null;
  prompt_version?: string | null;
  workflow_version?: string | null;
  extracted_at?: string | null;
  error_message?: string | null;
  content_hash?: string | null;
  source_slug?: string | null;
}

// ---------------------------------------------------------------------------
// AI output contract (exact shape from extraction prompt)
// ---------------------------------------------------------------------------

export interface AIExtractedRow {
  raw_text: string;
  row_type: RowType;
  wine_type: WineType | null;
  producer: string | null;
  wine_name: string | null;
  vintage: string | null;
  region: string | null;
  country: string | null;
  /** Empty array [] if not explicit in text – never infer. */
  grapes: string[];
  /** Exact as in menu, e.g. ["NATURVIN", "EKO"] */
  attributes: string[];
  format_label: string | null;
  price_glass: number | null;
  price_bottle: number | null;
  price_other: number | null;
  currency: string;
  confidence: number;
  review_reasons: (ReviewReason | string)[];
}

export interface AISectionBlock {
  section_name: string;
  normalized_section: string;
  rows: AIExtractedRow[];
}

export interface AIExtractionResult {
  sections: AISectionBlock[];
}

// ---------------------------------------------------------------------------
// Starwinelist crawler
// ---------------------------------------------------------------------------

export type CrawlStatus =
  | "pending"
  | "crawling"
  | "completed"
  | "failed"
  | "skipped"
  | "partial";

export interface StarwinelistSource {
  id: string;
  created_at?: string;
  updated_at?: string;
  slug: string;
  name: string | null;
  city: string;
  source_url: string;
  swl_updated_at: string | null;
  swl_updated_at_parsed: string | null;
  pdf_url: string | null;
  pdf_last_seen_at: string | null;
  crawl_status: CrawlStatus;
  last_crawled_at: string | null;
  last_error: string | null;
  crawl_attempts: number;
  latest_document_id: string | null;
}

export interface CrawlResult {
  slug: string;
  name: string | null;
  pdf_url: string | null;
  swl_updated_at: string | null;
  skipped: boolean;
  skip_reason?: string;
  error?: string;
  document_id?: string;
  /** True when restaurant page was fetched but PDF download failed (URL saved for retry). */
  partial?: boolean;
  /** True when failure was due to Browserless 429 rate limit. */
  rate_limit_429?: boolean;
  /** True when AI extraction completed successfully for this document. */
  extracted?: boolean;
  /** Reason extraction was skipped (e.g. scanned PDF, no raw text, or extraction error). */
  extraction_skipped_reason?: "scanned_pdf" | "no_raw_text" | "extraction_error";
}

export interface CrawlSessionSummary {
  total_found: number;
  new_pdfs: number;
  updated_pdfs: number;
  skipped: number;
  failed: number;
  /** Count of sources where page was fetched but PDF download failed (status partial). */
  partial?: number;
  /** True if any request failed with Browserless 429. */
  rate_limit_429?: boolean;
  document_ids: string[];
  /** Count of documents where AI extraction completed successfully. */
  extracted?: number;
  /** Count of documents where extraction was attempted but failed. */
  extraction_failed?: number;
}

// ---------------------------------------------------------------------------
// Manual run tracking (Golden Path diagnostics)
// ---------------------------------------------------------------------------

export type ManualRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "unchanged";

export interface ManualRunStep {
  name: string;
  started_at: string;
  finished_at: string;
  ok: boolean;
  summary?: Record<string, unknown>;
  error?: string;
}

export interface MenuManualRun {
  id: string;
  created_at?: string;
  updated_at?: string;
  slug: string;
  city: string | null;
  status: ManualRunStatus;
  document_id: string | null;
  content_hash: string | null;
  steps: ManualRunStep[];
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
}
