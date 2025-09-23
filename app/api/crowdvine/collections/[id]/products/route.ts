import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getAllWineBoxCalculations } from "@/lib/wine-box-calculations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!)
    : 200;

  const sb = await supabaseServer();
  const resolvedParams = await params;

  try {
    // Handle wine boxes collection
    if (resolvedParams.id === "wine-boxes-collection") {
      try {
        // Get wine box calculations
        const calculations = await getAllWineBoxCalculations();
        
        if (calculations.length === 0) {
          console.log("No wine boxes found in database");
          return NextResponse.json([]);
        }

      // Convert to Shopify-compatible product format
      const products = calculations.map((calc) => {
        return {
          id: calc.wineBoxId,
          title: calc.name,
          description: calc.description,
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
          images: [
            {
              url: calc.imageUrl || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
              altText: calc.name,
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
              values: [`${calc.bottleCount} Bottles`],
            },
            {
              id: "discount",
              name: "Discount",
              values: [`${Math.round(calc.discountPercentage)}% off`],
            },
          ],
          tags: [`${calc.bottleCount}-bottles`, `${calc.discountPercentage}-discount`],
          // Add custom fields for discount information
          discountInfo: {
            totalWinePrice: calc.totalWinePrice,
            discountAmount: calc.discountAmount,
            discountPercentage: calc.discountPercentage,
            finalPrice: calc.finalPrice,
            wines: calc.wines,
          },
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
      });

        return NextResponse.json(products.slice(0, limit));
      } catch (wineBoxError) {
        console.error("Error fetching wine boxes:", wineBoxError);
        return NextResponse.json([]);
      }
    }

    // Get wines for the specific producer/collection
    const { data, error } = await sb
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
      .eq("producer_id", resolvedParams.id)
      .limit(limit);

    if (error) throw error;

    // Helper function to convert relative paths to full URLs
    const convertToFullUrl = (path: string | null | undefined): string => {
      if (!path) return "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop";
      if (path.startsWith('http')) return path;
      if (path.startsWith('/uploads/')) {
        // This is a Supabase Storage file, construct proper Supabase Storage URL
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const fileName = path.replace('/uploads/', '');
        return `${supabaseUrl}/storage/v1/object/public/uploads/${fileName}`;
      }
      // For other relative paths, construct full URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pactwines.com';
      return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    // Convert to Shopify-compatible product format
    const products = (data ?? []).map((i: any) => {
      const grapeVarieties = Array.isArray(i.grape_varieties)
        ? i.grape_varieties
        : i.grape_varieties
          ? i.grape_varieties.split(",").map((g: string) => g.trim())
          : [];

      const colorName = i.color;

      return {
        id: i.id,
        title: `${i.wine_name} ${i.vintage}`,
        description: "",
        descriptionHtml: "",
        handle: i.handle,
        productType: "wine",
        categoryId: i.producer_id,
        options: [
          {
            id: "grape-varieties",
            name: "Grape Varieties",
            values: grapeVarieties,
          },
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
              ...grapeVarieties.map((grape: string) => ({
                name: "Grape Varieties",
                value: grape,
              })),
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
        featuredImage: {
          id: `${i.id}-img`,
          url: convertToFullUrl(i.label_image_path),
          altText: i.wine_name,
          width: 600,
          height: 600,
        },
        images: [
          {
            id: `${i.id}-img`,
            url: convertToFullUrl(i.label_image_path),
            altText: i.wine_name,
            width: 600,
            height: 600,
          },
        ],
        seo: { title: i.wine_name, description: "" },
        tags: [...grapeVarieties, ...(colorName ? [colorName] : [])],
        availableForSale: true,
        currencyCode: "SEK",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching collection products:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection products" },
      { status: 500 },
    );
  }
}
