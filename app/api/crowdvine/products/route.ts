import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!)
    : 200;

  const sb = await supabaseServer();

  // Use fallback method since RPC function might not be available yet
  let data;
  let error;

  try {
    // Try to get wines with basic query first
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
        producer_id,
        description,
        description_html
      `,
      )
      .limit(limit);
    data = result.data;
    error = result.error;
  } catch (e) {
    console.error("Error fetching wines:", e);
    return NextResponse.json(
      { error: "Failed to fetch wines" },
      { status: 500 },
    );
  }

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Get wine images for all wines
  const wineIds = data?.map((wine: any) => wine.id) || [];
  let wineImagesMap = new Map();
  
  if (wineIds.length > 0) {
    const { data: wineImages } = await sb
      .from("wine_images")
      .select("wine_id, image_path, alt_text, sort_order, is_primary")
      .in("wine_id", wineIds)
      .order("sort_order", { ascending: true });

    // Group images by wine_id
    wineImages?.forEach((image: any) => {
      if (!wineImagesMap.has(image.wine_id)) {
        wineImagesMap.set(image.wine_id, []);
      }
      wineImagesMap.get(image.wine_id).push(image);
    });
  }

  // Forma Product-minimum som UI:et använder
  const products = (data ?? []).map((i: any) => {
    // Parse grape varieties from string or use array
    const grapeVarieties = Array.isArray(i.grape_varieties)
      ? i.grape_varieties
      : i.grape_varieties
        ? i.grape_varieties.split(",").map((g: string) => g.trim())
        : [];

    // Use color_name if available, otherwise use color
    const colorName = i.color_name || i.color;

    // Get images for this wine
    const wineImages = wineImagesMap.get(i.id) || [];
    const images = wineImages.length > 0 
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

    // Use custom description or generate default one
    const wineDescription = i.description || 
      `This exceptional ${i.color || 'wine'} wine from ${i.vintage} showcases the unique characteristics of ${i.grape_varieties || 'carefully selected grapes'}. Crafted with precision and passion, this wine offers a perfect balance of flavors and aromas that will delight your palate.`;
    
    const wineDescriptionHtml = i.description_html || `<p>${wineDescription}</p>`;

    return {
      id: i.id,
      title: `${i.wine_name} ${i.vintage}`,
      description: wineDescription,
      descriptionHtml: wineDescriptionHtml,
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
      seo: { title: i.wine_name, description: "" },
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
  });

  return NextResponse.json(products);
}
