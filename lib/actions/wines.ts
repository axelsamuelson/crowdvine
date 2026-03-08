"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { calculateSystembolagetPrice } from "@/lib/systembolaget-pricing";
import { getAppUrl } from "@/lib/app-url";

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
  volume_liters,
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
  volume_liters,
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

function isOptionalColumnMissingError(error: { message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return /terroir_soil|production_method|tasting_profile_character|classification|tasting_notes|alcohol_percentage|column.*does not exist/i.test(msg);
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

  if (error && (isB2BColumnMissingError(error) || isOptionalColumnMissingError(error) || isSummaryColumnMissingError(error) || isSpecsColumnMissingError(error))) {
    const fallbackSelect = isOptionalColumnMissingError(error) ? WINES_SELECT_LEGACY : WINES_SELECT_WITHOUT_B2B;
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
      wines = (fallback.data ?? []).map((w: any) => ({
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
      }));
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

  if (error && (isB2BColumnMissingError(error) || isOptionalColumnMissingError(error) || isSummaryColumnMissingError(error) || isSpecsColumnMissingError(error))) {
    const fallbackSelect = isOptionalColumnMissingError(error) ? WINES_SELECT_LEGACY : WINES_SELECT_WITHOUT_B2B;
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
      wine = {
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
      } as any;
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

export async function createWine(data: CreateWineData) {
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
    description: data.description,
    description_html: data.description_html,
    summary: data.summary ?? null,
    terroir_soil: data.terroir_soil ?? null,
    production_method: data.production_method ?? null,
    tasting_profile_character: data.tasting_profile_character ?? null,
    classification: data.classification ?? null,
    tasting_notes: data.tasting_notes ?? null,
    alcohol_percentage: data.alcohol_percentage ?? null,
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

  if (result.error && (isB2BColumnMissingError(result.error) || isSummaryColumnMissingError(result.error) || isSpecsColumnMissingError(result.error))) {
    const { b2b_margin_percentage: _b2bM, b2b_stock: _b2bS, ...insertWithoutB2B } = insertData;
    result = await sb.from("wines").insert(insertWithoutB2B).select(WINES_SELECT_WITHOUT_B2B).single();
    if (result.error && (isSummaryColumnMissingError(result.error) || isSpecsColumnMissingError(result.error))) {
      const { summary: _sum, appellation: _a, terroir: _t, vinification: _v, abv: _abv, ...insertWithoutSummary } = insertWithoutB2B;
      result = await sb.from("wines").insert(insertWithoutSummary).select(WINES_SELECT_WITHOUT_B2B_NO_SUMMARY).single();
      if (!result.error && result.data)
        result.data = { ...result.data, b2b_margin_percentage: null, b2b_stock: null, summary: null, appellation: null, terroir: null, vinification: null, abv: null } as typeof result.data;
    } else if (!result.error && result.data) {
      result.data = { ...result.data, b2b_margin_percentage: null, b2b_stock: null } as typeof result.data;
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

export async function updateWine(id: string, data: Partial<CreateWineData>) {
  const sb = getSupabaseAdmin();

  // Build update data object, excluding undefined values
  const updateData: any = {};

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
  if (data.description !== undefined) updateData.description = data.description;
  if (data.description_html !== undefined)
    updateData.description_html = data.description_html;
  if (data.summary !== undefined) updateData.summary = data.summary;
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
  if (data.tasting_notes !== undefined)
    updateData.tasting_notes = data.tasting_notes;
  if (data.alcohol_percentage !== undefined)
    updateData.alcohol_percentage = data.alcohol_percentage;
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

  if (updateResult.error && (isB2BColumnMissingError(updateResult.error) || isSummaryColumnMissingError(updateResult.error) || isSpecsColumnMissingError(updateResult.error))) {
    const { b2b_margin_percentage: _m, b2b_stock: _s, ...updateWithoutB2B } = updateData;
    updateResult = await sb
      .from("wines")
      .update(updateWithoutB2B)
      .eq("id", id)
      .select(WINES_SELECT_WITHOUT_B2B)
      .single();
    if (updateResult.error && (isSummaryColumnMissingError(updateResult.error) || isSpecsColumnMissingError(updateResult.error))) {
      const { summary: _sum, appellation: _a, terroir: _t, vinification: _v, abv: _abv, ...updateWithoutSummary } = updateWithoutB2B;
      updateResult = await sb
        .from("wines")
        .update(updateWithoutSummary)
        .eq("id", id)
        .select(WINES_SELECT_WITHOUT_B2B_NO_SUMMARY)
        .single();
      if (!updateResult.error && updateResult.data)
        updateResult.data = { ...updateResult.data, b2b_margin_percentage: null, b2b_stock: null, summary: null, appellation: null, terroir: null, vinification: null, abv: null } as typeof updateResult.data;
    } else if (!updateResult.error && updateResult.data) {
      updateResult.data = { ...updateResult.data, b2b_margin_percentage: null, b2b_stock: null } as typeof updateResult.data;
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
