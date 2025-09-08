import { supabaseServer } from "@/lib/supabase-server";

export interface WineBoxCalculation {
  wineBoxId: string;
  name: string;
  description: string;
  handle: string;
  imageUrl: string;
  totalWinePrice: number; // Sum of individual wine prices
  marginAmount: number; // Margin amount in SEK
  finalPrice: number; // Final price with margin
  discountAmount: number; // Discount compared to individual prices
  discountPercentage: number; // Discount percentage
  bottleCount: number;
  wines: Array<{
    wineId: string;
    wineName: string;
    vintage: string;
    price: number;
    quantity: number;
  }>;
}

export async function calculateWineBoxPrice(wineBoxId: string): Promise<WineBoxCalculation | null> {
  const sb = await supabaseServer();

  try {
    // Get wine box with items and wine details
    const { data: wineBoxData, error: wineBoxError } = await sb
      .from("wine_boxes")
      .select(`
        id,
        name,
        description,
        handle,
        image_url,
        margin_percentage,
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
      `)
      .eq("id", wineBoxId)
      .single();

    if (wineBoxError || !wineBoxData) {
      console.error("Error fetching wine box:", wineBoxError);
      return null;
    }

    // Calculate total wine price
    let totalWinePrice = 0;
    let bottleCount = 0;
    const wines: Array<{
      wineId: string;
      wineName: string;
      vintage: string;
      price: number;
      quantity: number;
    }> = [];

    for (const item of wineBoxData.wine_box_items) {
      const wine = item.wines;
      const winePrice = wine.base_price_cents / 100; // Convert to SEK
      const itemTotal = winePrice * item.quantity;
      
      totalWinePrice += itemTotal;
      bottleCount += item.quantity;
      
      wines.push({
        wineId: wine.id,
        wineName: wine.wine_name,
        vintage: wine.vintage,
        price: winePrice,
        quantity: item.quantity,
      });
    }

    // Calculate margin and final price
    const marginAmount = totalWinePrice * (wineBoxData.margin_percentage / 100);
    const finalPrice = totalWinePrice + marginAmount;

    // Calculate discount (assuming we want to show savings compared to individual prices)
    // For now, let's assume a 10% discount on the box
    const discountPercentage = 10; // This could be configurable
    const discountAmount = totalWinePrice * (discountPercentage / 100);

    return {
      wineBoxId,
      name: wineBoxData.name,
      description: wineBoxData.description,
      handle: wineBoxData.handle,
      imageUrl: wineBoxData.image_url,
      totalWinePrice,
      marginAmount,
      finalPrice,
      discountAmount,
      discountPercentage,
      bottleCount,
      wines,
    };
  } catch (error) {
    console.error("Error calculating wine box price:", error);
    return null;
  }
}

export async function getAllWineBoxCalculations(): Promise<WineBoxCalculation[]> {
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
      wineBoxes.map(box => calculateWineBoxPrice(box.id))
    );

    return calculations.filter((calc): calc is WineBoxCalculation => calc !== null);
  } catch (error) {
    console.error("Error getting all wine box calculations:", error);
    return [];
  }
}

