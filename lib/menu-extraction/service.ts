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

/** Max tokens for raw text extraction from PDF (single PDF call). */
const MAX_TOKENS_RAW_TEXT = 16000;
/** Max tokens for the initial "list section names" call. Small response. */
const MAX_TOKENS_SECTION_LIST = 512;
/** Default max tokens per section. Claude Sonnet 4.6 supports up to 64k; this fits ~80–100 wines per section. */
const MAX_TOKENS_PER_SECTION = 16384;
/** Retry with this if a section fails (e.g. truncated JSON). Handles very large sections (200+ wines). */
const MAX_TOKENS_PER_SECTION_RETRY = 32768;

/** User prompt for extracting raw text from PDF (no JSON, no structuring). */
const RAW_TEXT_EXTRACTION_PROMPT =
  "Returnera all text i detta dokument exakt som den är, bevarad sektion för sektion, rad för rad.\nIngen analys, ingen JSON, ingen strukturering.\nBara texten, med sektionsrubriker bevarade.";

/**
 * Isolated AI call – easy to swap provider later.
 * TODO(menu-extraction): If credentials or model need manual config (e.g. env var name), wire here.
 */

type MessageContent = { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } } | { type: "text"; text: string };

function makePdfContent(base64Pdf: string, text: string): MessageContent[] {
  return [
    { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64Pdf } },
    { type: "text" as const, text },
  ];
}

function makeTextContent(text: string): MessageContent[] {
  return [{ type: "text" as const, text }];
}

/** Token usage from a single API call (when available from stream). */
export interface ExtractionUsage {
  input_tokens: number;
  output_tokens: number;
}

async function runStreamingCall(
  client: Anthropic,
  content: MessageContent[],
  maxTokens: number,
  systemPrompt: string
): Promise<{ text: string; usage: ExtractionUsage | null }> {
  const hasDocument = content.some((block) => block.type === "document");
  const stream = await client.beta.messages.create({
    model: MODEL_ID,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content }],
    ...(hasDocument ? { betas: ["pdfs-2024-09-25"] as const } : {}),
    stream: true,
  });
  let text = "";
  let usage: ExtractionUsage | null = null;
  for await (const event of stream as AsyncIterable<{
    type: string;
    delta?: { type?: string; text?: string };
    usage?: { input_tokens?: number; output_tokens?: number };
  }>) {
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && typeof event.delta.text === "string") {
      text += event.delta.text;
    }
    if ((event.type === "message_start" || event.type === "message_delta") && event.usage) {
      const u = event.usage;
      usage = {
        input_tokens: u.input_tokens ?? usage?.input_tokens ?? 0,
        output_tokens: u.output_tokens ?? usage?.output_tokens ?? 0,
      };
    }
  }
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  return { text: trimmed, usage };
}

/**
 * Steg 1 – ett PDF-anrop: extrahera hela menyn som ren text (sparas som raw_text).
 */
async function extractRawTextFromPdf(pdfBuffer: Buffer): Promise<{ rawText: string; usage: ExtractionUsage | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey });
  const base64Pdf = pdfBuffer.toString("base64");
  const content = makePdfContent(base64Pdf, RAW_TEXT_EXTRACTION_PROMPT);
  const { text, usage } = await runStreamingCall(client, content, MAX_TOKENS_RAW_TEXT, MENU_EXTRACTION_SYSTEM_PROMPT);
  return { rawText: text, usage };
}

/**
 * Klipp ut texten för en sektion från rawText: från sektionsnamnet till nästa sektion (eller slutet).
 * Case-insensitive sökning. Om sektionen inte hittas returneras hela rawText som fallback.
 */
function extractSectionText(rawText: string, sectionName: string, nextSectionName?: string): string {
  const lower = rawText.toLowerCase();
  const sectionLower = sectionName.toLowerCase();
  const startIdx = lower.indexOf(sectionLower);
  if (startIdx === -1) return rawText;
  if (nextSectionName === undefined || nextSectionName === "") return rawText.slice(startIdx);
  const nextLower = nextSectionName.toLowerCase();
  const endIdx = lower.indexOf(nextLower, startIdx + 1);
  if (endIdx === -1) return rawText.slice(startIdx);
  return rawText.slice(startIdx, endIdx);
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

/** Steg 2 – hämta sektionsnamn från raw text (text-input, ingen PDF). */
async function extractSections(rawText: string): Promise<{ sectionNames: string[]; usage: ExtractionUsage | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey });
  const prompt =
    "Lista BARA sektionsnamnen i denna vinmeny, en per rad.\nReturnera endast en JSON-array med strängarna.\nExempel: [\"Champagne\", \"Vitt vin\", \"Rött vin\"]\nIngen annan text.\n\nMenyn (text):\n" +
    rawText;
  const content = makeTextContent(prompt);
  const { text: raw, usage } = await runStreamingCall(client, content, MAX_TOKENS_SECTION_LIST, MENU_EXTRACTION_SYSTEM_PROMPT);
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((x): x is string => typeof x === "string")) {
    throw new Error("extractSections: expected JSON array of strings");
  }
  return { sectionNames: parsed, usage };
}

