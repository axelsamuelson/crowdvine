/**
 * Supabase DB layer for price_sources and external_offers.
 * Uses admin client (bypasses RLS) for server-side use.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ExternalOffer, PriceSource } from "./types";

const PRICE_SOURCES_SELECT = "id, created_at, updated_at, name, slug, base_url, search_url_template, sitemap_url, adapter_type, is_active, rate_limit_delay_ms, last_crawled_at, config";
const EXTERNAL_OFFERS_SELECT = "id, created_at, updated_at, wine_id, price_source_id, pdp_url, price_amount, currency, available, title_raw, match_confidence, last_fetched_at, rating";

export async function listPriceSources(activeOnly = false): Promise<PriceSource[]> {
  const sb = getSupabaseAdmin();
  let q = sb.from("price_sources").select(PRICE_SOURCES_SELECT).order("name");
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(`listPriceSources: ${error.message}`);
  return (data ?? []) as PriceSource[];
}

export async function getPriceSource(id: string): Promise<PriceSource | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("price_sources")
    .select(PRICE_SOURCES_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getPriceSource: ${error.message}`);
  return data as PriceSource | null;
}

export interface CreatePriceSourceInput {
  name: string;
  slug: string;
  base_url: string;
  search_url_template?: string | null;
  sitemap_url?: string | null;
  adapter_type?: string;
  is_active?: boolean;
  rate_limit_delay_ms?: number;
  config?: Record<string, unknown>;
}

export async function createPriceSource(input: CreatePriceSourceInput): Promise<PriceSource> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("price_sources")
    .insert({
      name: input.name,
      slug: input.slug,
      base_url: input.base_url,
      search_url_template: input.search_url_template ?? null,
      sitemap_url: input.sitemap_url ?? null,
      adapter_type: input.adapter_type ?? "shopify",
      is_active: input.is_active ?? true,
      rate_limit_delay_ms: input.rate_limit_delay_ms ?? 2000,
      config: input.config ?? {},
    })
    .select(PRICE_SOURCES_SELECT)
    .single();
  if (error) throw new Error(`createPriceSource: ${error.message}`);
  return data as PriceSource;
}

export async function updatePriceSource(
  id: string,
  updates: Partial<CreatePriceSourceInput>
): Promise<PriceSource> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("price_sources")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(PRICE_SOURCES_SELECT)
    .single();
  if (error) throw new Error(`updatePriceSource: ${error.message}`);
  return data as PriceSource;
}

export async function deletePriceSource(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("price_sources").delete().eq("id", id);
  if (error) throw new Error(`deletePriceSource: ${error.message}`);
}

export interface UpsertExternalOfferInput {
  wine_id: string;
  price_source_id: string;
  pdp_url: string;
  price_amount: number | null;
  currency: string;
  available: boolean;
  title_raw: string | null;
  match_confidence: number;
  /** Rating from source (e.g. Vivino 0–5). Optional. */
  rating?: number | null;
}

export async function upsertExternalOffer(input: UpsertExternalOfferInput): Promise<ExternalOffer> {
  const sb = getSupabaseAdmin();
  const row: Record<string, unknown> = {
    wine_id: input.wine_id,
    price_source_id: input.price_source_id,
    pdp_url: input.pdp_url,
    price_amount: input.price_amount,
    currency: input.currency,
    available: input.available,
    title_raw: input.title_raw,
    match_confidence: input.match_confidence,
    last_fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (input.rating !== undefined) row.rating = input.rating;
  const { data, error } = await sb
    .from("external_offers")
    .upsert(row, {
      onConflict: "wine_id,price_source_id",
      ignoreDuplicates: false,
    })
    .select(EXTERNAL_OFFERS_SELECT)
    .single();
  if (error) throw new Error(`upsertExternalOffer: ${error.message}`);
  return data as ExternalOffer;
}

export interface OfferWithSource extends ExternalOffer {
  price_source?: { name: string; slug: string } | null;
}

/** Get existing offer for (wine_id, price_source_id). Used for PDP-only refresh. */
export async function getOfferByWineAndSource(
  wineId: string,
  priceSourceId: string
): Promise<{ pdp_url: string; last_fetched_at: string } | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("external_offers")
    .select("pdp_url, last_fetched_at")
    .eq("wine_id", wineId)
    .eq("price_source_id", priceSourceId)
    .not("pdp_url", "is", null)
    .maybeSingle();
  if (error) throw new Error(`getOfferByWineAndSource: ${error.message}`);
  return data as { pdp_url: string; last_fetched_at: string } | null;
}

export async function getOffersByWineId(wineId: string): Promise<OfferWithSource[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("external_offers")
    .select(`${EXTERNAL_OFFERS_SELECT}, price_sources(name, slug)`)
    .eq("wine_id", wineId)
    .order("price_amount", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`getOffersByWineId: ${error.message}`);
  const rows = (data ?? []) as (ExternalOffer & { price_sources: { name: string; slug: string } | null })[];
  return rows.map((r) => {
    const { price_sources, ...offer } = r;
    return { ...offer, price_source: price_sources ?? null };
  });
}

/** Minimum match_confidence (0–1) to count as "Godkänd". Offers below this are excluded from shop filter and "Buy at" list. */
const APPROVED_MATCH_THRESHOLD = 0.4;

/** For a set of wine IDs, return which price source slugs have an *approved* offer (match_confidence >= threshold) for each wine. Used for shop competitor filter; only "Godkänd" matches count. */
export async function getSourceSlugsByWineIds(wineIds: string[]): Promise<Record<string, string[]>> {
  if (wineIds.length === 0) return {};
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("external_offers")
    .select("wine_id, price_sources(slug)")
    .in("wine_id", wineIds)
    .gte("match_confidence", APPROVED_MATCH_THRESHOLD);
  if (error) throw new Error(`getSourceSlugsByWineIds: ${error.message}`);
  const rows = (data ?? []) as { wine_id: string; price_sources: { slug: string } | null }[];
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    const slug = row.price_sources?.slug;
    if (slug) {
      if (!out[row.wine_id]) out[row.wine_id] = [];
      if (!out[row.wine_id].includes(slug)) out[row.wine_id].push(slug);
    }
  }
  return out;
}

export interface OfferRow extends ExternalOffer {
  price_source?: { name: string; slug: string } | null;
  wine?: { wine_name: string; vintage: string; producer_name?: string } | null;
}

/** List all external offers with wine, producer and price source names, for admin overview. */
export async function listAllOffers(): Promise<OfferRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("external_offers")
    .select(
      `${EXTERNAL_OFFERS_SELECT}, price_sources(name, slug), wines(wine_name, vintage, producer_id, producers(name))`
    )
    .order("last_fetched_at", { ascending: false });
  if (error) throw new Error(`listAllOffers: ${error.message}`);
  const rows = (data ?? []) as (ExternalOffer & {
    price_sources: { name: string; slug: string } | null;
    wines: {
      wine_name: string;
      vintage: string;
      producers: { name: string } | null;
    } | null;
  })[];
  return rows.map((r) => {
    const { price_sources, wines, ...offer } = r;
    const wine = wines
      ? {
          wine_name: wines.wine_name,
          vintage: wines.vintage,
          producer_name: wines.producers?.name ?? null,
        }
      : null;
    return { ...offer, price_source: price_sources ?? null, wine };
  });
}

export async function updatePriceSourceLastCrawled(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  await sb
    .from("price_sources")
    .update({ last_crawled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
}
