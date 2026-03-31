/**
 * Menu extraction via Anthropic Message Batches API (50% discount).
 * Phase 1 (PDF + sections) runs synchronously; phase 2 (section extractions) runs as a batch.
 */

import Anthropic from "@anthropic-ai/sdk";
import { MODEL_ID } from "./anthropic-models";
import {
  getSystemBlocksForExtraction,
  extractSectionText,
  repairTruncatedJson,
  MAX_TOKENS_PER_SECTION,
  mapAIResultToRows,
  runPhase1ForBatch,
} from "./service";
import { MENU_EXTRACTION_PROMPT_VERSION } from "./prompts";
import { aiExtractionResultSchema } from "./schema";
import {
  createMenuExtractionBatch,
  getMenuExtractionBatchById,
  updateMenuExtractionBatch,
  saveMenuExtractionResult,
  updateMenuDocument,
} from "./db";
import type { AIExtractionResult } from "./types";

const WORKFLOW_VERSION = "1.0.0";

/** Build one section extraction prompt (same as service extractSection). */
function buildSectionPrompt(
  sectionName: string,
  sectionText: string
): string {
  return (
    `Extrahera ENDAST sektionen '${sectionName.replace(/'/g, "\\'")}' från följande text.\n` +
    `Returnera JSON i exakt detta format utan någon text före eller efter:\n` +
    `{ "sections": [{ "section_name", "normalized_section", "rows": [...] }] }\n\nText för sektionen:\n` +
    sectionText
  );
}

/**
 * Build Batch API requests for all section extractions from phase 1 result.
 * custom_id format: documentId_sectionIndex (e.g. uuid_0, uuid_1).
 */
function buildBatchRequests(
  phase1Result: Record<string, { rawText: string; sectionNames: string[] }>
): Array<{ custom_id: string; params: Record<string, unknown> }> {
  const systemBlocks = getSystemBlocksForExtraction();
  const requests: Array<{ custom_id: string; params: Record<string, unknown> }> = [];

  for (const [documentId, { rawText, sectionNames }] of Object.entries(phase1Result)) {
    for (let i = 0; i < sectionNames.length; i++) {
      const sectionName = sectionNames[i];
      const nextSectionName = sectionNames[i + 1];
      const sectionText = extractSectionText(rawText, sectionName, nextSectionName);
      const prompt = buildSectionPrompt(sectionName, sectionText);
      const custom_id = `${documentId}_${i}`;
      requests.push({
        custom_id,
        params: {
          model: MODEL_ID,
          max_tokens: MAX_TOKENS_PER_SECTION,
          system: systemBlocks,
          messages: [{ role: "user" as const, content: [{ type: "text" as const, text: prompt }] }],
        },
      });
    }
  }
  return requests;
}

/**
 * Submit batch to Anthropic. Returns Anthropic batch id.
 */
async function submitBatchToAnthropic(
  requests: Array<{ custom_id: string; params: Record<string, unknown> }>
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey });
  const batch = await (client as unknown as { messages: { batches: { create: (p: { requests: unknown[] }) => Promise<{ id: string }> } } }).messages.batches.create({
    requests,
  });
  return batch.id;
}

/**
 * Poll Anthropic batch until ended or timeout. Returns final status.
 */
async function pollBatchUntilEnded(
  anthropicBatchId: string,
  options: { pollIntervalMs?: number; timeoutMs?: number } = {}
): Promise<"ended" | "canceling" | "timeout"> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey });
  const pollIntervalMs = options.pollIntervalMs ?? 30_000;
  const timeoutMs = options.timeoutMs ?? 55 * 60 * 1000; // 55 min
  const started = Date.now();

  const retrieve = async (): Promise<{ processing_status: string }> => {
    const b = await (client as unknown as { messages: { batches: { retrieve: (id: string) => Promise<{ processing_status: string }> } } }).messages.batches.retrieve(anthropicBatchId);
    return b;
  };

  for (;;) {
    const batch = await retrieve();
    if (batch.processing_status === "ended" || batch.processing_status === "canceling") {
      return batch.processing_status as "ended" | "canceling";
    }
    if (Date.now() - started >= timeoutMs) return "timeout";
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
}

