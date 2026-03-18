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
  getStarwinelistSourceByDocumentId,
  type MenuExtractedRowForInsert,
} from "./db";
import { runAutoCorrection } from "./auto-correction";
import { getPdfBufferFromStorage } from "./storage";
import {
  MENU_EXTRACTION_SYSTEM_PROMPT,
  MENU_EXTRACTION_SYSTEM_PROMPT_CACHE_PADDING,
  MENU_EXTRACTION_PROMPT_VERSION,
} from "./prompts";
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
/** Override with MENU_EXTRACTION_MODEL (e.g. claude-haiku-4-5) for cost optimization. Exported for batch API. */
export const MODEL_ID = process.env.MENU_EXTRACTION_MODEL || "claude-sonnet-4-6";
const CONCURRENCY = 3;

/** System blocks with cache_control on last block (≥2048 tokens total for Sonnet 4.6 cache). Exported for batch API. */
export function getSystemBlocksForExtraction(): Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> {
  return [
    { type: "text" as const, text: MENU_EXTRACTION_SYSTEM_PROMPT },
    {
      type: "text" as const,
      text: MENU_EXTRACTION_SYSTEM_PROMPT_CACHE_PADDING,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

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
const MAX_TOKENS_SECTION_LIST = 1024;
/** Default max tokens per section. Claude Sonnet 4.6 supports up to 64k; this fits ~80–100 wines per section. Exported for batch API. */
export const MAX_TOKENS_PER_SECTION = 16384;
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

/** Token usage from a single API call (when available from stream). Includes cache when using prompt caching. */
export interface ExtractionUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

type StreamUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};

async function runStreamingCall(
  client: Anthropic,
  content: MessageContent[],
  maxTokens: number,
  systemPromptOrBlocks: string | Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }>
): Promise<{ text: string; usage: ExtractionUsage | null }> {
  const hasDocument = content.some((block) => block.type === "document");
  const systemBlocks = Array.isArray(systemPromptOrBlocks) ? systemPromptOrBlocks : null;
  const systemString = Array.isArray(systemPromptOrBlocks)
    ? systemPromptOrBlocks.map((b) => b.text).join("\n\n")
    : systemPromptOrBlocks;

  const createParams = {
    model: MODEL_ID,
    max_tokens: maxTokens,
    messages: [{ role: "user" as const, content }] as const,
    stream: true as const,
  };

  const stream = hasDocument
    ? await (client as unknown as { beta: { messages: { create: (p: unknown) => AsyncIterable<unknown> } } }).beta.messages.create({
        ...createParams,
        system: systemString,
        betas: ["pdfs-2024-09-25"] as const,
      })
    : await (client as unknown as { messages: { create: (p: unknown) => AsyncIterable<unknown> } }).messages.create({
        ...createParams,
        system: systemBlocks ?? systemString,
      });

  let text = "";
  let usage: ExtractionUsage | null = null;
  for await (const event of stream as AsyncIterable<{
    type: string;
    delta?: { type?: string; text?: string };
    usage?: StreamUsage;
  }>) {
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && typeof event.delta.text === "string") {
      text += event.delta.text;
    }
    if ((event.type === "message_start" || event.type === "message_delta") && event.usage) {
      const u = event.usage;
      usage = {
        input_tokens: u.input_tokens ?? usage?.input_tokens ?? 0,
        output_tokens: u.output_tokens ?? usage?.output_tokens ?? 0,
        cache_read_input_tokens: u.cache_read_input_tokens ?? usage?.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: u.cache_creation_input_tokens ?? usage?.cache_creation_input_tokens ?? 0,
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
  const { text, usage } = await runStreamingCall(client, content, MAX_TOKENS_RAW_TEXT, getSystemBlocksForExtraction());
  return { rawText: text, usage };
}

/**
 * Klipp ut texten för en sektion från rawText: från sektionsnamnet till nästa sektion (eller slutet).
 * Case-insensitive sökning. Om sektionen inte hittas returneras hela rawText som fallback. Exported for batch API.
 */
export function extractSectionText(rawText: string, sectionName: string, nextSectionName?: string): string {
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

/** Försök reparera trunkerad JSON innan parse. Exported for batch API. */
export function repairTruncatedJson(raw: string): string {
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

/** Repair truncated JSON array of strings (e.g. section list). Closes open string and brackets. */
function repairTruncatedSectionList(raw: string): string {
  let text = raw.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!text.startsWith("[")) return text;

  // If model mixed in an object (e.g. { "section": "..." }) we get "Expected double-quoted property name".
  // Truncate before the first unquoted { and close the array.
  const firstBrace = text.indexOf("{");
  if (firstBrace > 0) {
    const prefix = text.slice(0, firstBrace).trimEnd();
    let candidate: string | null = null;
    if (prefix.endsWith('",') || prefix.endsWith('", ')) {
      candidate = prefix.replace(/,\s*$/, "") + '"]';
    } else if (prefix.endsWith('"')) {
      candidate = prefix + "]";
    } else {
      const lastComplete = prefix.lastIndexOf('", "');
      if (lastComplete >= 1) candidate = prefix.slice(0, lastComplete + 1) + "]";
    }
    if (candidate) {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) return candidate;
      } catch {
        // fall through to normal repair
      }
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      JSON.parse(text);
      return text;
    } catch {
      // Truncated: either last string cut ("...Rö) or model wrote ] without closing " ("...vin]).
      if (text.endsWith("]") && !text.endsWith('"]')) {
        text = text.slice(0, -1) + '"]';
      } else if (text.endsWith('"')) {
        text += "]";
      } else if (!text.endsWith("]")) {
        text += '"]';
      }
      const openBrackets = (text.match(/\[/g) || []).length;
      const closeBrackets = (text.match(/\]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) text += "]";
    }
  }

  // Last resort: truncate to last complete element.
  const lastCommaQuote = text.lastIndexOf('", "');
  if (lastCommaQuote > 1) {
    const candidate = text.slice(0, lastCommaQuote + 1) + "]";
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // try first element only
    }
  }
  const firstClose = text.indexOf('"', 1);
  if (firstClose > 0) {
    const candidate = text.slice(0, firstClose + 1) + "]";
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // ignore
    }
  }
  // Ultimate fallback: empty array so extraction can continue (no sections)
  return "[]";
}

/** Extrahera sektionsnamn lokalt från raw text (inga API-anrop). */
function extractSectionsFromText(rawText: string): string[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];
  const MAX_SECTION_LEN = 60;
  const PRICE_KR = /\d+\s*kr/i;
  const LARGE_NUMBER = /\b[1-9]\d{2,}\b/;
  const VINTAGE = /20\d{2}/;
  for (const line of lines) {
    if (line.length >= MAX_SECTION_LEN) continue;
    if (PRICE_KR.test(line) || LARGE_NUMBER.test(line)) continue;
    if (VINTAGE.test(line)) continue;
    const isAllCaps = line.length > 0 && line === line.toUpperCase();
    const isTitleCase = line.length > 0 && line[0] === line[0].toUpperCase();
    if (!isAllCaps && !isTitleCase) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }
  return result;
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
  const { text: raw, usage } = await runStreamingCall(client, content, maxTokens, getSystemBlocksForExtraction());
  const repaired = repairTruncatedJson(raw);
  if (repaired !== raw) {
    console.warn("[extraction] JSON was truncated – attempted repair for section:", sectionName);
  }
  let json: unknown;
  try {
    json = JSON.parse(repaired) as unknown;
  } catch (parseErr) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    throw new Error(`extractSection(${sectionName}): JSON parse failed – ${msg}`);
  }
  const parsed = aiExtractionResultSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const detail = issues.formErrors?.length
      ? issues.formErrors.join("; ")
      : Object.entries(issues.fieldErrors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("; ");
    throw new Error(`extractSection(${sectionName}): schema validation failed – ${detail}`);
  }
  const result = parsed.data as AIExtractionResult;
  if (result.sections.length === 0 || result.sections[0].rows.length === 0) {
    console.warn("[extraction] Section parsed but empty:", sectionName, "– check prompt or model output");
  }
  return { result, usage };
}

