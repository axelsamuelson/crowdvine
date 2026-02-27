/**
 * High-level service: refresh competitor offers for one wine or all wines.
 * For each wine + active source: search candidates -> fetch offer -> match -> upsert if above threshold.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { WineForMatch } from "./types";
import { getAdapter } from "./adapters";
import { evaluateMatch, MATCH_THRESHOLD } from "./match";
import {
  listPriceSources,
  upsertExternalOffer,
  updatePriceSourceLastCrawled,
} from "./db";
import { clearFetchCache } from "./fetch-with-retries";

const DEFAULT_MATCH_THRESHOLD = MATCH_THRESHOLD;
/** Cap candidates per wine+source to limit PDP fetches and runtime. */
const MAX_CANDIDATES_PER_SOURCE = 12;
/** Stop fetching more candidates after first accepted match (we only store one per wine+source). */
const STOP_AFTER_FIRST_MATCH = true;

export interface RefreshResult {
  wineId: string;
  sourceId: string;
  sourceName: string;
  offersUpdated: number;
  candidatesChecked: number;
  bestConfidence: number | null;
  error?: string;
}

export interface RefreshOneWineResult {
  wineId: string;
  results: RefreshResult[];
  errors: string[];
}

/**
 * Load wine with producer for matching (minimal fields).
 */
async function loadWineForMatch(wineId: string): Promise<WineForMatch | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wines")
    .select("id, wine_name, vintage, grape_varieties, color, producer_id, producers(name)")
    .eq("id", wineId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; wine_name: string; vintage: string; grape_varieties?: string; color?: string; producer_id: string; producers: { name: string } | null };
  return {
    id: row.id,
    wine_name: row.wine_name,
    vintage: row.vintage,
    producer: row.producers ? { name: row.producers.name } : null,
    grape_varieties: row.grape_varieties ?? null,
    color: row.color ?? null,
  };
}

/**
 * Refresh one wine against one source. Returns result and optional error message.
 */
async function refreshOneWineOneSource(
  wine: WineForMatch,
  wineId: string,
  source: Awaited<ReturnType<typeof listPriceSources>>[number],
  options: { matchThreshold?: number }
): Promise<{ result: RefreshResult; error?: string }> {
  const threshold =
    (options.matchThreshold ?? (source.config?.matchThreshold as number)) ?? DEFAULT_MATCH_THRESHOLD;
  try {
    const adapter = getAdapter(source);
    const allCandidates = await adapter.searchCandidates(wine, source);
    const candidates = allCandidates.slice(0, MAX_CANDIDATES_PER_SOURCE);
    let offersUpdated = 0;
    let bestConfidence: number | null = null;
    let bestOffer: {
      pdp_url: string;
      price_amount: number | null;
      currency: string;
      available: boolean;
      title_raw: string;
      match_confidence: number;
    } | null = null;
    let candidatesChecked = 0;

    for (const url of candidates) {
      try {
        const offer = await adapter.fetchOffer(url, source);
        candidatesChecked++;
        if (!offer) continue;
        const evalResult = evaluateMatch(wine, offer, { threshold });
        if (
          evalResult.accepted &&
          (bestConfidence == null || evalResult.score > bestConfidence)
        ) {
          bestConfidence = evalResult.score;
          bestOffer = {
            pdp_url: offer.pdpUrl,
            price_amount: offer.priceAmount,
            currency: offer.currency,
            available: offer.available,
            title_raw: offer.titleRaw,
            match_confidence: evalResult.score,
          };
          if (STOP_AFTER_FIRST_MATCH) break;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[external-prices] fetchOffer failed for ${url}:`, msg);
      }
    }

    if (bestOffer) {
      await upsertExternalOffer({
        wine_id: wineId,
        price_source_id: source.id,
        pdp_url: bestOffer.pdp_url,
        price_amount: bestOffer.price_amount,
        currency: bestOffer.currency,
        available: bestOffer.available,
        title_raw: bestOffer.title_raw,
        match_confidence: bestOffer.match_confidence,
      });
      offersUpdated = 1;
      console.info(
        `[external-prices] wine=${wineId} source=${source.slug} confidence=${bestOffer.match_confidence} url=${bestOffer.pdp_url}`
      );
    } else {
      console.info(
        `[external-prices] wine=${wineId} source=${source.slug} no match above threshold (candidates=${candidatesChecked})`
      );
    }

    await updatePriceSourceLastCrawled(source.id);
    return {
      result: {
        wineId,
        sourceId: source.id,
        sourceName: source.name,
        offersUpdated,
        candidatesChecked,
        bestConfidence,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[external-prices] refresh failed for wine=${wineId} source=${source.slug}:`, msg);
    return {
      result: {
        wineId,
        sourceId: source.id,
        sourceName: source.name,
        offersUpdated: 0,
        candidatesChecked: 0,
        bestConfidence: null,
      },
      error: `${source.name}: ${msg}`,
    };
  }
}

/**
 * Refresh competitor offers for a single wine. Runs all sources in parallel.
 */
export async function refreshOffersForWine(
  wineId: string,
  options: { matchThreshold?: number; sourceId?: string } = {}
): Promise<RefreshOneWineResult> {
  const wine = await loadWineForMatch(wineId);
  if (!wine) {
    return { wineId, results: [], errors: [`Wine not found: ${wineId}`] };
  }

  let sources = await listPriceSources(true);
  if (options.sourceId) {
    sources = sources.filter((s) => s.id === options.sourceId);
  }
  const opts = { matchThreshold: options.matchThreshold };

  const settled = await Promise.all(
    sources.map((source) => refreshOneWineOneSource(wine, wineId, source, opts))
  );
  const results = settled.map((s) => s.result);
  const errors = settled.map((s) => s.error).filter(Boolean) as string[];

  return { wineId, results, errors };
}

/**
 * Refresh competitor offers for all wines (batch). Calls refreshOffersForWine for each wine.
 * Optionally limit to a batch size for cron safety.
 */
export async function refreshOffersForAllWines(options: {
  matchThreshold?: number;
  batchSize?: number;
  sourceId?: string;
} = {}): Promise<{ processed: number; totalWines: number; errors: string[] }> {
  const sb = getSupabaseAdmin();
  const { data: wines, error } = await sb
    .from("wines")
    .select("id")
    .order("id");
  if (error) throw new Error(`refreshOffersForAllWines: ${error.message}`);
  const wineIds = (wines ?? []).map((w: { id: string }) => w.id);
  const totalWines = wineIds.length;
  const batchSize = options.batchSize ?? wineIds.length;
  const toProcess = wineIds.slice(0, batchSize);

  clearFetchCache();
  const allErrors: string[] = [];
  let processed = 0;

  for (const wineId of toProcess) {
    const result = await refreshOffersForWine(wineId, {
      matchThreshold: options.matchThreshold,
      sourceId: options.sourceId,
    });
    processed++;
    allErrors.push(...result.errors);
  }

  return { processed, totalWines, errors: allErrors };
}
