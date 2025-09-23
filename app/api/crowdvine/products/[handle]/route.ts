import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const sb = getSupabaseAdmin(); // Use admin client to bypass RLS
  const resolvedParams = await params;

  // Check if this is a wine box handle
  if (resolvedParams.handle.startsWith("wine-box-")) {
    const wineBoxId = resolvedParams.handle.replace("wine-box-", "");
    
    try {
      // Get wine box calculations
      const { getAllWineBoxCalculations } = await import("@/lib/wine-box-calculations");
      const calculations = await getAllWineBoxCalculations();
      
      // Find the specific wine box
      const calc = calculations.find(c => c.wineBoxId === wineBoxId);
      
      if (!calc) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      // Convert to Shopify-compatible product format
      const product = {
        id: calc.wineBoxId,
        title: calc.name,
        description: calc.description,
        descriptionHtml: `<p>${calc.description}</p>`,
        handle: `wine-box-${calc.wineBoxId}`,
        productType: "wine-box",
        categoryId: "wine-boxes-collection",
        priceRange: {
          minVariantPrice: { 
            amount: calc.finalPrice.toFixed(2), 
            currencyCode: "SEK" 
          },
          maxVariantPrice: { 
            amount: calc.finalPrice.toFixed(2), 
            currencyCode: "SEK" 
          },
        },
        featuredImage: {
          id: `${calc.wineBoxId}-img`,
          url: calc.imageUrl || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
          altText: calc.name,
          width: 600,
          height: 600,
        },
        images: [
          {
            id: `${calc.wineBoxId}-img`,
            url: calc.imageUrl || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
            altText: calc.name,
            width: 600,
            height: 600,
          },
        ],
        variants: [
          {
            id: `${calc.wineBoxId}-variant`,
            title: `${calc.bottleCount} Bottles`,
            availableForSale: true,
            price: { 
              amount: calc.finalPrice.toFixed(2), 
              currencyCode: "SEK" 
            },
              selectedOptions: [
                { name: "Size", value: `${calc.bottleCount} Bottles` },
                { name: "Discount", value: `${Math.round(calc.discountPercentage)}% off` },
              ],
          },
        ],
        options: [
          {
            id: "size",
            name: "Size",
            values: [
              {
                id: `${calc.bottleCount}-bottles`,
                name: `${calc.bottleCount} Bottles`,
              },
            ],
          },
          {
            id: "discount",
            name: "Discount",
            values: [
              {
                id: `${Math.round(calc.discountPercentage)}-discount`,
                name: `${Math.round(calc.discountPercentage)}% off`,
              },
            ],
          },
        ],
        tags: [`${calc.bottleCount}-bottles`, `${calc.discountPercentage}-discount`],
        seo: { 
          title: calc.name, 
          description: calc.description 
        },
        availableForSale: true,
        currencyCode: "SEK",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        // Add custom fields for discount information
        discountInfo: {
          totalWinePrice: calc.totalWinePrice,
          discountAmount: calc.discountAmount,
          discountPercentage: calc.discountPercentage,
          finalPrice: calc.finalPrice,
          wines: calc.wines,
        },
      };

      return NextResponse.json(product);
    } catch (error) {
      console.error("Error fetching wine box:", error);
      return NextResponse.json(
        { error: "Failed to fetch wine box" },
        { status: 500 },
      );
    }
  }

  // Handle regular wine products
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
        producer_id,
        description,
        description_html,
        producers!inner(name)
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

  // Helper function to convert relative paths to full URLs
  const convertToFullUrl = (path: string | null | undefined): string => {
    // Always return fallback image for now since Supabase Storage images don't exist
    return "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop";
    
    // Original logic (commented out until Supabase Storage is properly configured)
    /*
    if (!path) return "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop";
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads/')) {
      // This is a Supabase Storage file, construct proper Supabase Storage URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://abrnvjqwpdkodgrtezeg.supabase.co';
      const fileName = path.replace('/uploads/', '');
      return `${supabaseUrl}/storage/v1/object/public/uploads/${fileName}`;
    }
    // For other relative paths, construct full URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pactwines.com';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    */
  };

  // Get images for this wine
  const images = wineImages && wineImages.length > 0 
    ? wineImages.map((img: any) => ({
        id: `${i.id}-img-${img.sort_order}`,
        url: convertToFullUrl(img.image_path),
        altText: img.alt_text || i.wine_name,
        width: 600,
        height: 600,
      }))
    : [
        {
          id: `${i.id}-img`,
          url: convertToFullUrl(i.label_image_path),
          altText: i.wine_name,
          width: 600,
          height: 600,
        },
      ];

  const featuredImage = images[0] || {
    id: `${i.id}-img`,
    url: convertToFullUrl(i.label_image_path),
    altText: i.wine_name,
    width: 600,
    height: 600,
  };

  // Use custom description or generate default one
  const wineDescription = i.description || 
    `This exceptional ${i.color || 'wine'} wine from ${i.vintage} showcases the unique characteristics of ${i.grape_varieties || 'carefully selected grapes'}. Crafted with precision and passion, this wine offers a perfect balance of flavors and aromas that will delight your palate.`;
  
  const wineDescriptionHtml = i.description_html || `<p>${wineDescription}</p>`;

  const product = {
    id: i.id,
    title: `${i.wine_name} ${i.vintage}`,
    description: wineDescription,
    descriptionHtml: wineDescriptionHtml,
    handle: i.handle,
    productType: "wine",
    categoryId: i.producer_id,
    producerName: i.producers?.name || "Unknown Producer",
    options: [
      // Add grape varieties as an option
      {
        id: "grape-varieties",
        name: "Grape Varieties",
        values: grapeVarieties.map((variety: string) => ({
          id: variety.toLowerCase().replace(/\s+/g, '-'),
          name: variety,
        })),
      },
      // Add color as an option
      {
        id: "color",
        name: "Color",
        values: colorName ? [{
          id: colorName.toLowerCase().replace(/\s+/g, '-'),
          name: colorName,
        }] : [],
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