/**
 * Same as extractSection but with a custom system prompt (e.g. with few-shot for auto-correction).
 * Exported for auto-correction.ts; does not use prompt caching.
 */
export async function extractSectionWithSystemPrompt(
  rawText: string,
  sectionName: string,
  nextSectionName: string | undefined,
  systemPrompt: string,
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
  const { text: raw, usage } = await runStreamingCall(client, content, maxTokens, systemPrompt);
  const repaired = repairTruncatedJson(raw);
  if (repaired !== raw) {
    console.warn("[extraction] JSON was truncated – attempted repair for section:", sectionName);
  }
  let json: unknown;
  try {
    json = JSON.parse(repaired) as unknown;
  } catch (parseErr) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    throw new Error(`extractSectionWithSystemPrompt(${sectionName}): JSON parse failed – ${msg}`);
  }
  const parsed = aiExtractionResultSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    const detail = issues.formErrors?.length
      ? issues.formErrors.join("; ")
      : Object.entries(issues.fieldErrors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("; ");
    throw new Error(`extractSectionWithSystemPrompt(${sectionName}): schema validation failed – ${detail}`);
  }
  const result = parsed.data as AIExtractionResult;
  if (result.sections.length === 0 || result.sections[0].rows.length === 0) {
    console.warn("[extraction] Section parsed but empty:", sectionName, "– check prompt or model output");
  }
  return { result, usage };
}

