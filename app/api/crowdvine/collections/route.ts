import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const sb = await supabaseServer();

  try {
    // Get all producers as collections
    const { data: producers, error } = await sb
      .from("producers")
      .select("id, name, region")
      .order("name");

    if (error) throw error;

    // Convert producers to Shopify-compatible collection format
    const producerCollections = (producers || []).map((producer: any) => ({
      id: producer.id,
      handle: producer.name.toLowerCase().replace(/\s+/g, "-"),
      title: producer.name,
      description: `Wines from ${producer.name} in ${producer.region}`,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }));

    // Add wine boxes collection
    const wineBoxesCollection = {
      id: "wine-boxes-collection",
      handle: "wine-boxes",
      title: "Wine Boxes",
      description: "Curated wine packages with 3 or 6 bottles featuring organic, light reds, pet-nat, and more",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const collections = [wineBoxesCollection, ...producerCollections];

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 },
    );
  }
}
