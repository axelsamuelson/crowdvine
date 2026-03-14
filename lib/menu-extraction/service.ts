/**
 * Menu extraction service – AI call, orchestration, mapping to DB rows.
 * AI is never source of truth; normalization and validation applied here.
 */

import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import {
  getMenuDocumentById,
  updateMenuDocument,
  saveMenuExtractionResult,
  type MenuExtractedRowForInsert,
} from "./db";
import { getPdfBufferFromStorage } from "./storage";
import { MENU_EXTRACTION_SYSTEM_PROMPT, MENU_EXTRACTION_PROMPT_VERSION } from "./prompts";
import {
  getReviewReasons,
  computeConfidence,
  computeConfidenceLabel,
  validateExtractedRow,
  needsReview,
} from "./validation";
import {
  normalizeWineType,
  normalizeSectionName,
  normalizeCountry,
  normalizeAttributes,
  normalizeVintage,
  normalizeCurrency,
} from "./normalization";
import { aiExtractionResultSchema } from "./schema";
import type { AIExtractionResult, AIExtractedRow } from "./types";

const WORKFLOW_VERSION = "1.0.0";
const MODEL_ID = "claude-sonnet-4-6";
const CONCURRENCY = 3;

/*
 * Extraction pipeline analysis (truncated JSON / large menus):
 * - Claude Sonnet 4.6 supports up to 64k output tokens; the bottleneck was our per-section max_tokens (8192).
 * - Two-step extraction (sections list → one section at a time) is the right approach: it bounds response size
 *   per call and allows parallel work. Alternative (single huge response) would hit truncation on 200+ wine menus.
 * - JSON repair is a symptom treatment: we keep it as last resort before parse, but the real fix is higher
 *   max_tokens per section + retry with even higher limit + fallback to empty section so the pipeline never crashes.
 * - Self-healing: per-section retry with MAX_TOKENS_PER_SECTION_RETRY; if still failing, save section with
 *   empty rows so the rest of the menu is persisted and we never return invalid JSON.
 */

/** Max tokens for the initial "list section names" call. Small response. */
const MAX_TOKENS_SECTION_LIST = 512;
/** Default max tokens per section. Claude Sonnet 4.6 supports up to 64k; this fits ~80–100 wines per section. */
const MAX_TOKENS_PER_SECTION = 16384;
/** Retry with this if a section fails (e.g. truncated JSON). Handles very large sections (200+ wines). */
const MAX_TOKENS_PER_SECTION_RETRY = 32768;

/**
 * Isolated AI call – easy to swap provider later.
 * TODO(menu-extraction): If credentials or model need manual config (e.g. env var name), wire here.
 */

function makePdfContent(base64Pdf: string, text: string): { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }[] | ({ type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } } | { type: "text"; text: string })[] {
  return [
    { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64Pdf } },
    { type: "text" as const, text },
  ];
}

async function runStreamingCall(
  client: Anthropic,
  content: { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }[] | ({ type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } } | { type: "text"; text: string })[],
  maxTokens: number,
  systemPrompt: string
): Promise<string> {
  const stream = await client.beta.messages.create({
    model: MODEL_ID,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content }],
    betas: ["pdfs-2024-09-25"],
    stream: true,
  });
  let text = "";
  for await (const event of stream as AsyncIterable<{ type: string; delta?: { type?: string; text?: string } }>) {
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && typeof event.delta.text === "string") {
      text += event.delta.text;
    }
  }
  return text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
}

/** Försök reparera trunkerad JSON innan parse */
function repairTruncatedJson(raw: string): string {
  let text = raw.trim();

  text = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");

  if (!text.endsWith("}")) {
    const openBraces = (text.match(/{/g) || []).length;
    const closeBraces = (text.match(/}/g) || []).length;
    const openBrackets = (text.match(/\[/g) || []).length;
    const closeBrackets = (text.match(/\]/g) || []).length;

    const lastNewline = text.lastIndexOf("\n");
    if (lastNewline > text.length - 200) {
      text = text.substring(0, lastNewline);
    }

    for (let i = 0; i < openBrackets - closeBrackets; i++) text += "]";
    for (let i = 0; i < openBraces - closeBraces; i++) text += "}";
  }

  return text;
}

