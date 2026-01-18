import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/user/wine-recommendation
 *
 * Returns a wine recommendation, optionally filtered by weather/temperature
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const temp = searchParams.get("temp") ? parseFloat(searchParams.get("temp")!) : null;
    const condition = searchParams.get("condition") || null;

    const sb = getSupabaseAdmin();

    let query = sb
      .from("wines")
      .select(
        `
        id,
        wine_name,
        vintage,
        grape_varieties,
        color,
        handle,
        description,
        producers!inner(name)
      `,
      );

    // Optional: Filter by color based on temperature
    // Cold weather -> red wine, warm weather -> white/rosé
    let wines;
    let error;
    
    if (temp !== null) {
      if (temp < 10) {
        // Cold weather - prefer red wines
        const redQuery = query.in("color", ["red", "rött", "Red", "Rött"]);
        const result = await redQuery.limit(100);
        wines = result.data;
        error = result.error;
        
        // If no red wines found, fallback to all wines
        if (!wines || wines.length === 0) {
          const fallbackResult = await sb
            .from("wines")
            .select(
              `
              id,
              wine_name,
              vintage,
              grape_varieties,
              color,
              handle,
              description,
              producers!inner(name)
            `,
            )
            .limit(100);
          wines = fallbackResult.data;
          error = fallbackResult.error;
        }
      } else if (temp > 20) {
        // Warm weather - prefer white/rosé
        const whiteQuery = query.in("color", ["white", "vitt", "rosé", "rosévin", "White", "Vitt", "Rosé"]);
        const result = await whiteQuery.limit(100);
        wines = result.data;
        error = result.error;
        
        // If no white/rosé wines found, fallback to all wines
        if (!wines || wines.length === 0) {
          const fallbackResult = await sb
            .from("wines")
            .select(
              `
              id,
              wine_name,
              vintage,
              grape_varieties,
              color,
              handle,
              description,
              producers!inner(name)
            `,
            )
            .limit(100);
          wines = fallbackResult.data;
          error = fallbackResult.error;
        }
      } else {
        // Moderate temperature - any color
        const result = await query.limit(100);
        wines = result.data;
        error = result.error;
      }
    } else {
      // No temperature filter - get any wine
      const result = await query.limit(100);
      wines = result.data;
      error = result.error;
    }

    if (error) throw error;

    if (!wines || wines.length === 0) {
      return NextResponse.json(
        { error: "No wines found" },
        { status: 404 },
      );
    }

    // Pick a random wine
    const randomWine = wines[Math.floor(Math.random() * wines.length)];

    // Parse grape varieties
    const grapeVarieties = Array.isArray(randomWine.grape_varieties)
      ? randomWine.grape_varieties
      : randomWine.grape_varieties
        ? randomWine.grape_varieties.split(",").map((g: string) => g.trim())
        : [];

    const mainGrape = grapeVarieties[0] || "druvor";

    // Get color in Swedish
    const colorMap: { [key: string]: string } = {
      red: "rött",
      rött: "rött",
      Red: "rött",
      Rött: "rött",
      white: "vitt",
      vitt: "vitt",
      White: "vitt",
      Vitt: "vitt",
      rosé: "rosé",
      rosévin: "rosé",
      Rosé: "rosé",
      Rosévin: "rosé",
    };

    const colorSwedish = colorMap[randomWine.color] || randomWine.color || "vin";

    return NextResponse.json({
      wine: {
        id: randomWine.id,
        name: randomWine.wine_name,
        producer: randomWine.producers?.name || "Okänd producent",
        vintage: randomWine.vintage,
        color: colorSwedish,
        grapeVarieties: grapeVarieties,
        mainGrape: mainGrape,
        handle: randomWine.handle,
        description: randomWine.description,
      },
    });
  } catch (error) {
    console.error("Error fetching wine recommendation:", error);
    return NextResponse.json(
      { error: "Failed to fetch wine recommendation" },
      { status: 500 },
    );
  }
}