/**
 * Alternativ B: PDF en gång (→ raw text), sedan alla anrop på text. Sparar raw_text på dokumentet.
 * Returns result and aggregated usage (including cache) for cost monitoring.
 */
export async function callMenuExtractionModel(
  pdfBuffer: Buffer,
  documentId: string
): Promise<{ result: AIExtractionResult; usage: ExtractionUsage }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const { rawText, usage: rawTextUsage } = await extractRawTextFromPdf(pdfBuffer);
  await updateMenuDocument(documentId, { raw_text: rawText });

  const sectionNames = extractSectionsFromText(rawText);
  console.warn("[extraction] Found", sectionNames.length, "sections from raw text:", sectionNames);

  const limit = pLimit(CONCURRENCY);
  const total = sectionNames.length;
  const allUsages: ExtractionUsage[] = [];
  if (rawTextUsage) allUsages.push(rawTextUsage);

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
            const errMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
            console.warn("[extraction] Section failed after retry – saving as empty section:", name, "| reason:", errMsg);
            return {
              sections: [{ section_name: name, normalized_section: name, rows: [] }],
            };
          }
        }
      })
    )
  );

  const aggregated: ExtractionUsage = {
    input_tokens: allUsages.reduce((sum, u) => sum + u.input_tokens, 0),
    output_tokens: allUsages.reduce((sum, u) => sum + u.output_tokens, 0),
    cache_read_input_tokens: allUsages.reduce((sum, u) => sum + (u.cache_read_input_tokens ?? 0), 0),
    cache_creation_input_tokens: allUsages.reduce((sum, u) => sum + (u.cache_creation_input_tokens ?? 0), 0),
  };
  if (aggregated.input_tokens > 0 || aggregated.output_tokens > 0) {
    console.warn(
      "[extraction] Token usage – input:",
      aggregated.input_tokens,
      "output:",
      aggregated.output_tokens,
      "cache_read:",
      aggregated.cache_read_input_tokens ?? 0,
      "cache_creation:",
      aggregated.cache_creation_input_tokens ?? 0
    );
  }

  const merged: AIExtractionResult = {
    sections: results.flatMap((r) => r.sections),
  };
  return { result: merged, usage: aggregated };
}

/**
 * Phase 1 for batch extraction: PDF → raw text and section names per document.
 * Updates raw_text on each document. Returns map used to build batch requests and reassemble results.
 */
export async function runPhase1ForBatch(
  documentIds: string[]
): Promise<Record<string, { rawText: string; sectionNames: string[] }>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  for (const documentId of documentIds) {
    await updateMenuDocument(documentId, { extraction_status: "processing", raw_text: null });
  }
  const out: Record<string, { rawText: string; sectionNames: string[] }> = {};
  for (const documentId of documentIds) {
    const doc = await getMenuDocumentById(documentId);
    if (!doc) throw new Error(`Menu document not found: ${documentId}`);
    const filePath = doc.file_path?.trim();
    if (!filePath) throw new Error(`Document ${documentId} has no file_path`);
    const pdfBuffer = await getPdfBufferFromStorage(filePath);
    if (!pdfBuffer?.length) throw new Error(`Could not download PDF for ${documentId}`);
    const { rawText } = await extractRawTextFromPdf(pdfBuffer);
    await updateMenuDocument(documentId, { raw_text: rawText });
    const sectionNames = extractSectionsFromText(rawText);
    out[documentId] = { rawText, sectionNames };
  }
  return out;
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
      let normalized = applyNormalization(aiRow);
      normalized = tryFillPriceFromRawText(normalized);
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