/**
 * Stream batch results and reassemble AIExtractionResult per document.
 * custom_id format: documentId_sectionIndex. phase1Result gives section names order.
 */
async function streamAndReassembleResults(
  anthropicBatchId: string,
  phase1Result: Record<string, { rawText: string; sectionNames: string[] }>
): Promise<Record<string, AIExtractionResult>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey });

  const byDoc: Record<string, Array<{ sectionIndex: number; text: string }>> = {};
  for (const docId of Object.keys(phase1Result)) {
    byDoc[docId] = [];
  }

  const stream = (client as unknown as {
    messages: { batches: { results: (batchId: string) => AsyncIterable<{ custom_id: string; result: { type: string; message?: { content?: Array<{ type: string; text?: string }> }; error?: { message: string } } }> };
    };
  }).messages.batches.results(anthropicBatchId);

  for await (const item of stream) {
    const { custom_id, result } = item;
    if (result.type === "errored" || result.type === "expired" || result.type === "canceled") {
      const msg = result.type === "errored" && result.error?.message ? result.error.message : result.type;
      console.warn("[batch] Request failed:", custom_id, msg);
      continue;
    }
    if (result.type !== "succeeded" || !result.message?.content) continue;
    const textBlock = result.message.content.find((c) => c.type === "text");
    const text = textBlock && "text" in textBlock ? (textBlock as { text: string }).text : "";
    const idx = custom_id.lastIndexOf("_");
    if (idx === -1) continue;
    const documentId = custom_id.slice(0, idx);
    const sectionIndex = parseInt(custom_id.slice(idx + 1), 10);
    if (!byDoc[documentId]) byDoc[documentId] = [];
    byDoc[documentId].push({ sectionIndex, text });
  }

  const assembled: Record<string, AIExtractionResult> = {};
  for (const [documentId, phaseDoc] of Object.entries(phase1Result)) {
    const names = phaseDoc.sectionNames;
    const items = (byDoc[documentId] ?? []).sort((a, b) => a.sectionIndex - b.sectionIndex);
    const sections: AIExtractionResult["sections"] = [];
    for (let i = 0; i < names.length; i++) {
      const item = items.find((x) => x.sectionIndex === i);
      const raw = item ? repairTruncatedJson(item.text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "")) : "{}";
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        sections.push({ section_name: names[i]!, normalized_section: names[i]!, rows: [] });
        continue;
      }
      const validated = aiExtractionResultSchema.safeParse(parsed);
      if (validated.success && validated.data.sections.length > 0) {
        sections.push(validated.data.sections[0]);
      } else {
        sections.push({ section_name: names[i]!, normalized_section: names[i]!, rows: [] });
      }
    }
    assembled[documentId] = { sections };
  }
  return assembled;
}

/**
 * Persist assembled results to DB: saveMenuExtractionResult + updateMenuDocument per document.
 */
async function persistBatchResults(
  results: Record<string, AIExtractionResult>,
  documentIds: string[]
): Promise<void> {
  for (const documentId of documentIds) {
    const result = results[documentId];
    if (!result) continue;
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
    const finishedAt = new Date().toISOString();
    await updateMenuDocument(documentId, {
      extraction_status: "completed",
      extracted_at: finishedAt,
      last_extraction_attempt_at: finishedAt,
      error_message: null,
    });
  }
}

/**
 * Create and submit a bulk extraction batch. Runs phase 1 (sync), then submits batch and stores batch row.
 * Returns our batch id; poll GET batch/[id] to wait and process results.
 */
export async function createBulkExtractionBatch(
  documentIds: string[]
): Promise<{ batchId: string; anthropicBatchId: string; requestCount: number }> {
  if (documentIds.length === 0) throw new Error("documentIds is required");
  const phase1Result = await runPhase1ForBatch(documentIds);
  const requests = buildBatchRequests(phase1Result);
  if (requests.length === 0) throw new Error("No section extraction requests (empty sections?)");
  const anthropicBatchId = await submitBatchToAnthropic(requests);
  const batch = await createMenuExtractionBatch(documentIds, phase1Result, anthropicBatchId, "processing");
  return {
    batchId: batch.id,
    anthropicBatchId,
    requestCount: requests.length,
  };
}