/** Steg 1 – hämta sektionsnamn från PDF. */
async function extractSections(pdfBuffer: Buffer): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey });
  const base64Pdf = pdfBuffer.toString("base64");
  const prompt =
    "Lista BARA sektionsnamnen i denna vinmeny, en per rad.\nReturnera endast en JSON-array med strängarna.\nExempel: [\"Champagne\", \"Vitt vin\", \"Rött vin\"]\nIngen annan text.";
  const content = makePdfContent(base64Pdf, prompt);
  const raw = await runStreamingCall(client, content, MAX_TOKENS_SECTION_LIST, MENU_EXTRACTION_SYSTEM_PROMPT);
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((x): x is string => typeof x === "string")) {
    throw new Error("extractSections: expected JSON array of strings");
  }
  return parsed;
}

/** Steg 2 – extrahera en sektion. Returnerar AIExtractionResult med en sektion. maxTokens override för retry. */
async function extractSection(
  pdfBuffer: Buffer,
  sectionName: string,
  maxTokens: number = MAX_TOKENS_PER_SECTION
): Promise<AIExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey });
  const base64Pdf = pdfBuffer.toString("base64");
  const prompt = `Extrahera ENDAST sektionen '${sectionName.replace(/'/g, "\\'")}' från denna vinmeny.\nReturnera JSON i exakt detta format utan någon text före eller efter:\n{ "sections": [{ "section_name", "normalized_section", "rows": [...] }] }`;
  const content = makePdfContent(base64Pdf, prompt);
  const raw = await runStreamingCall(client, content, maxTokens, MENU_EXTRACTION_SYSTEM_PROMPT);
  const repaired = repairTruncatedJson(raw);
  if (repaired !== raw) {
    console.warn("[extraction] JSON was truncated – attempted repair for section:", sectionName);
  }
  const json = JSON.parse(repaired) as unknown;
  const parsed = aiExtractionResultSchema.safeParse(json);
  if (!parsed.success) throw new Error(`extractSection(${sectionName}): ${parsed.error.message}`);
  return parsed.data as AIExtractionResult;
}

/**
 * Call Claude with PDF as document block. Two-step: sections list → one section at a time (parallel, max 3).
 */
export async function callMenuExtractionModel(
  pdfBuffer: Buffer
): Promise<AIExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const sectionNames = await extractSections(pdfBuffer);
  console.warn("[extraction] Found", sectionNames.length, "sections:", sectionNames);

  const limit = pLimit(CONCURRENCY);
  const total = sectionNames.length;

  const results: AIExtractionResult[] = await Promise.all(
    sectionNames.map((name, index) =>
      limit(async (): Promise<AIExtractionResult> => {
        console.warn("[extraction] Extracting section:", name, `(${index + 1}/${total})`);
        try {
          const result = await extractSection(pdfBuffer, name);
          console.warn("[extraction] Completed section:", name);
          return result;
        } catch (firstErr) {
          console.warn("[extraction] Section failed, retrying with higher max_tokens:", name, firstErr instanceof Error ? firstErr.message : String(firstErr));
          try {
            const result = await extractSection(pdfBuffer, name, MAX_TOKENS_PER_SECTION_RETRY);
            console.warn("[extraction] Completed section (retry):", name);
            return result;
          } catch (retryErr) {
            console.warn("[extraction] Section failed after retry – saving as empty section:", name, retryErr instanceof Error ? retryErr.message : String(retryErr));
            return {
              sections: [{ section_name: name, normalized_section: name, rows: [] }],
            };
          }
        }
      })
    )
  );

  const merged: AIExtractionResult = {
    sections: results.flatMap((r) => r.sections),
  };
  return merged;
}