/** Steg 3 – extrahera en sektion från raw text (endast relevant text skickas). maxTokens override för retry. */
async function extractSection(
  rawText: string,
  sectionName: string,
  nextSectionName: string | undefined,
  maxTokens: number = MAX_TOKENS_PER_SECTION
): Promise<{ result: AIExtractionResult; usage: ExtractionUsage | null }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey });
  const sectionText = extractSectionText(rawText, sectionName, nextSectionName);
  const prompt =
    `Extrahera ENDAST sektionen '${sectionName.replace(/'/g, "\\'")}' från följande text.\nReturnera JSON i exakt detta format utan någon text före eller efter:\n{ "sections": [{ "section_name", "normalized_section", "rows": [...] }] }\n\nText för sektionen:\n` +
    sectionText;
  const content = makeTextContent(prompt);
  const { text: raw, usage } = await runStreamingCall(client, content, maxTokens, MENU_EXTRACTION_SYSTEM_PROMPT);
  const repaired = repairTruncatedJson(raw);
  if (repaired !== raw) {
    console.warn("[extraction] JSON was truncated – attempted repair for section:", sectionName);
  }
  const json = JSON.parse(repaired) as unknown;
  const parsed = aiExtractionResultSchema.safeParse(json);
  if (!parsed.success) throw new Error(`extractSection(${sectionName}): ${parsed.error.message}`);
  return { result: parsed.data as AIExtractionResult, usage };
}

/**
 * Alternativ B: PDF en gång (→ raw text), sedan alla anrop på text. Sparar raw_text på dokumentet.
 */
export async function callMenuExtractionModel(
  pdfBuffer: Buffer,
  documentId: string
): Promise<AIExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const { rawText, usage: rawTextUsage } = await extractRawTextFromPdf(pdfBuffer);
  await updateMenuDocument(documentId, { raw_text: rawText });

  const { sectionNames, usage: sectionsListUsage } = await extractSections(rawText);
  console.warn("[extraction] Found", sectionNames.length, "sections:", sectionNames);

  const limit = pLimit(CONCURRENCY);
  const total = sectionNames.length;
  const allUsages: ExtractionUsage[] = [];
  if (rawTextUsage) allUsages.push(rawTextUsage);
  if (sectionsListUsage) allUsages.push(sectionsListUsage);

  const results: AIExtractionResult[] = await Promise.all(
    sectionNames.map((name, index) =>
      limit(async (): Promise<AIExtractionResult> => {
        const nextSectionName = sectionNames[index + 1];
        console.warn("[extraction] Extracting section:", name, `(${index + 1}/${total})`);
        try {
          const { result, usage: sectionUsage } = await extractSection(rawText, name, nextSectionName);
          if (sectionUsage) allUsages.push(sectionUsage);
          console.warn("[extraction] Completed section:", name);
          return result;
        } catch (firstErr) {
          console.warn("[extraction] Section failed, retrying with higher max_tokens:", name, firstErr instanceof Error ? firstErr.message : String(firstErr));
          try {
            const { result, usage: sectionUsage } = await extractSection(rawText, name, nextSectionName, MAX_TOKENS_PER_SECTION_RETRY);
            if (sectionUsage) allUsages.push(sectionUsage);
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

  const totalInput = allUsages.reduce((sum, u) => sum + u.input_tokens, 0);
  const totalOutput = allUsages.reduce((sum, u) => sum + u.output_tokens, 0);
  if (totalInput > 0 || totalOutput > 0) {
    console.warn("[extraction] Token usage for this document – input_tokens:", totalInput, "output_tokens:", totalOutput, "total:", totalInput + totalOutput);
  }

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
    const result = await callMenuExtractionModel(pdfBuffer, documentId);
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