/**
 * Poll Anthropic batch status and update our batch row. Call after createBulkExtractionBatch.
 */
export async function pollBatchStatus(ourBatchId: string): Promise<{
  status: "submitted" | "processing" | "ended" | "processed" | "failed";
  anthropicStatus?: string;
  message?: string;
}> {
  const batch = await getMenuExtractionBatchById(ourBatchId);
  if (!batch) throw new Error(`Batch not found: ${ourBatchId}`);
  if (batch.status === "processed" || batch.status === "failed") {
    return { status: batch.status, message: batch.error_message ?? undefined };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !batch.anthropic_batch_id) {
    return { status: batch.status };
  }
  const client = new Anthropic({ apiKey });
  const anthropicBatch = await (client as unknown as { messages: { batches: { retrieve: (id: string) => Promise<{ processing_status: string }> } } }).messages.batches.retrieve(batch.anthropic_batch_id);
  const anthropicStatus = anthropicBatch.processing_status;
  if (anthropicStatus === "ended") {
    await updateMenuExtractionBatch(ourBatchId, { status: "ended" });
    return { status: "ended", anthropicStatus };
  }
  if (anthropicStatus === "in_progress" || anthropicStatus === "canceling") {
    return { status: "processing", anthropicStatus };
  }
  return { status: batch.status, anthropicStatus };
}

/**
 * Process batch results (reassemble and save). Call when batch status is "ended".
 */
export async function processBatchResults(ourBatchId: string): Promise<{ processed: number; errors: string[] }> {
  const batch = await getMenuExtractionBatchById(ourBatchId);
  if (!batch) throw new Error(`Batch not found: ${ourBatchId}`);
  if (batch.status === "processed") {
    return { processed: batch.document_ids.length, errors: [] };
  }
  if (batch.status !== "ended" && batch.status !== "processing") {
    throw new Error(`Batch not ready for processing: ${batch.status}`);
  }
  if (!batch.anthropic_batch_id || !batch.phase_1_result) {
    await updateMenuExtractionBatch(ourBatchId, { status: "failed", error_message: "Missing anthropic_batch_id or phase_1_result" });
    throw new Error("Missing anthropic_batch_id or phase_1_result");
  }
  const errors: string[] = [];
  try {
    const results = await streamAndReassembleResults(batch.anthropic_batch_id, batch.phase_1_result);
    await persistBatchResults(results, batch.document_ids);
    await updateMenuExtractionBatch(ourBatchId, { status: "processed", processed_at: new Date().toISOString() });
    return { processed: batch.document_ids.length, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateMenuExtractionBatch(ourBatchId, { status: "failed", error_message: message });
    throw err;
  }
}

/**
 * Full flow: create batch, poll until ended, process results. Long-running; use for background jobs.
 */
export async function runBulkExtractionToCompletion(
  documentIds: string[],
  options: { pollIntervalMs?: number; timeoutMs?: number } = {}
): Promise<{ batchId: string; processed: number; errors: string[] }> {
  const { batchId, anthropicBatchId } = await createBulkExtractionBatch(documentIds);
  const batch = await getMenuExtractionBatchById(batchId);
  if (!batch) throw new Error("Batch not found after create");
  const status = await pollBatchUntilEnded(anthropicBatchId, options);
  if (status === "timeout") {
    await updateMenuExtractionBatch(batchId, { status: "ended", error_message: "Poll timeout" });
    return { batchId, processed: 0, errors: ["Poll timeout; process results later via processBatchResults(batchId)"] };
  }
  await updateMenuExtractionBatch(batchId, { status: "ended" });
  const { processed, errors } = await processBatchResults(batchId);
  return { batchId, processed, errors };
}