/** Plausible price range (SEK). */
const MIN_PRICE = 10;
const MAX_PRICE = 9999;

function parsePrice(num: number): number | null {
  return num >= MIN_PRICE && num <= MAX_PRICE ? num : null;
}

/**
 * Fill missing price fields from raw_text to reduce ambiguous_format and missing_price.
 * Runs when any price is missing; fills only the null fields (e.g. AI set glass, we fill bottle).
 */
function tryFillPriceFromRawText(row: AIExtractedRow): AIExtractedRow {
  if (row.row_type !== "wine_row") return row;
  const text = row.raw_text?.trim() ?? "";
  const allNumbers = [...text.matchAll(/\d{2,4}/g)].map((m) => parseInt(m[0], 10));
  const valid = allNumbers.filter((n) => n >= MIN_PRICE && n <= MAX_PRICE);

  const needGlass = row.price_glass == null;
  const needBottle = row.price_bottle == null;
  const needOther = row.price_other == null;

  // Two numbers (e.g. "165/725" or "165 725") – fill glass + bottle if missing
  const twoMatch = text.match(/(\d{2,4})\s*\/\s*(\d{2,4})|(\d{2,4})\s+(\d{2,4})\s*(?:kr|:-)?\s*$/i);
  if (twoMatch) {
    const a = twoMatch[1] ?? twoMatch[3];
    const b = twoMatch[2] ?? twoMatch[4];
    if (a != null && b != null) {
      const n1 = parseInt(a, 10);
      const n2 = parseInt(b, 10);
      const glass = parsePrice(n1);
      const bottle = parsePrice(n2);
      if (glass != null && bottle != null) {
        const low = Math.min(n1, n2);
        const high = Math.max(n1, n2);
        return {
          ...row,
          price_glass: needGlass ? low : row.price_glass,
          price_bottle: needBottle ? high : row.price_bottle,
        };
      }
    }
  }

  // Single number at end – use as glass if missing
  const oneMatch = text.match(/(\d{2,4})\s*(?:kr|:-)?\s*$/i);
  if (needGlass && oneMatch) {
    const n = parsePrice(parseInt(oneMatch[1]!, 10));
    if (n != null) return { ...row, price_glass: n };
  }

  // Fallback: use first valid numbers for missing fields (e.g. AI left both null or one null)
  if (valid.length >= 2 && (needGlass || needBottle)) {
    const [first, second] = valid;
    const low = Math.min(first, second);
    const high = Math.max(first, second);
    return {
      ...row,
      price_glass: needGlass ? low : row.price_glass,
      price_bottle: needBottle ? high : row.price_bottle,
    };
  }
  if (valid.length >= 1 && needGlass && needBottle && needOther) {
    return { ...row, price_glass: valid[0] };
  }

  return row;
}

/** Result of auto-correction when run after extraction (for logging/reporting). */
export type ExtractionWithAutoCorrectionResult = {
  autoCorrection?: import("./auto-correction").AutoCorrectionResult;
};

/**
 * Main entry – load document, get PDF from storage, run extraction (Claude reads PDF directly), save via db.
 * raw_text is no longer required; PDF is sent to Claude as document block.
 * Returns auto-correction result when run (for smoke test / logging).
 */
export async function extractMenuFromDocument(documentId: string): Promise<ExtractionWithAutoCorrectionResult> {
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
    const { result, usage } = await callMenuExtractionModel(pdfBuffer, documentId);
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
      extraction_input_tokens: usage.input_tokens,
      extraction_output_tokens: usage.output_tokens,
      extraction_cache_read_input_tokens: usage.cache_read_input_tokens ?? null,
      extraction_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? null,
    });

    const docAfter = await getMenuDocumentById(documentId);
    const rawText = docAfter?.raw_text?.trim() ?? "";
    const slug = docAfter?.source_slug ?? (await getStarwinelistSourceByDocumentId(documentId))?.slug ?? null;
    if (rawText && slug) {
      try {
        const correctionResult = await runAutoCorrection({
          documentId,
          slug,
          rawText,
        });
        console.warn("[extraction] Auto-correction complete:", correctionResult);
        return { autoCorrection: correctionResult };
      } catch (corrErr) {
        console.warn("[extraction] Auto-correction failed (non-fatal):", corrErr);
      }
    }
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateMenuDocument(documentId, {
      extraction_status: "failed",
      error_message: message,
    });
    throw err;
  }
}
