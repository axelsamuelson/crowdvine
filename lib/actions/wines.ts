"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { calculateSystembolagetPrice } from "@/lib/systembolaget-pricing";
import { getAppUrl } from "@/lib/app-url";
import {
  buildWineArrayJsonb,
  buildWineJsonb,
  type WineLocale,
} from "@/lib/i18n/wine-locale";

export interface Wine {
  id: string;
  handle: string;
  wine_name: string;
  vintage: string;
  grape_varieties?: string;
  color?: string;
  label_image_path?: string;
  base_price_cents: number;
  producer_id: string;
  producer?: {
    name: string;
  };
  created_at: string;
  updated_at: string;
  // New pricing fields
  cost_currency: string;
  cost_amount: number;
  exchange_rate_source: string;
  exchange_rate_date?: string;
  exchange_rate_period_start?: string;
  exchange_rate_period_end?: string;
  exchange_rate?: number;
  alcohol_tax_cents: number;
  price_includes_vat: boolean;
  margin_percentage: number;
  calculated_price_cents: number;
  // Systembolaget pricing
  supplier_price?: number;
  sb_price?: number;
  volume_liters?: number;
  // Description fields
  description?: string;
  description_html?: string;
  summary?: string | null;
  // Extra info (admin/wines)
  terroir_soil?: string | null;
  production_method?: string | null;
  tasting_profile_character?: string | null;
  classification?: string | null;
  tasting_notes?: string | null;
  alcohol_percentage?: number | null;
  // Enrichment
  farming?: string | null;
  additives?: string | null;
  serving_temp_c?: string | null;
  food_pairing?: string[] | null;
  winemaker_notes?: string | null;
  awards?: string[] | null;
  ageing?: string | null;
  soil_type?: string | null;
  elevation_masl?: number | null;
  yield_hl_ha?: number | null;
  // Specs (PDP bullet list)
  appellation?: string | null;
  terroir?: string | null;
  vinification?: string | null;
  abv?: string | null;
  // B2B
  b2b_price_cents?: number | null;
  b2b_cost_sek?: number | null;
  b2b_margin_percentage?: number | null;
  b2b_stock?: number | null;
  // Visibility
  is_live?: boolean;
}

export interface CreateWineData {
  handle: string;
  wine_name: string;
  vintage: string;
  grape_varieties?: string;
  color?: string;
  label_image_path?: string;
  base_price_cents: number;
  producer_id: string;
  // Simplified pricing fields
  cost_currency: string;
  cost_amount: number;
  alcohol_tax_cents: number;
  price_includes_vat: boolean;
  margin_percentage: number;
  // Systembolaget pricing
  supplier_price?: number;
  sb_price?: number;
  volume_liters?: number;
  // Description fields
  description?: string;
  description_html?: string;
  summary?: string | null;
  // Extra info (admin/wines)
  terroir_soil?: string | null;
  production_method?: string | null;
  tasting_profile_character?: string | null;
  classification?: string | null;
  tasting_notes?: string | null;
  alcohol_percentage?: number | null;
  // Enrichment
  farming?: string | null;
  additives?: string | null;
  serving_temp_c?: string | null;
  food_pairing?: string[] | null;
  winemaker_notes?: string | null;
  awards?: string[] | null;
  ageing?: string | null;
  soil_type?: string | null;
  elevation_masl?: number | null;
  yield_hl_ha?: number | null;
  // Specs (PDP bullet list)
  appellation?: string | null;
  terroir?: string | null;
  vinification?: string | null;
  abv?: string | null;
  // B2B
  b2b_price_cents?: number | null;
  b2b_cost_sek?: number | null;
  b2b_margin_percentage?: number | null;
  b2b_stock?: number | null;
  // Visibility
  is_live?: boolean;
}

const WINES_SELECT_FULL = `
  id,
  handle,
  wine_name,
  vintage,
  grape_varieties,
  color,
  label_image_path,
  base_price_cents,
  producer_id,
  cost_currency,
  cost_amount,
  exchange_rate,
  alcohol_tax_cents,
  price_includes_vat,
  margin_percentage,
  calculated_price_cents,
  supplier_price,
  sb_price,
  volume_liters,
  description,
  description_html,
  summary,
  terroir_soil,
  production_method,
  tasting_profile_character,
  classification,
  tasting_notes,
  alcohol_percentage,
  farming,
  additives,
  serving_temp_c,
  food_pairing,
  winemaker_notes,
  awards,
  ageing,
  soil_type,
  elevation_masl,
  yield_hl_ha,
  appellation,
  terroir,
  vinification,
  abv,
  b2b_price_cents,
  b2b_cost_sek,
  b2b_margin_percentage,
  b2b_stock,
  is_live,
  created_at,
  updated_at
`;