/**
 * Maps AI output to DB row payloads with normalization and validation applied.
 * sectionMap: section_name → section_id (can be empty; then section_order is section index).
 */
export function mapAIResultToRows(
  documentId: string,
  result: AIExtractionResult,
  sectionMap: Record<string, string>
): MenuExtractedRowForInsert[] {
  const out: MenuExtractedRowForInsert[] = [];
  let globalRowIndex = 0;
  for (let si = 0; si < result.sections.length; si++) {
    const section = result.sections[si];
    const sectionId = sectionMap[section.section_name] ?? null;
    const sectionOrder = si;
    for (const aiRow of section.rows) {
      const normalized = applyNormalization(aiRow);
      const confidence = computeConfidence(normalized);
      const confidenceLabel = computeConfidenceLabel(confidence);
      const reviewReasons = getReviewReasons(normalized);
      const { flags } = validateExtractedRow(normalized);
      const needsReviewFlag = needsReview(normalized, confidenceLabel);
      out.push({
        document_id: documentId,
        section_id: sectionId,
        row_index: globalRowIndex,
        page_number: null,
        raw_text: normalized.raw_text,
        row_type: normalized.row_type,
        wine_type: normalized.wine_type,
        producer: normalized.producer,
        wine_name: normalized.wine_name,
        vintage: normalized.vintage,
        region: normalized.region,
        country: normalized.country,
        grapes: normalized.grapes?.length ? normalized.grapes : null,
        attributes: normalized.attributes?.length ? normalized.attributes : null,
        format_label: normalized.format_label,
        price_glass: normalized.price_glass,
        price_bottle: normalized.price_bottle,
        price_other: normalized.price_other,
        currency: normalized.currency,
        confidence,
        confidence_label: confidenceLabel,
        needs_review: needsReviewFlag,
        review_reasons: reviewReasons.length ? reviewReasons : null,
        normalized_payload: null,
        validation_flags: Object.keys(flags).length ? flags : null,
        extraction_version: WORKFLOW_VERSION,
        section_order: sectionOrder,
      });
      globalRowIndex++;
    }
  }
  return out;
}

function applyNormalization(row: AIExtractedRow): AIExtractedRow {
  return {
    ...row,
    wine_type: row.wine_type ?? normalizeWineType(row.raw_text),
    country: normalizeCountry(row.country) ?? row.country,
    attributes: normalizeAttributes(row.attributes ?? []),
    vintage: normalizeVintage(row.vintage) ?? row.vintage,
    currency: normalizeCurrency(row.currency),
  };
}

/**
 * Main entry – load document, get PDF from storage, run extraction (Claude reads PDF directly), save via db.
 * raw_text is no longer required; PDF is sent to Claude as document block.
 */
export async function extractMenuFromDocument(documentId: string): Promise<void> {
  const doc = await getMenuDocumentById(documentId);
  if (!doc) {
    throw new Error(`Menu document not found: ${documentId}`);
  }
  const filePath = doc.file_path?.trim();
  if (!filePath) {
    throw new Error("Document has no file_path; cannot load PDF from storage");
  }
  const pdfBuffer = await getPdfBufferFromStorage(filePath);
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error(`Could not download PDF from storage: ${filePath}`);
  }
  await updateMenuDocument(documentId, { extraction_status: "processing", raw_text: null });
  try {
    const result = await callMenuExtractionModel(pdfBuffer);
    const normalizedRows = mapAIResultToRows(documentId, result, {});
    await saveMenuExtractionResult({
      documentId,
      aiRawResponse: result,
      meta: {
        modelVersion: MODEL_ID,
        promptVersion: MENU_EXTRACTION_PROMPT_VERSION,
        workflowVersion: WORKFLOW_VERSION,
      },
      normalizedRows,
    });
    await updateMenuDocument(documentId, {
      extraction_status: "completed",
      extracted_at: new Date().toISOString(),
      error_message: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateMenuDocument(documentId, {
      extraction_status: "failed",
      error_message: message,
    });
    throw err;
  }
}
