/**
 * Critic: reviews one section's extraction vs raw text (sync API, max_tokens 512).
 * Does not mutate rows – only feeds the Actor loop.
 * TODO(menu-extraction): Truncate very long sectionText / rows JSON to cap tokens while preserving tail prices.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  MENU_EXTRACTION_CRITIC_PROMPT,
  MENU_EXTRACTION_CRITIC_CACHE_PADDING,
} from "./prompts";
import { calculateCostUsd } from "./pricing";
import type { AIExtractedRow, CriticResult, ExtractionUsage } from "./types";

export const CRITIC_CONFIDENCE_THRESHOLD = 0.9;

export const CRITIC_MODEL =
  process.env.MENU_EXTRACTION_CRITIC_MODEL || "claude-haiku-4-5-20251001";

const criticJsonSchema = z.object({
  approved: z.boolean(),
  overallConfidence: z.number(),
  issues: z.array(
    z.object({
      rowIndex: z.number(),
      field: z.string(),
      problem: z.string(),
      suggestion: z.string(),
    })
  ),
  summary: z.string(),
});

function getCriticSystemBlocks(): Array<{
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}> {
  return [
    { type: "text" as const, text: MENU_EXTRACTION_CRITIC_PROMPT },
    {
      type: "text" as const,
      text: MENU_EXTRACTION_CRITIC_CACHE_PADDING,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

/** Skip Critic API when section is tiny, non-wine-only, very confident, or noise/header/description only. */
export function shouldSkipCritic(rows: AIExtractedRow[]): boolean {
  if (rows.length < 3) return true;
  if (
    rows.length > 0 &&
    rows.every((r) => {
      const t = String(r.row_type).toLowerCase();
      return t === "header" || t === "description" || t === "noise";
    })
  ) {
    return true;
  }
  if (
    rows.length > 0 &&
    rows.every((r) => {
      const t = String(r.row_type).toLowerCase();
      return t === "noise" || t === "unknown";
    })
  ) {
    return true;
  }
  if (
    rows.length > 0 &&
    rows.every((r) => typeof r.confidence === "number" && r.confidence >= CRITIC_CONFIDENCE_THRESHOLD)
  ) {
    return true;
  }
  return false;
}

export function shouldSkipCriticReason(rows: AIExtractedRow[]): string {
  if (rows.length < 3) return "fewer than 3 rows";
  if (
    rows.length > 0 &&
    rows.every((r) => {
      const t = String(r.row_type).toLowerCase();
      return t === "header" || t === "description" || t === "noise";
    })
  ) {
    return "header/description/noise only";
  }
  if (
    rows.length > 0 &&
    rows.every((r) => {
      const t = String(r.row_type).toLowerCase();
      return t === "noise" || t === "unknown";
    })
  ) {
    return "noise/unknown only";
  }
  if (
    rows.length > 0 &&
    rows.every((r) => typeof r.confidence === "number" && r.confidence >= CRITIC_CONFIDENCE_THRESHOLD)
  ) {
    return "all rows high confidence";
  }
  return "unknown";
}

function autoApproveHighConfidence(rows: AIExtractedRow[]): boolean {
  if (!rows.length) return true;
  return rows.every(
    (r) =>
      typeof r.confidence === "number" &&
      r.confidence >= CRITIC_CONFIDENCE_THRESHOLD &&
      (!r.review_reasons || r.review_reasons.length === 0)
  );
}

export async function reviewExtraction(params: {
  sectionText: string;
  sectionName: string;
  extractedRows: AIExtractedRow[];
  iteration: number;
}): Promise<CriticResult> {
  const { sectionText, sectionName, extractedRows, iteration } = params;

  if (extractedRows.length === 0) {
    return {
      approved: true,
      overallConfidence: 1,
      issues: [],
      summary: "no rows",
      skipped: true,
    };
  }

  if (autoApproveHighConfidence(extractedRows)) {
    console.warn("[critic] Skipped – all rows high confidence");
    return {
      approved: true,
      overallConfidence: 1,
      issues: [],
      summary: "auto-approved",
      skipped: true,
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });
  const userPayload = {
    section_name: sectionName,
    iteration,
    raw_section_text: sectionText,
    extracted_rows: extractedRows,
  };

  const userText = `Granska följande (JSON):\n${JSON.stringify(userPayload)}`;

  const msg = await client.messages.create({
    model: CRITIC_MODEL,
    max_tokens: 512,
    system: getCriticSystemBlocks(),
    messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
  });

  const textBlock = msg.content.find((c) => c.type === "text");
  const raw =
    textBlock && textBlock.type === "text"
      ? textBlock.text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "")
      : "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Critic: invalid JSON");
  }

  const safe = criticJsonSchema.safeParse(parsed);
  if (!safe.success) {
    throw new Error(`Critic: schema mismatch – ${safe.error.message}`);
  }

  const usageAnthropic: ExtractionUsage | null = msg.usage
    ? {
        input_tokens: msg.usage.input_tokens ?? 0,
        output_tokens: msg.usage.output_tokens ?? 0,
        cache_read_input_tokens: msg.usage.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: msg.usage.cache_creation_input_tokens ?? 0,
      }
    : null;

  const costUsd = usageAnthropic
    ? calculateCostUsd({
        model: CRITIC_MODEL,
        inputTokens: usageAnthropic.input_tokens,
        outputTokens: usageAnthropic.output_tokens,
        cacheReadTokens: usageAnthropic.cache_read_input_tokens ?? 0,
        cacheCreationTokens: usageAnthropic.cache_creation_input_tokens ?? 0,
      })
    : 0;

  return {
    ...(safe.data as Omit<CriticResult, "skipped" | "usage">),
    skipped: false,
    usage: usageAnthropic
      ? {
          inputTokens: usageAnthropic.input_tokens,
          outputTokens: usageAnthropic.output_tokens,
          costUsd,
        }
      : { inputTokens: 0, outputTokens: 0, costUsd: 0 },
  };
}
