"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { calculateSystembolagetPrice } from "@/lib/systembolaget-pricing";

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
}

export async function getWines() {
  const sb = await supabaseServer();

  // Get all wines
  const { data: wines, error } = await sb
    .from("wines")
    .select(
      `
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
      created_at,
      updated_at
    `,
    )
    .order("wine_name");

  if (error) throw new Error(error.message);

  // Get all producers for the wines
  const producerIds = [...new Set(wines.map((wine) => wine.producer_id))];
  const { data: producers } = await sb
    .from("producers")
    .select("id, name")
    .in("id", producerIds);

  // Create a map for quick lookup
  const producerMap = new Map(producers?.map((p) => [p.id, p]) || []);

  // Combine wines with their producers
  const winesWithProducers = wines.map((wine) => ({
    ...wine,
    producer: producerMap.get(wine.producer_id),
  }));

  return winesWithProducers;
}

export async function getWine(id: string) {
  const sb = await supabaseServer();

  // First get the wine
  const { data: wine, error } = await sb
    .from("wines")
    .select(
      `
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
      created_at,
      updated_at
    `,
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

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
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/exchange-rates?from=${data.cost_currency}&to=SEK`
        );
        
        if (rateResponse.ok) {
          const rateData = await rateResponse.json();
          exchangeRate = rateData.rate;
        } else {
          console.warn(`Failed to fetch exchange rate for ${data.cost_currency}, using 1.0`);
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
      }
    }

    const costInSek = data.cost_amount * exchangeRate;
    const priceBeforeTax =
      costInSek * (1 + (data.margin_percentage || 30) / 100);
    const priceAfterTax =
      priceBeforeTax + (data.alcohol_tax_cents || 0) / 100.0;
    const finalPrice =
      data.price_includes_vat !== false ? priceAfterTax : priceAfterTax * 1.25;
    finalPriceCents = Math.ceil(finalPrice * 100); // Round up to nearest cent

    // Calculate Systembolaget price if cost_amount is provided
    if (data.cost_amount && data.cost_amount > 0) {
      calculatedSbPrice = calculateSystembolagetPrice(
        data.cost_amount,
        exchangeRate,
        data.alcohol_tax_cents || 0,
      );
    }
  }

  // Prepare insert data - only include simplified pricing fields
  const insertData = {
    handle: data.handle,
    wine_name: data.wine_name,
    vintage: data.vintage,
    grape_varieties: data.grape_varieties,
    color: data.color,
    label_image_path: data.label_image_path,
    base_price_cents: finalPriceCents,
    producer_id: data.producer_id,
    // Simplified pricing fields
    cost_currency: data.cost_currency,
    cost_amount: data.cost_amount,
    alcohol_tax_cents: data.alcohol_tax_cents,
    price_includes_vat: data.price_includes_vat,
    margin_percentage: data.margin_percentage,
    // Systembolaget fields
    calculated_price_cents: finalPriceCents,
    supplier_price: data.supplier_price,
    sb_price: calculatedSbPrice,
    volume_liters: data.volume_liters,
    // Description fields
    description: data.description,
    description_html: data.description_html,
  };

  // First create the wine
  const { data: wine, error } = await sb
    .from("wines")
    .insert(insertData)
    .select(
      `
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
      created_at,
      updated_at
    `,
    )
    .single();

  if (error) throw new Error(error.message);

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
  return wineWithProducer;
}

export async function updateWine(id: string, data: Partial<CreateWineData>) {
  const sb = await supabaseServer();

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
  if (data.exchange_rate_source !== undefined)
    updateData.exchange_rate_source = data.exchange_rate_source;
  if (data.exchange_rate_date !== undefined)
    updateData.exchange_rate_date = data.exchange_rate_date;
  if (data.exchange_rate_period_start !== undefined)
    updateData.exchange_rate_period_start = data.exchange_rate_period_start;
  if (data.exchange_rate_period_end !== undefined)
    updateData.exchange_rate_period_end = data.exchange_rate_period_end;
  if (data.exchange_rate !== undefined)
    updateData.exchange_rate = data.exchange_rate;
  if (data.alcohol_tax_cents !== undefined)
    updateData.alcohol_tax_cents = data.alcohol_tax_cents;
  if (data.price_includes_vat !== undefined)
    updateData.price_includes_vat = data.price_includes_vat;
  if (data.margin_percentage !== undefined)
    updateData.margin_percentage = data.margin_percentage;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.description_html !== undefined)
    updateData.description_html = data.description_html;
  if (data.supplier_price !== undefined)
    updateData.supplier_price = data.supplier_price;
  if (data.volume_liters !== undefined)
    updateData.volume_liters = data.volume_liters;

  // Calculate price manually to avoid trigger loop
  if (
    updateData.cost_amount !== undefined ||
    updateData.exchange_rate !== undefined ||
    updateData.alcohol_tax_cents !== undefined ||
    updateData.price_includes_vat !== undefined ||
    updateData.margin_percentage !== undefined
  ) {
    // Get current wine data for calculation
    const { data: currentWine } = await sb
      .from("wines")
      .select(
        "cost_amount, exchange_rate, alcohol_tax_cents, price_includes_vat, margin_percentage, volume_liters",
      )
      .eq("id", id)
      .single();

    // Use updated values or current values
    const costAmount = updateData.cost_amount ?? currentWine?.cost_amount ?? 0;
    const exchangeRate =
      updateData.exchange_rate ?? currentWine?.exchange_rate ?? 1.0;
    const alcoholTaxCents =
      updateData.alcohol_tax_cents ?? currentWine?.alcohol_tax_cents ?? 0;
    const priceIncludesVat =
      updateData.price_includes_vat ?? currentWine?.price_includes_vat ?? true;
    const marginPercentage =
      updateData.margin_percentage ?? currentWine?.margin_percentage ?? 30;

    // Calculate price manually
    const costInSek = costAmount * exchangeRate;
    const priceBeforeTax = costInSek * (1 + marginPercentage / 100);
    const priceAfterTax = priceBeforeTax + alcoholTaxCents / 100.0;
    const finalPrice = priceIncludesVat ? priceAfterTax : priceAfterTax * 1.25;
    const finalPriceCents = Math.ceil(finalPrice * 100); // Round up to nearest cent

    // Add calculated price to update data
    updateData.calculated_price_cents = finalPriceCents;
    updateData.base_price_cents = finalPriceCents; // Also update base_price_cents for compatibility
  }

  // Calculate Systembolaget price if cost_amount is updated
  if (updateData.cost_amount !== undefined && updateData.cost_amount > 0) {
    const exchangeRate =
      updateData.exchange_rate ?? currentWine?.exchange_rate ?? 1.0;
    const alcoholTaxCents =
      updateData.alcohol_tax_cents ?? currentWine?.alcohol_tax_cents ?? 0;
    updateData.sb_price = calculateSystembolagetPrice(
      updateData.cost_amount,
      exchangeRate,
      alcoholTaxCents,
    );
  }

  // Update wine
  const { data: wine, error } = await sb
    .from("wines")
    .update(updateData)
    .eq("id", id)
    .select(
      `
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
      created_at,
      updated_at
    `,
    )
    .single();

  if (error) {
    console.error("Update wine error:", error);
    throw new Error(error.message);
  }

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
  return wineWithProducer;
}

export async function deleteWine(id: string) {
  const sb = await supabaseServer();

  const { error } = await sb.from("wines").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/wines");
}
