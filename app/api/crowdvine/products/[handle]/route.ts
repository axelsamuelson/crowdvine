import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const sb = await supabaseServer();
  const resolvedParams = await params;

  // First get the wine ID from handle
  const { data: wineIdData, error: wineIdError } = await sb
    .from("wines")
    .select("id")
    .eq("handle", resolvedParams.handle)
    .single();

  if (wineIdError || !wineIdData)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Use fallback method since RPC function might not be available yet
  let data;
  let error;

  try {
    // Try to get wine with basic query first
    const result = await sb
      .from("wines")
      .select(
        `
        id,
        wine_name,
        vintage,
        grape_varieties,
        color,
        handle,
        base_price_cents,
        label_image_path,
        producer_id
      `,
      )
      .eq("id", wineIdData.id)
      .single();
    data = result.data;
    error = result.error;
  } catch (e) {
    console.error("Error fetching wine:", e);
    return NextResponse.json(
      { error: "Failed to fetch wine" },
      { status: 500 },
    );
  }

  if (error || !data)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Get wine images
  const { data: wineImages } = await sb
    .from("wine_images")
    .select("image_path, alt_text, sort_order, is_primary")
    .eq("wine_id", wineIdData.id)
    .order("sort_order", { ascending: true });

  const i = data;

  // Parse grape varieties from string or use array
  const grapeVarieties = Array.isArray(i.grape_varieties)
    ? i.grape_varieties
    : i.grape_varieties
      ? i.grape_varieties.split(",").map((g: string) => g.trim())
      : [];

  // Use color_name if available, otherwise use color
  const colorName = i.color;

  // Get images for this wine
  const images = wineImages && wineImages.length > 0 
    ? wineImages.map((img: any) => ({
        id: `${i.id}-img-${img.sort_order}`,
        url: img.image_path,
        altText: img.alt_text || i.wine_name,
        width: 600,
        height: 600,
      }))
    : [
        {
          id: `${i.id}-img`,
          url: i.label_image_path || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
          altText: i.wine_name,
          width: 600,
          height: 600,
        },
      ];

  const featuredImage = images[0] || {
    id: `${i.id}-img`,
    url: i.label_image_path || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
    altText: i.wine_name,
    width: 600,
    height: 600,
  };

  const product = {
    id: i.id,
    title: `${i.wine_name} ${i.vintage}`,
    description: grapeVarieties.join(", ") || "",
    descriptionHtml: "",
    handle: i.handle,
    productType: "wine",
    categoryId: i.producer_id,
    options: [
      // Add grape varieties as an option
      {
        id: "grape-varieties",
        name: "Grape Varieties",
        values: grapeVarieties,
      },
      // Add color as an option
      {
        id: "color",
        name: "Color",
        values: colorName ? [colorName] : [],
      },
    ],
    variants: [
      {
        id: `${i.id}-default`,
        title: "750 ml",
        availableForSale: true,
        price: {
          amount: Math.ceil(i.base_price_cents / 100).toString(),
          currencyCode: "SEK",
        },
        selectedOptions: [
          // Add grape varieties to variant
          ...grapeVarieties.map((grape: string) => ({
            name: "Grape Varieties",
            value: grape,
          })),
          // Add color to variant
          ...(colorName
            ? [
                {
                  name: "Color",
                  value: colorName,
                },
              ]
            : []),
        ],
      },
    ],
    priceRange: {
      minVariantPrice: {
        amount: Math.ceil(i.base_price_cents / 100).toString(),
        currencyCode: "SEK",
      },
      maxVariantPrice: {
        amount: Math.ceil(i.base_price_cents / 100).toString(),
        currencyCode: "SEK",
      },
    },
    featuredImage,
    images,
    seo: { title: i.wine_name, description: grapeVarieties.join(", ") || "" },
    tags: [
      // Add grape varieties as tags
      ...grapeVarieties,
      // Add color as tag
      ...(colorName ? [colorName] : []),
    ],
    availableForSale: true,
    currencyCode: "SEK",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(product);
}
