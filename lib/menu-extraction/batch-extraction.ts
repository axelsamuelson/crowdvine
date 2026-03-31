/**
 * Single-document section extraction via Anthropic Message Batches API (50% discount).
 * Used when the menu has more than 3 sections; falls back to sync on failure.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ACTOR_MODEL_PRIMARY } from "./anthropic-models";
import { buildSectionUserPrompt } from "./section-user-prompt";
import {
  getSystemBlocksForExtraction,
  extractSectionText,
  repairTruncatedJson,
  MAX_TOKENS_PER_SECTION,
} from "./service";
import { aiExtractionResultSchema } from "./schema";
import type { AIExtractedRow, AIExtractionResult, ExtractionUsage } from "./types";

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 180;

function emptyUsage(): ExtractionUsage {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };
}

function addUsage(a: ExtractionUsage, b: Partial<ExtractionUsage> | null | undefined): void {
  if (!b) return;
  a.input_tokens += b.input_tokens ?? 0;
  a.output_tokens += b.output_tokens ?? 0;
  a.cache_read_input_tokens =
    (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0);
  a.cache_creation_input_tokens =
    (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0);
}

/**
 * One batch job = one request per section. Polls up to 30 min (10s × 180).
 * On hard failure, throws so caller can fall back to synchronous extraction.
 */
export async function extractSectionsInBatch(params: {
  sections: string[];
  rawText: string;
}): Promise<{ map: Map<string, AIExtractedRow[]>; usage: ExtractionUsage }> {
  const { sections, rawText } = params;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const systemBlocks = getSystemBlocksForExtraction();
  const requests: Array<{ custom_id: string; params: Record<string, unknown> }> = [];

  for (let i = 0; i < sections.length; i++) {
    const sectionName = sections[i]!;
    const nextSectionName = sections[i + 1];
    const sectionText = extractSectionText(rawText, sectionName, nextSectionName);
    const prompt = buildSectionUserPrompt(sectionName, sectionText);
    requests.push({
      custom_id: `sec_${i}`,
      params: {
        model: ACTOR_MODEL_PRIMARY,
        max_tokens: MAX_TOKENS_PER_SECTION,
        system: systemBlocks,
        messages: [{ role: "user" as const, content: [{ type: "text" as const, text: prompt }] }],
      },
    });
  }

  type BatchesApi = {
    messages: {
      batches: {
        create: (p: { requests: unknown[] }) => Promise<{ id: string }>;
        retrieve: (id: string) => Promise<{ processing_status: string }>;
        results: (
          id: string
        ) => AsyncIterable<{
          custom_id: string;
          result: {
            type: string;
            message?: {
              content?: Array<{ type: string; text?: string }>;
              usage?: Partial<ExtractionUsage>;
            };
            error?: { message: string };
          };
        }>;
      };
    };
  };

  const batch = await (client as unknown as BatchesApi).messages.batches.create({ requests });
  const batchId = batch.id;

  let status = "in_progress";
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const b = await (client as unknown as BatchesApi).messages.batches.retrieve(batchId);
    status = b.processing_status;
    if (status === "ended" || status === "canceling") break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  if (status !== "ended") {
    throw new Error(`Batch extraction: batch not completed (status=${status})`);
  }

  const map = new Map<string, AIExtractedRow[]>();
  const usage = emptyUsage();

  const stream = (client as unknown as BatchesApi).messages.batches.results(batchId);
  for await (const item of stream) {
    const { custom_id, result } = item;
    const m = /^sec_(\d+)$/.exec(custom_id);
    if (!m) continue;
    const idx = parseInt(m[1]!, 10);
    const sectionName = sections[idx];
    if (!sectionName) continue;

    if (result.type === "canceled") {
      console.warn("[batch-extraction] Request canceled:", custom_id);
      map.set(sectionName, []);
      continue;
    }
    if (result.type === "errored" || result.type === "expired") {
      const msg =
        result.type === "errored" && result.error?.message
          ? result.error.message
          : result.type;
      console.warn("[batch-extraction] Request failed:", custom_id, msg);
      map.set(sectionName, []);
      continue;
    }
    if (result.type !== "succeeded" || !result.message?.content) {
      map.set(sectionName, []);
      continue;
    }

    addUsage(usage, result.message.usage);

    const textBlock = result.message.content.find((c) => c.type === "text");
    const text =
      textBlock && "text" in textBlock && typeof textBlock.text === "string"
        ? textBlock.text
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/\s*```$/i, "")
        : "";
    const repaired = repairTruncatedJson(text);
    let json: unknown;
    try {
      json = JSON.parse(repaired) as unknown;
    } catch {
      console.warn("[batch-extraction] JSON parse failed for section:", sectionName);
      map.set(sectionName, []);
      continue;
    }
    const validated = aiExtractionResultSchema.safeParse(json);
    if (!validated.success || validated.data.sections.length === 0) {
      map.set(sectionName, []);
      continue;
    }
    const first = validated.data.sections[0] as AIExtractionResult["sections"][number];
    map.set(sectionName, first.rows as AIExtractedRow[]);
  }

  for (const name of sections) {
    if (!map.has(name)) {
      map.set(name, []);
    }
  }

  return { map, usage };
}