const WINES_SELECT_WITHOUT_B2B = `
  id,
  handle,
  wine_name,
  vintage,
  grape_varieties,
  color,
  label_image_path,
  base_price_cents,
  producer_id,
  cost_currency,
  cost_amount,
  alcohol_tax_cents,
  price_includes_vat,
  margin_percentage,
  calculated_price_cents,
  supplier_price,
  sb_price,
  volume_liters,
  description,
  description_html,
  summary,
  terroir_soil,
  production_method,
  tasting_profile_character,
  classification,
  tasting_notes,
  alcohol_percentage,
  farming,
  additives,
  serving_temp_c,
  food_pairing,
  winemaker_notes,
  awards,
  ageing,
  soil_type,
  elevation_masl,
  yield_hl_ha,
  appellation,
  terroir,
  vinification,
  abv,
  is_live,
  created_at,
  updated_at
`;

/** Full select without ageing/soil_type (columns may not exist yet). */
const WINES_SELECT_WITHOUT_EXTENDED_ENRICHMENT = `
  id,
  handle,
  wine_name,
  vintage,
  grape_varieties,
  color,
  label_image_path,
  base_price_cents,
  producer_id,
  cost_currency,
  cost_amount,
  exchange_rate,
  alcohol_tax_cents,
  price_includes_vat,
  margin_percentage,
  calculated_price_cents,
  supplier_price,
  sb_price,
  volume_liters,
  description,
  description_html,
  summary,
  terroir_soil,
  production_method,
  tasting_profile_character,
  classification,
  tasting_notes,
  alcohol_percentage,
  farming,
  additives,
  serving_temp_c,
  food_pairing,
  winemaker_notes,
  awards,
  elevation_masl,
  yield_hl_ha,
  appellation,
  terroir,
  vinification,
  abv,
  b2b_price_cents,
  b2b_cost_sek,
  b2b_margin_percentage,
  b2b_stock,
  is_live,
  created_at,
  updated_at
`;

/** Without B2B and without ageing/soil_type. */
const WINES_SELECT_WITHOUT_B2B_NO_EXTENDED = `
  id,
  handle,
  wine_name,
  vintage,
  grape_varieties,
  color,
  label_image_path,
  base_price_cents,
  producer_id,
  cost_currency,
  cost_amount,
  alcohol_tax_cents,
  price_includes_vat,
  margin_percentage,
  calculated_price_cents,
  supplier_price,
  sb_price,
  volume_liters,
  description,
  description_html,
  summary,
  terroir_soil,
  production_method,
  tasting_profile_character,
  classification,
  tasting_notes,
  alcohol_percentage,
  farming,
  additives,
  serving_temp_c,
  food_pairing,
  winemaker_notes,
  awards,
  elevation_masl,
  yield_hl_ha,
  appellation,
  terroir,
  vinification,
  abv,
  is_live,
  created_at,
  updated_at
`;

/** Select without summary column (for DBs that have not run migration 089). */
const WINES_SELECT_FULL_NO_SUMMARY = `
  id,
  handle,
  wine_name,
  vintage,
  grape_varieties,
  color,
  label_image_path,
  base_price_cents,
  producer_id,
  cost_currency,
  cost_amount,
  exchange_rate,
  alcohol_tax_cents,
  price_includes_vat,
  margin_percentage,
  calculated_price_cents,
  supplier_price,
  sb_price,
  volume_liters,
  description,
  description_html,
  b2b_margin_percentage,
  b2b_stock,
  is_live,
  created_at,
  updated_at
`;

/** Select without optional columns (B2B, summary, specs, extra info) for fallback when columns missing. */
const WINES_SELECT_LEGACY = `
  id,
  handle,
  wine_name,
  vintage,
  grape_varieties,
  color,
  label_image_path,
  base_price_cents,
  producer_id,
  cost_currency,
  cost_amount,
  alcohol_tax_cents,
  price_includes_vat,
  margin_percentage,
  calculated_price_cents,
  supplier_price,
  sb_price,
  volume_liters,
  description,
  description_html,
  is_live,
  created_at,
  updated_at
`;

const WINES_SELECT_WITHOUT_B2B_NO_SUMMARY = `
  id,
  handle,
  wine_name,
  vintage,
  grape_varieties,
  color,
  label_image_path,
  base_price_cents,
  producer_id,
  cost_currency,
  cost_amount,
  alcohol_tax_cents,
  price_includes_vat,
  margin_percentage,
  calculated_price_cents,
  supplier_price,
  sb_price,
  volume_liters,
  description,
  description_html,
  is_live,
  created_at,
  updated_at
`;

