import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!)
    : 20;

  const { groupId } = await params;
  const sb = getSupabaseAdmin();

  try {
    // Get all producer IDs from the group
    const { data: members, error: membersError } = await sb
      .from("producer_group_members")
      .select("producer_id")
      .eq("group_id", groupId);

    if (membersError) {
      console.error("Error fetching group members:", membersError);
      return NextResponse.json([]);
    }

    const producerIds = members?.map((m) => m.producer_id) || [];

    if (producerIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch wines from all producers in the group
    const { data: wines, error: winesError } = await sb
      .from("wines")
      .select(`
        id,
        wine_name,
        vintage,
        grape_varieties,
        color,
        handle,
        base_price_cents,
        label_image_path,
        producer_id,
        description,
        description_html,
        producers(name, region)
      `)
      .in("producer_id", producerIds)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (winesError) {
      console.error("Error fetching wines:", winesError);
      return NextResponse.json([]);
    }

    // Convert to Shopify-compatible product format
    const products = (wines || []).map((wine: any) => {
      const grapeVarieties = Array.isArray(wine.grape_varieties)
        ? wine.grape_varieties
        : wine.grape_varieties
          ? wine.grape_varieties.split(",").map((g: string) => g.trim())
          : [];

      return {
        id: wine.id,
        title: `${wine.wine_name} ${wine.vintage}`,
        handle: wine.handle,
        description: wine.description || "",
        descriptionHtml: wine.description_html || "",
        productType: "wine",
        categoryId: wine.producer_id,
        producerId: wine.producer_id,
        producerName: wine.producers?.name || "Unknown",
        featuredImage: {
          url: wine.label_image_path || "/placeholder-wine.jpg",
          altText: wine.wine_name,
        },
        priceRange: {
          minVariantPrice: {
            amount: (wine.base_price_cents / 100).toString(),
            currencyCode: "SEK",
          },
          maxVariantPrice: {
            amount: (wine.base_price_cents / 100).toString(),
            currencyCode: "SEK",
          },
        },
        variants: [
          {
            id: wine.id,
            title: "Default",
            availableForSale: true,
            selectedOptions: [],
            price: {
              amount: (wine.base_price_cents / 100).toString(),
              currencyCode: "SEK",
            },
          },
        ],
        options: [
          {
            id: "color",
            name: "Color",
            values: [wine.color || "red"],
          },
        ],
        tags: grapeVarieties,
        images: [
          {
            url: wine.label_image_path || "/placeholder-wine.jpg",
            altText: wine.wine_name,
          },
        ],
        availableForSale: true,
        seo: {
          title: `${wine.wine_name} ${wine.vintage}`,
          description: wine.description || "",
        },
      };
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error in group products API:", error);
    return NextResponse.json([]);
  }
}

