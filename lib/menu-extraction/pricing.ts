/**
 * Anthropic pricing (USD per million tokens). Override via env if prices change.
 * TODO(menu-extraction): Sync with https://www.anthropic.com/pricing periodically.
 */

import { ACTOR_MODEL_FALLBACK, ACTOR_MODEL_PRIMARY } from "./anthropic-models";

const CRITIC_MODEL_DEFAULT =
  process.env.MENU_EXTRACTION_CRITIC_MODEL || "claude-haiku-4-5-20251001";

function numEnv(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const SONNET_INPUT_PER_M = numEnv("MENU_EXTRACTION_PRICE_SONNET_INPUT_PER_M", 3.0);
const SONNET_OUTPUT_PER_M = numEnv("MENU_EXTRACTION_PRICE_SONNET_OUTPUT_PER_M", 15.0);
const SONNET_CACHE_READ_PER_M = numEnv("MENU_EXTRACTION_PRICE_SONNET_CACHE_READ_PER_M", 0.3);
const SONNET_CACHE_WRITE_PER_M = numEnv("MENU_EXTRACTION_PRICE_SONNET_CACHE_WRITE_PER_M", 3.75);

const HAIKU_INPUT_PER_M = numEnv("MENU_EXTRACTION_PRICE_HAIKU_INPUT_PER_M", 0.8);
const HAIKU_OUTPUT_PER_M = numEnv("MENU_EXTRACTION_PRICE_HAIKU_OUTPUT_PER_M", 4.0);
const HAIKU_CACHE_READ_PER_M = numEnv("MENU_EXTRACTION_PRICE_HAIKU_CACHE_READ_PER_M", 0.08);
const HAIKU_CACHE_WRITE_PER_M = numEnv("MENU_EXTRACTION_PRICE_HAIKU_CACHE_WRITE_PER_M", 1.0);

const HAIKU_MODEL_ID = "claude-haiku-4-5-20251001";
const SONNET_MODEL_ID = "claude-sonnet-4-6";

function isSonnetModel(model: string): boolean {
  const m = model.toLowerCase();
  return m.includes("sonnet") || model === ACTOR_MODEL_FALLBACK;
}

function isHaikuModel(model: string): boolean {
  const m = model.toLowerCase();
  return (
    m.includes("haiku") ||
    model === HAIKU_MODEL_ID ||
    model === ACTOR_MODEL_PRIMARY ||
    model === CRITIC_MODEL_DEFAULT
  );
}

/**
 * Estimated USD cost for one Anthropic call (input/output/cache).
 */
export function calculateCostUsd(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}): number {
  const {
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens = 0,
    cacheCreationTokens = 0,
  } = params;

  let inputPerM: number;
  let outputPerM: number;
  let cacheReadPerM: number;
  let cacheWritePerM: number;

  if (isSonnetModel(model) && !isHaikuModel(model)) {
    inputPerM = SONNET_INPUT_PER_M;
    outputPerM = SONNET_OUTPUT_PER_M;
    cacheReadPerM = SONNET_CACHE_READ_PER_M;
    cacheWritePerM = SONNET_CACHE_WRITE_PER_M;
  } else if (isHaikuModel(model)) {
    inputPerM = HAIKU_INPUT_PER_M;
    outputPerM = HAIKU_OUTPUT_PER_M;
    cacheReadPerM = HAIKU_CACHE_READ_PER_M;
    cacheWritePerM = HAIKU_CACHE_WRITE_PER_M;
  } else {
    // Unknown model id: assume Haiku-tier pricing
    inputPerM = HAIKU_INPUT_PER_M;
    outputPerM = HAIKU_OUTPUT_PER_M;
    cacheReadPerM = HAIKU_CACHE_READ_PER_M;
    cacheWritePerM = HAIKU_CACHE_WRITE_PER_M;
  }

  const inCost = (inputTokens / 1_000_000) * inputPerM;
  const outCost = (outputTokens / 1_000_000) * outputPerM;
  const crCost = (cacheReadTokens / 1_000_000) * cacheReadPerM;
  const ccCost = (cacheCreationTokens / 1_000_000) * cacheWritePerM;
  return inCost + outCost + crCost + ccCost;
}

export function usageToCostUsd(
  model: string,
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  } | null
): number {
  if (!usage) return 0;
  return calculateCostUsd({
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
  });
}

export { SONNET_MODEL_ID, HAIKU_MODEL_ID };