function isB2BColumnMissingError(error: { message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return /b2b_price_cents|b2b_stock|b2b_margin_percentage/i.test(msg);
}

function isExtendedEnrichmentColumnMissingError(error: { message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return /ageing|soil_type/i.test(msg);
}

function isOptionalColumnMissingError(error: { message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return /terroir_soil|production_method|tasting_profile_character|classification|tasting_notes|alcohol_percentage/i.test(msg);
}

function pickWineSelectFallback(error: { message?: string } | null): string | null {
  if (isExtendedEnrichmentColumnMissingError(error)) {
    return isB2BColumnMissingError(error)
      ? WINES_SELECT_WITHOUT_B2B_NO_EXTENDED
      : WINES_SELECT_WITHOUT_EXTENDED_ENRICHMENT;
  }
  if (isOptionalColumnMissingError(error)) {
    return WINES_SELECT_LEGACY;
  }
  if (isB2BColumnMissingError(error)) {
    return WINES_SELECT_WITHOUT_B2B;
  }
  if (isSummaryColumnMissingError(error) || isSpecsColumnMissingError(error)) {
    return WINES_SELECT_WITHOUT_B2B;
  }
  return null;
}

function withNullExtendedEnrichment<T extends Record<string, unknown>>(wine: T) {
  return { ...wine, ageing: null, soil_type: null };
}

function isSummaryColumnMissingError(error: { message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return /column.*summary.*does not exist|summary.*does not exist/i.test(msg);
}

function isSpecsColumnMissingError(error: { message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return /column.*wines\.(appellation|terroir|vinification|abv).*does not exist/i.test(msg);
}

export async function getWines() {
  const sb = await supabaseServer();

  let { data: wines, error } = await sb
    .from("wines")
    .select(WINES_SELECT_FULL)
    .order("wine_name");

  if (error && (isB2BColumnMissingError(error) || isExtendedEnrichmentColumnMissingError(error) || isOptionalColumnMissingError(error) || isSummaryColumnMissingError(error) || isSpecsColumnMissingError(error))) {
    const fallbackSelect = pickWineSelectFallback(error);
    if (!fallbackSelect) throw new Error(error.message);
    let fallback = await sb
      .from("wines")
      .select(fallbackSelect)
      .order("wine_name");
    if (fallback.error && (isSummaryColumnMissingError(fallback.error) || isSpecsColumnMissingError(fallback.error))) {
      fallback = await sb
        .from("wines")
        .select(WINES_SELECT_WITHOUT_B2B_NO_SUMMARY)
        .order("wine_name");
      if (!fallback.error && fallback.data) {
        wines = (fallback.data as any[]).map((w: any) => ({
          ...w,
          b2b_price_cents: null,
          b2b_cost_sek: null,
          b2b_margin_percentage: null,
          b2b_stock: null,
          summary: null,
          terroir_soil: null,
          production_method: null,
          tasting_profile_character: null,
          classification: null,
          tasting_notes: null,
          alcohol_percentage: null,
          appellation: null,
          terroir: null,
          vinification: null,
          abv: null,
        }));
        error = null;
      }
    } else if (!fallback.error) {
      const stripExtended = isExtendedEnrichmentColumnMissingError(error);
      wines = (fallback.data ?? []).map((w: any) => {
        const row = {
          ...w,
          b2b_price_cents: w.b2b_price_cents ?? null,
          b2b_cost_sek: w.b2b_cost_sek ?? null,
          b2b_margin_percentage: w.b2b_margin_percentage ?? null,
          b2b_stock: w.b2b_stock ?? null,
          terroir_soil: w.terroir_soil ?? null,
          production_method: w.production_method ?? null,
          tasting_profile_character: w.tasting_profile_character ?? null,
          classification: w.classification ?? null,
          tasting_notes: w.tasting_notes ?? null,
          alcohol_percentage: w.alcohol_percentage ?? null,
          summary: (w as any).summary ?? null,
          appellation: (w as any).appellation ?? null,
          terroir: (w as any).terroir ?? null,
          vinification: (w as any).vinification ?? null,
          abv: (w as any).abv ?? null,
          farming: w.farming ?? null,
          additives: w.additives ?? null,
          serving_temp_c: w.serving_temp_c ?? null,
          food_pairing: w.food_pairing ?? null,
          winemaker_notes: w.winemaker_notes ?? null,
          awards: w.awards ?? null,
          elevation_masl: w.elevation_masl ?? null,
          yield_hl_ha: w.yield_hl_ha ?? null,
          ageing: w.ageing ?? null,
          soil_type: w.soil_type ?? null,
        };
        return stripExtended ? withNullExtendedEnrichment(row) : row;
      });
      error = null;
    }
  }
  if (error) throw new Error(error.message);

  const wineList = wines ?? [];
  // Get all producers for the wines
  const producerIds = [...new Set(wineList.map((wine) => wine.producer_id))];
  const { data: producers } = await sb
    .from("producers")
    .select("id, name")
    .in("id", producerIds);

  // Create a map for quick lookup
  const producerMap = new Map(producers?.map((p) => [p.id, p]) || []);

  // Combine wines with their producers
  const winesWithProducers = wineList.map((wine) => ({
    ...wine,
    producer: producerMap.get(wine.producer_id),
  }));

  return winesWithProducers;
}

export async function getWine(id: string) {
  const sb = await supabaseServer();

  let { data: wine, error } = await sb
    .from("wines")
    .select(WINES_SELECT_FULL)
    .eq("id", id)
    .single();

  if (error && (isB2BColumnMissingError(error) || isExtendedEnrichmentColumnMissingError(error) || isOptionalColumnMissingError(error) || isSummaryColumnMissingError(error) || isSpecsColumnMissingError(error))) {
    const fallbackSelect = pickWineSelectFallback(error);
    if (!fallbackSelect) throw new Error(error.message);
    let fallback = await sb
      .from("wines")
      .select(fallbackSelect)
      .eq("id", id)
      .single();
    if (fallback.error && (isSummaryColumnMissingError(fallback.error) || isSpecsColumnMissingError(fallback.error))) {
      fallback = await sb
        .from("wines")
        .select(WINES_SELECT_WITHOUT_B2B_NO_SUMMARY)
        .eq("id", id)
        .single();
      if (!fallback.error && fallback.data) {
        wine = {
          ...fallback.data,
          b2b_price_cents: null,
          b2b_cost_sek: null,
          b2b_margin_percentage: null,
          b2b_stock: null,
          summary: null,
          terroir_soil: null,
          production_method: null,
          tasting_profile_character: null,
          classification: null,
          tasting_notes: null,
          alcohol_percentage: null,
          appellation: null,
          terroir: null,
          vinification: null,
          abv: null,
        } as any;
        error = null;
      }
    } else if (!fallback.error && fallback.data) {
      const d = fallback.data as any;
      const stripExtended = isExtendedEnrichmentColumnMissingError(error);
      const row = {
        ...d,
        b2b_price_cents: d.b2b_price_cents ?? null,
        b2b_cost_sek: d.b2b_cost_sek ?? null,
        b2b_margin_percentage: d.b2b_margin_percentage ?? null,
        b2b_stock: d.b2b_stock ?? null,
        terroir_soil: d.terroir_soil ?? null,
        production_method: d.production_method ?? null,
        tasting_profile_character: d.tasting_profile_character ?? null,
        classification: d.classification ?? null,
        tasting_notes: d.tasting_notes ?? null,
        alcohol_percentage: d.alcohol_percentage ?? null,
        summary: d.summary ?? null,
        appellation: d.appellation ?? null,
        terroir: d.terroir ?? null,
        vinification: d.vinification ?? null,
        abv: d.abv ?? null,
        farming: d.farming ?? null,
        additives: d.additives ?? null,
        serving_temp_c: d.serving_temp_c ?? null,
        food_pairing: d.food_pairing ?? null,
        winemaker_notes: d.winemaker_notes ?? null,
        awards: d.awards ?? null,
        elevation_masl: d.elevation_masl ?? null,
        yield_hl_ha: d.yield_hl_ha ?? null,
        ageing: d.ageing ?? null,
        soil_type: d.soil_type ?? null,
      };
      wine = (stripExtended ? withNullExtendedEnrichment(row) : row) as any;
      error = null;
    }
  }
  if (error) throw new Error(error.message);

  if (!wine) throw new Error("Wine not found");

  // Then get the producer information separately
  const { data: producer } = await sb
    .from("producers")
    .select("name")
    .eq("id", wine.producer_id)
    .single();

  const wineWithProducer = {
    ...wine,
    producer: producer,
  };

  return wineWithProducer;
}

export async function createWine(data: CreateWineData, locale: WineLocale = "sv") {
  const sb = await supabaseServer();

  // Calculate price if pricing data is provided
  let finalPriceCents = data.base_price_cents;
  let calculatedSbPrice = null;

  if (data.cost_amount && data.cost_amount > 0) {
    let exchangeRate = 1.0; // Default for SEK

    if (data.cost_currency !== "SEK") {
      try {
        // Fetch current exchange rate
        const rateResponse = await fetch(
          `${getAppUrl()}/api/exchange-rates?from=${data.cost_currency}&to=SEK`,
        );

        if (rateResponse.ok) {
          const rateData = await rateResponse.json();
          exchangeRate = rateData.rate;
        } else {
          console.warn(
            `Failed to fetch exchange rate for ${data.cost_currency}, using 1.0`,
          );
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
      }
    }

    // Calculate inclusive cost (C): cost_amount + alcohol_tax converted to SEK
    const costAmountInSek = data.cost_amount * exchangeRate;
    const alcoholTaxInSek = 22.19; // Fixed SEK 22.19 per bottle
    const costInSek = costAmountInSek + alcoholTaxInSek; // C = Total cost ex VAT

    // Gross margin as decimal (e.g., 10% = 0.10)
    const marginDecimal = (data.margin_percentage || 10) / 100; // M

    // VAT rate as decimal (Sweden = 25% = 0.25)
    const vatRate = data.price_includes_vat !== false ? 0.25 : 0; // V

    // Step 1: Price ex VAT using gross margin formula: P = C ÷ (1 - M)
    const priceExVat = costInSek / (1 - marginDecimal); // P

    // Step 2: Final price incl VAT: F = P × (1 + V)
    const finalPrice = priceExVat * (1 + vatRate); // F

    finalPriceCents = Math.round(finalPrice * 100); // Round to nearest whole number

    // Calculate Systembolaget price if cost_amount is provided
    if (data.cost_amount && data.cost_amount > 0) {
      calculatedSbPrice = calculateSystembolagetPrice(
        data.cost_amount,
        exchangeRate,
        2219, // Fixed 22.19 SEK = 2219 cents
      );
    }
  }

  // Ensure handle is unique (avoid duplicate key on wines_handle_key)
  let handle = data.handle;
  for (let n = 2; ; n++) {
    const { data: existing } = await sb.from("wines").select("id").eq("handle", handle).maybeSingle();
    if (!existing) break;
    handle = `${data.handle}-${n}`;
  }

  // Prepare insert data - only include simplified pricing fields
  const insertData: Record<string, unknown> = {
    handle,
    wine_name: data.wine_name,
    vintage: data.vintage,
    grape_varieties: data.grape_varieties,
    color: data.color,
    label_image_path: data.label_image_path,
    base_price_cents: finalPriceCents,
    producer_id: data.producer_id,
    cost_currency: data.cost_currency,
    cost_amount: data.cost_amount,
    alcohol_tax_cents: 2219,
    price_includes_vat: data.price_includes_vat,
    margin_percentage: data.margin_percentage,
    calculated_price_cents: finalPriceCents,
    supplier_price: data.supplier_price,
    sb_price: calculatedSbPrice,
    volume_liters: data.volume_liters,
    description: buildWineJsonb(data.description ?? null, locale),
    description_html: data.description_html,
    summary: buildWineJsonb(data.summary ?? null, locale),
    terroir_soil: data.terroir_soil ?? null,
    production_method: data.production_method ?? null,
    tasting_profile_character: data.tasting_profile_character ?? null,
    classification: data.classification ?? null,
    tasting_notes: buildWineJsonb(data.tasting_notes ?? null, locale),
    alcohol_percentage: data.alcohol_percentage ?? null,
    farming: data.farming ?? null,
    additives: data.additives ?? null,
    serving_temp_c: data.serving_temp_c ?? null,
    food_pairing: buildWineArrayJsonb(data.food_pairing ?? null, locale),
    winemaker_notes: buildWineJsonb(data.winemaker_notes ?? null, locale),
    awards: buildWineArrayJsonb(data.awards ?? null, locale),
    ageing: buildWineJsonb(data.ageing ?? null, locale),
    soil_type: data.soil_type ?? null,
    elevation_masl: data.elevation_masl ?? null,
    yield_hl_ha: data.yield_hl_ha ?? null,
    appellation: data.appellation ?? null,
    terroir: data.terroir ?? null,
    vinification: data.vinification ?? null,
    abv: data.abv ?? null,
    b2b_price_cents: data.b2b_price_cents ?? null,
    b2b_cost_sek: data.b2b_cost_sek ?? null,
    b2b_margin_percentage: data.b2b_margin_percentage ?? null,
    b2b_stock: data.b2b_stock ?? null,
    is_live: data.is_live ?? true,
  };

  let result = await sb.from("wines").insert(insertData).select(WINES_SELECT_FULL).single();

  if (result.error && (isExtendedEnrichmentColumnMissingError(result.error) || isB2BColumnMissingError(result.error) || isSummaryColumnMissingError(result.error) || isSpecsColumnMissingError(result.error))) {
    const stripExtended = isExtendedEnrichmentColumnMissingError(result.error);
    let insertPayload: Record<string, unknown> = { ...insertData };
    let selectClause = WINES_SELECT_FULL;

    if (stripExtended) {
      const { ageing: _a, soil_type: _s, ...withoutExtended } = insertPayload;
      insertPayload = withoutExtended;
      selectClause = isB2BColumnMissingError(result.error)
        ? WINES_SELECT_WITHOUT_B2B_NO_EXTENDED
        : WINES_SELECT_WITHOUT_EXTENDED_ENRICHMENT;
    }
    if (isB2BColumnMissingError(result.error)) {
      const {
        b2b_margin_percentage: _b2bM,
        b2b_stock: _b2bS,
        b2b_price_cents: _b2bP,
        b2b_cost_sek: _b2bC,
        ...insertWithoutB2B
      } = insertPayload;
      insertPayload = insertWithoutB2B;
      if (!stripExtended) selectClause = WINES_SELECT_WITHOUT_B2B;
    }

    result = await sb.from("wines").insert(insertPayload).select(selectClause).single();
    if (result.error && (isSummaryColumnMissingError(result.error) || isSpecsColumnMissingError(result.error))) {
      const {
        summary: _sum,
        appellation: _app,
        terroir: _t,
        vinification: _v,
        abv: _abv,
        ...insertWithoutSummary
      } = insertPayload;
      result = await sb
        .from("wines")
        .insert(insertWithoutSummary)
        .select(WINES_SELECT_WITHOUT_B2B_NO_SUMMARY)
        .single();
      if (!result.error && result.data)
        result.data = {
          ...result.data,
          b2b_margin_percentage: null,
          b2b_stock: null,
          summary: null,
          appellation: null,
          terroir: null,
          vinification: null,
          abv: null,
          ageing: null,
          soil_type: null,
        } as typeof result.data;
    } else if (!result.error && result.data) {
      result.data = {
        ...result.data,
        b2b_margin_percentage: (result.data as any).b2b_margin_percentage ?? null,
        b2b_stock: (result.data as any).b2b_stock ?? null,
        ...(stripExtended ? { ageing: null, soil_type: null } : {}),
      } as typeof result.data;
    }
  }
  if (result.error) throw new Error(result.error.message);

  const wine = result.data;
  if (!wine) throw new Error("Failed to create wine");

  // Then get the producer information separately
  const { data: producer } = await sb
    .from("producers")
    .select("name")
    .eq("id", wine.producer_id)
    .single();

  const wineWithProducer = {
    ...wine,
    producer: producer,
  };

  revalidatePath("/admin/wines");
  revalidatePath("/producer/wines");
  revalidatePath("/producer");
  return wineWithProducer;
}

export async function updateWine(
  id: string,
  data: Partial<CreateWineData>,
  locale: WineLocale = "sv",
) {
  const sb = getSupabaseAdmin();

  const { data: existing } = await sb
    .from("wines")
    .select(
      "summary, description, tasting_notes, ageing, winemaker_notes, food_pairing, awards, soil_type, additives",
    )
    .eq("id", id)
    .single();

  // Build update data object, excluding undefined values
  const updateData: Record<string, unknown> = {};

  if (data.handle !== undefined) updateData.handle = data.handle;
  if (data.wine_name !== undefined) updateData.wine_name = data.wine_name;
  if (data.vintage !== undefined) updateData.vintage = data.vintage;
  if (data.grape_varieties !== undefined)
    updateData.grape_varieties = data.grape_varieties;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.label_image_path !== undefined)
    updateData.label_image_path = data.label_image_path;
  if (data.base_price_cents !== undefined)
    updateData.base_price_cents = data.base_price_cents;
  if (data.producer_id !== undefined) updateData.producer_id = data.producer_id;
  if (data.cost_currency !== undefined)
    updateData.cost_currency = data.cost_currency;
  if (data.cost_amount !== undefined) updateData.cost_amount = data.cost_amount;
  if (data.price_includes_vat !== undefined)
    updateData.price_includes_vat = data.price_includes_vat;
  if (data.margin_percentage !== undefined)
    updateData.margin_percentage = data.margin_percentage;
  if (data.description !== undefined) {
    updateData.description = buildWineJsonb(
      data.description,
      locale,
      existing?.description as Record<string, string> | null,
    );
  }
  if (data.description_html !== undefined)
    updateData.description_html = data.description_html;
  if (data.summary !== undefined) {
    updateData.summary = buildWineJsonb(
      data.summary,
      locale,
      existing?.summary as Record<string, string> | null,
    );
  }
  if (data.appellation !== undefined) updateData.appellation = data.appellation;
  if (data.terroir !== undefined) updateData.terroir = data.terroir;
  if (data.vinification !== undefined) updateData.vinification = data.vinification;
  if (data.abv !== undefined) updateData.abv = data.abv;
  if (data.b2b_margin_percentage !== undefined)
    updateData.b2b_margin_percentage = data.b2b_margin_percentage;
  if (data.b2b_stock !== undefined)
    updateData.b2b_stock = data.b2b_stock;
  if (data.supplier_price !== undefined)
    updateData.supplier_price = data.supplier_price;
  if (data.volume_liters !== undefined)
    updateData.volume_liters = data.volume_liters;
  if (data.terroir_soil !== undefined)
    updateData.terroir_soil = data.terroir_soil;
  if (data.production_method !== undefined)
    updateData.production_method = data.production_method;
  if (data.tasting_profile_character !== undefined)
    updateData.tasting_profile_character = data.tasting_profile_character;
  if (data.classification !== undefined)
    updateData.classification = data.classification;
  if (data.tasting_notes !== undefined) {
    updateData.tasting_notes = buildWineJsonb(
      data.tasting_notes,
      locale,
      existing?.tasting_notes as Record<string, string> | null,
    );
  }
  if (data.alcohol_percentage !== undefined)
    updateData.alcohol_percentage = data.alcohol_percentage;
  if (data.farming !== undefined) updateData.farming = data.farming;
  if (data.additives !== undefined) {
    updateData.additives = buildWineJsonb(
      data.additives,
      locale,
      existing?.additives as Record<string, string> | string | null,
    );
  }
  if (data.serving_temp_c !== undefined)
    updateData.serving_temp_c = data.serving_temp_c;
  if (data.food_pairing !== undefined) {
    updateData.food_pairing = buildWineArrayJsonb(
      data.food_pairing,
      locale,
      existing?.food_pairing as Record<string, string[]> | null,
    );
  }
  if (data.winemaker_notes !== undefined) {
    updateData.winemaker_notes = buildWineJsonb(
      data.winemaker_notes,
      locale,
      existing?.winemaker_notes as Record<string, string> | null,
    );
  }
  if (data.awards !== undefined) {
    updateData.awards = buildWineArrayJsonb(
      data.awards,
      locale,
      existing?.awards as Record<string, string[]> | null,
    );
  }
  if (data.ageing !== undefined) {
    updateData.ageing = buildWineJsonb(
      data.ageing,
      locale,
      existing?.ageing as Record<string, string> | null,
    );
  }
  if (data.soil_type !== undefined) {
    updateData.soil_type = buildWineJsonb(
      data.soil_type,
      locale,
      existing?.soil_type as Record<string, string> | string | null,
    );
  }
  if (data.elevation_masl !== undefined)
    updateData.elevation_masl = data.elevation_masl;
  if (data.yield_hl_ha !== undefined) updateData.yield_hl_ha = data.yield_hl_ha;
  if (data.b2b_price_cents !== undefined)
    updateData.b2b_price_cents = data.b2b_price_cents;
  if (data.b2b_cost_sek !== undefined)
    updateData.b2b_cost_sek = data.b2b_cost_sek;
  if (data.is_live !== undefined)
    updateData.is_live = data.is_live;

  // Get current wine data for calculation if needed
  let currentWine = null;
  if (
    updateData.cost_amount !== undefined ||
    updateData.price_includes_vat !== undefined ||
    updateData.margin_percentage !== undefined ||
    updateData.cost_currency !== undefined
  ) {
    const { data: wineData } = await sb
      .from("wines")
      .select(
        "cost_amount, cost_currency, alcohol_tax_cents, price_includes_vat, margin_percentage",
      )
      .eq("id", id)
      .single();
    currentWine = wineData;
  }

  // Calculate price manually to avoid trigger loop
  if (
    updateData.cost_amount !== undefined ||
    updateData.price_includes_vat !== undefined ||
    updateData.margin_percentage !== undefined ||
    updateData.cost_currency !== undefined
  ) {
    // Use updated values or current values
    const costAmount = updateData.cost_amount ?? currentWine?.cost_amount ?? 0;
    const costCurrency =
      updateData.cost_currency ?? currentWine?.cost_currency ?? "SEK";
    const priceIncludesVat =
      updateData.price_includes_vat ?? currentWine?.price_includes_vat ?? true;
    const marginPercentage =
      updateData.margin_percentage ?? currentWine?.margin_percentage ?? 10;

    // Fetch current exchange rate if needed
    let exchangeRate = 1.0;
    if (costCurrency !== "SEK") {
      try {
        const rateResponse = await fetch(
          `${getAppUrl()}/api/exchange-rates?from=${costCurrency}&to=SEK`,
        );

        if (rateResponse.ok) {
          const rateData = await rateResponse.json();
          exchangeRate = rateData.rate;
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
      }
    }

    // Use new gross margin formula
    const costAmountInSek = costAmount * exchangeRate;
    const alcoholTaxInSek = 22.19; // Fixed SEK 22.19 per bottle
    const costInSek = costAmountInSek + alcoholTaxInSek; // C = Total cost ex VAT

    const marginDecimal = marginPercentage / 100; // M
    const vatRate = priceIncludesVat ? 0.25 : 0; // V

    // Step 1: Price ex VAT using gross margin formula: P = C ÷ (1 - M)
    const priceExVat = costInSek / (1 - marginDecimal); // P

    // Step 2: Final price incl VAT: F = P × (1 + V)

    const finalPrice = priceExVat * (1 + vatRate); // F
    const finalPriceCents = Math.round(finalPrice * 100); // Round to nearest whole number

    // Add calculated price to update data
    updateData.calculated_price_cents = finalPriceCents;
    updateData.base_price_cents = finalPriceCents; // Also update base_price_cents for compatibility
  }

  // Calculate Systembolaget price if cost_amount is updated
  if (updateData.cost_amount !== undefined && updateData.cost_amount > 0) {
    let exchangeRate = 1.0;
    const costCurrency =
      updateData.cost_currency ?? currentWine?.cost_currency ?? "SEK";

    if (costCurrency !== "SEK") {
      try {
        const rateResponse = await fetch(
          `${getAppUrl()}/api/exchange-rates?from=${costCurrency}&to=SEK`,
        );

        if (rateResponse.ok) {
          const rateData = await rateResponse.json();
          exchangeRate = rateData.rate;
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
      }
    }

    updateData.sb_price = calculateSystembolagetPrice(
      updateData.cost_amount,
      exchangeRate,
      2219, // Fixed 22.19 SEK = 2219 cents
    );
  }

  // Update wine
  let updateResult = await sb
    .from("wines")
    .update(updateData)
    .eq("id", id)
    .select(WINES_SELECT_FULL)
    .single();

  if (updateResult.error && (isExtendedEnrichmentColumnMissingError(updateResult.error) || isB2BColumnMissingError(updateResult.error) || isSummaryColumnMissingError(updateResult.error) || isSpecsColumnMissingError(updateResult.error))) {
    const stripExtended = isExtendedEnrichmentColumnMissingError(updateResult.error);
    let updatePayload: Record<string, unknown> = { ...updateData };
    let selectClause = WINES_SELECT_FULL;

    if (stripExtended) {
      const { ageing: _a, soil_type: _s, ...withoutExtended } = updatePayload;
      updatePayload = withoutExtended;
      selectClause = isB2BColumnMissingError(updateResult.error)
        ? WINES_SELECT_WITHOUT_B2B_NO_EXTENDED
        : WINES_SELECT_WITHOUT_EXTENDED_ENRICHMENT;
    }
    if (isB2BColumnMissingError(updateResult.error)) {
      const { b2b_margin_percentage: _m, b2b_stock: _s, ...updateWithoutB2B } = updatePayload;
      updatePayload = updateWithoutB2B;
      if (!stripExtended) selectClause = WINES_SELECT_WITHOUT_B2B;
    }

    updateResult = await sb
      .from("wines")
      .update(updatePayload)
      .eq("id", id)
      .select(selectClause)
      .single();
    if (updateResult.error && (isSummaryColumnMissingError(updateResult.error) || isSpecsColumnMissingError(updateResult.error))) {
      const {
        summary: _sum,
        appellation: _app,
        terroir: _t,
        vinification: _v,
        abv: _abv,
        ...updateWithoutSummary
      } = updatePayload;
      updateResult = await sb
        .from("wines")
        .update(updateWithoutSummary)
        .eq("id", id)
        .select(WINES_SELECT_WITHOUT_B2B_NO_SUMMARY)
        .single();
      if (!updateResult.error && updateResult.data)
        updateResult.data = {
          ...updateResult.data,
          b2b_margin_percentage: null,
          b2b_stock: null,
          summary: null,
          appellation: null,
          terroir: null,
          vinification: null,
          abv: null,
          ageing: null,
          soil_type: null,
        } as typeof updateResult.data;
    } else if (!updateResult.error && updateResult.data) {
      updateResult.data = {
        ...updateResult.data,
        b2b_margin_percentage: (updateResult.data as any).b2b_margin_percentage ?? null,
        b2b_stock: (updateResult.data as any).b2b_stock ?? null,
        ...(stripExtended ? { ageing: null, soil_type: null } : {}),
      } as typeof updateResult.data;
    }
  }
  if (updateResult.error) {
    console.error("Update wine error:", updateResult.error);
    throw new Error(updateResult.error.message);
  }

  const wine = updateResult.data;
  if (!wine) throw new Error("Failed to update wine");

  // Get producer separately
  const { data: producer } = await sb
    .from("producers")
    .select("name")
    .eq("id", wine.producer_id)
    .single();

  const wineWithProducer = {
    ...wine,
    producer: producer,
  };

  revalidatePath("/admin/wines");
  revalidatePath(`/admin/wines/${id}`);
  revalidatePath("/producer/wines");
  revalidatePath("/producer");
  return wineWithProducer;
}

export async function deleteWine(id: string) {
  const sb = await supabaseServer();

  const { error } = await sb.from("wines").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/wines");
  revalidatePath("/producer/wines");
  revalidatePath("/producer");
}
