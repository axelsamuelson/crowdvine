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
            cost_amount,
            exchange_rate,
            alcohol_tax_cents,
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
      
      // Calculate wine cost in SEK using cost_amount and exchange_rate
      const costInSek = wine.cost_amount * (wine.exchange_rate || 1.0);
      
      // Add alcohol tax
      const winePrice = costInSek + (wine.alcohol_tax_cents || 0) / 100;
      
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

    // Calculate discount compared to individual wine prices
    // Use base_price_cents which already includes individual wine margins
    let totalIndividualWinePrice = 0;
    for (const item of wineBoxData.wine_box_items) {
      const wine = item.wines;
      
      // Use base_price_cents which is the individual wine price (already includes margin)
      const individualWinePrice = wine.base_price_cents / 100; // Convert to SEK
      
      totalIndividualWinePrice += individualWinePrice * item.quantity;
    }
    
    // Calculate discount compared to individual prices
    const discountAmount = totalIndividualWinePrice - finalPrice;
    const discountPercentage = (discountAmount / totalIndividualWinePrice) * 100;

    return {
      wineBoxId,
      name: wineBoxData.name,
      description: wineBoxData.description,
      handle: wineBoxData.handle,
      imageUrl: wineBoxData.image_url,
      totalWinePrice: totalIndividualWinePrice, // Use individual wine prices for discount calculation
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

