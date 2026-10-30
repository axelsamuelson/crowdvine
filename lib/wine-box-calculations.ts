import { supabaseServer } from "@/lib/supabase-server";

// Cache for wine box calculations
const calculationCache = new Map<
  string,
  { data: WineBoxCalculation; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface WineBoxLineInput {
  wineId: string;
  wineName: string;
  vintage: string;
  /** Customer-facing bottle list price in öre (inkl. moms), same as producer boxes. */
  basePriceCents: number;
  quantity: number;
}

export interface WineBoxCalculation {
  wineBoxId: string;
  name: string;
  description: string;
  handle: string;
  imageUrl: string;
  totalWinePrice: number; // Sum of individual wine list prices (inkl. moms)
  marginAmount: number; // Kept for callers; always 0 under bottle-sum pricing
  finalPrice: number; // Box price = sum of bottle list prices (inkl. moms)
  /** Total in öre; matches producer-box totalCents. */
  totalCents: number;
  discountAmount: number; // Discount compared to individual prices (0 under new pricing)
  discountPercentage: number; // Discount percentage (0 under new pricing)
  bottleCount: number;
  wines: Array<{
    wineId: string;
    wineName: string;
    vintage: string;
    price: number;
    quantity: number;
  }>;
}

/**
 * Bottle list price in öre — same source producer boxes use (`wines.base_price_cents`).
 */
export function wineBoxBottlePriceCents(
  basePriceCents: number | null | undefined,
): number | undefined {
  return basePriceCents != null && Number.isFinite(basePriceCents)
    ? basePriceCents
    : undefined;
}

/**
 * Pure wine-box pricing: box price = Σ (bottle list price × quantity), inkl. moms.
 * Reuses the same per-bottle list price producer boxes sum (`base_price_cents`).
 */
export function computeWineBoxPriceFromLines(
  lines: readonly WineBoxLineInput[],
): {
  totalCents: number;
  finalPrice: number;
  totalWinePrice: number;
  marginAmount: number;
  discountAmount: number;
  discountPercentage: number;
  bottleCount: number;
  wines: WineBoxCalculation["wines"];
} {
  let totalCents = 0;
  let bottleCount = 0;
  const wines: WineBoxCalculation["wines"] = [];

  for (const line of lines) {
    const priceCents = wineBoxBottlePriceCents(line.basePriceCents) ?? 0;
    const quantity = Math.max(0, Math.floor(line.quantity) || 0);
    totalCents += priceCents * quantity;
    bottleCount += quantity;
    wines.push({
      wineId: line.wineId,
      wineName: line.wineName,
      vintage: line.vintage,
      price: priceCents / 100,
      quantity,
    });
  }

  const finalPrice = totalCents / 100;

  return {
    totalCents,
    finalPrice,
    totalWinePrice: finalPrice,
    marginAmount: 0,
    discountAmount: 0,
    discountPercentage: 0,
    bottleCount,
    wines,
  };
}

export async function calculateWineBoxPrice(
  wineBoxId: string,
): Promise<WineBoxCalculation | null> {
  // Check cache first
  const cached = calculationCache.get(wineBoxId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const sb = await supabaseServer();

  try {
    // Get wine box with items and wine details
    const { data: wineBoxData, error: wineBoxError } = await sb
      .from("wine_boxes")
      .select(
        `
        id,
        name,
        description,
        handle,
        image_url,
        wine_box_items (
          id,
          wine_id,
          quantity,
          wines (
            id,
            wine_name,
            vintage,
            base_price_cents
          )
        )
      `,
      )
      .eq("id", wineBoxId)
      .single();

    if (wineBoxError || !wineBoxData) {
      console.error("Error fetching wine box:", wineBoxError);
      return null;
    }

    const lines: WineBoxLineInput[] = (wineBoxData.wine_box_items ?? []).map(
      (item: {
        wine_id: string;
        quantity: number;
        wines: {
          id: string;
          wine_name: string;
          vintage: string;
          base_price_cents: number | null;
        };
      }) => {
        const wine = item.wines;
        return {
          wineId: wine?.id ?? item.wine_id,
          wineName: wine?.wine_name ?? "",
          vintage: wine?.vintage ?? "",
          basePriceCents: wine?.base_price_cents ?? 0,
          quantity: item.quantity,
        };
      },
    );

    const priced = computeWineBoxPriceFromLines(lines);

    const result: WineBoxCalculation = {
      wineBoxId,
      name: wineBoxData.name,
      description: wineBoxData.description,
      handle: wineBoxData.handle,
      imageUrl: wineBoxData.image_url,
      ...priced,
    };

    // Cache the result
    calculationCache.set(wineBoxId, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error("Error calculating wine box price:", error);
    return null;
  }
}

export async function getAllWineBoxCalculations(): Promise<
  WineBoxCalculation[]
> {
  // Check if we have cached results for all wine boxes
  const cacheKey = "all-wine-boxes";
  const cached = calculationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as WineBoxCalculation[];
  }

  const sb = await supabaseServer();

  try {
    // Get all active wine boxes
    const { data: wineBoxes, error } = await sb
      .from("wine_boxes")
      .select("id")
      .eq("is_active", true);

    if (error || !wineBoxes) {
      console.error("Error fetching wine boxes:", error);
      return [];
    }

    // Calculate prices for all wine boxes
    const calculations = await Promise.all(
      wineBoxes.map((box) => calculateWineBoxPrice(box.id)),
    );

    const result = calculations.filter(
      (calc): calc is WineBoxCalculation => calc !== null,
    );

    // Cache the result
    calculationCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error("Error getting all wine box calculations:", error);
    return [];
  }
}
