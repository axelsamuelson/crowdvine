import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAppUrl, getInternalFetchHeaders } from "@/lib/app-url";
import { calculateB2BPriceExclVat } from "@/lib/price-breakdown";

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
      const { getAllWineBoxCalculations } = await import(
        "@/lib/wine-box-calculations"
      );
      const calculations = await getAllWineBoxCalculations();

      // Find the specific wine box
      const calc = calculations.find((c) => c.wineBoxId === wineBoxId);

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
            amount: Math.round(calc.finalPrice).toString(),
            currencyCode: "SEK",
          },
          maxVariantPrice: {
            amount: Math.round(calc.finalPrice).toString(),
            currencyCode: "SEK",
          },
        },
        featuredImage: {
          id: `${calc.wineBoxId}-img`,
          url:
            calc.imageUrl ||
            "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
          altText: calc.name,
          width: 600,
          height: 600,
        },
        images: [
          {
            id: `${calc.wineBoxId}-img`,
            url:
              calc.imageUrl ||
              "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
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
              amount: Math.round(calc.finalPrice).toString(),
              currencyCode: "SEK",
            },
            selectedOptions: [
              { name: "Size", value: `${calc.bottleCount} Bottles` },
              {
                name: "Discount",
                value: `${Math.round(calc.discountPercentage)}% off`,
              },
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
        tags: [
          `${calc.bottleCount}-bottles`,
          `${calc.discountPercentage}-discount`,
        ],
        seo: {
          title: calc.name,
          description: calc.description,
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
        cost_amount,
        cost_currency,
        exchange_rate,
        alcohol_tax_cents,
        margin_percentage,
        b2b_margin_percentage,
        b2b_stock,
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

  // Fetch live exchange rate for B2B price when cost is not SEK
  let exchangeRate = i.exchange_rate || 1;
  const costCurrency = (i.cost_currency || "EUR") as string;
  if (costCurrency !== "SEK") {
    try {
      const base = getAppUrl();
      const headers = getInternalFetchHeaders();
      const res = await fetch(
        `${base}/api/exchange-rates?from=${costCurrency}&to=SEK`,
        { cache: "no-store", headers },
      );
      const rateData = res.ok ? await res.json() : null;
      if (rateData?.rate && Number.isFinite(rateData.rate)) {
        exchangeRate = rateData.rate;
      }
    } catch {
      /* keep DB rate */
    }
  }

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
    if (!path)
      return "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop";

    // Clean up any newline characters or whitespace
    const cleanPath = path.trim().replace(/\n/g, "");

    if (cleanPath.startsWith("http")) return cleanPath; // Already a full URL
    if (cleanPath.startsWith("/uploads/")) {
      const baseUrl = getAppUrl();
      const fileName = cleanPath.replace("/uploads/", "");
      return `${baseUrl}/api/images/${fileName}`;
    }
    const baseUrl = getAppUrl();
    return `${baseUrl}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
  };

  // Get images for this wine
  const images =
    wineImages && wineImages.length > 0
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
  const wineDescription =
    i.description ||
    `This exceptional ${i.color || "wine"} wine from ${i.vintage} showcases the unique characteristics of ${i.grape_varieties || "carefully selected grapes"}. Crafted with precision and passion, this wine offers a perfect balance of flavors and aromas that will delight your palate.`;

  const wineDescriptionHtml = i.description_html || `<p>${wineDescription}</p>`;

  // B2B stock and shipping: from Dirty Wine pallets
  let b2bStock: number | null = null;
  let shippingPerBottleSek = 0;
  try {
    const { data: palletItems, error } = await sb
      .from("b2b_pallet_shipment_items")
      .select("quantity, quantity_sold, shipment_id, b2b_pallet_shipments!inner(cost_cents)")
      .eq("wine_id", wineIdData.id);
    if (error) throw error;
    if (palletItems && palletItems.length > 0) {
      const shipmentIds = [...new Set((palletItems as any[]).map((r: any) => r.shipment_id).filter(Boolean))];
      let totalBottlesByShipment = new Map<string, number>();
      if (shipmentIds.length > 0) {
        const { data: allItems } = await sb
          .from("b2b_pallet_shipment_items")
          .select("shipment_id, quantity")
          .in("shipment_id", shipmentIds);
        (allItems || []).forEach((row: any) => {
          const sid = row.shipment_id;
          totalBottlesByShipment.set(sid, (totalBottlesByShipment.get(sid) ?? 0) + (row.quantity ?? 0));
        });
      }
      let totalRemaining = 0;
      let weightedShippingSum = 0;
      (palletItems as any[]).forEach((row: any) => {
        const remaining = Math.max(0, (row.quantity ?? 0) - (row.quantity_sold ?? 0));
        totalRemaining += remaining;
        b2bStock = (b2bStock ?? 0) + remaining;
        const costCents = row.b2b_pallet_shipments?.cost_cents ?? 0;
        const totalBottles = totalBottlesByShipment.get(row.shipment_id) ?? 1;
        const shippingPerBottle = totalBottles > 0 ? costCents / 100 / totalBottles : 0;
        weightedShippingSum += shippingPerBottle * remaining;
      });
      if (totalRemaining > 0) {
        shippingPerBottleSek = weightedShippingSum / totalRemaining;
      }
    }
  } catch {
    /* cost_cents or b2b_pallet_shipments may not exist - fallback to stock only */
    try {
      const { data: fallback } = await sb
        .from("b2b_pallet_shipment_items")
        .select("quantity, quantity_sold")
        .eq("wine_id", wineIdData.id);
      if (fallback?.length) {
        b2bStock = (fallback as any[]).reduce(
          (s, r) => s + Math.max(0, (r.quantity ?? 0) - (r.quantity_sold ?? 0)),
          0,
        );
      }
    } catch {
      /* ignore */
    }
  }
  if (b2bStock == null && i.b2b_stock != null) {
    b2bStock = Number(i.b2b_stock);
  }
  const availableForSale = b2bStock != null && b2bStock > 0;

  const product = {
    id: i.id,
    title: `${i.wine_name} ${i.vintage}`,
    description: wineDescription,
    descriptionHtml: wineDescriptionHtml,
    handle: i.handle,
    productType: "wine",
    categoryId: i.producer_id,
    producerId: i.producer_id,
    producerName: i.producers?.name || "Unknown Producer",
    options: [
      // Add grape varieties as an option
      {
        id: "grape-varieties",
        name: "Grape Varieties",
        values: grapeVarieties.map((variety: string) => ({
          id: variety.toLowerCase().replace(/\s+/g, "-"),
          name: variety,
        })),
      },
      // Add color as an option
      {
        id: "color",
        name: "Color",
        values: colorName
          ? [
              {
                id: colorName.toLowerCase().replace(/\s+/g, "-"),
                name: colorName,
              },
            ]
          : [],
      },
    ],
    variants: [
      {
        id: `${i.id}-default`,
        title: "750 ml",
        availableForSale,
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
    availableForSale,
    currencyCode: "SEK",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    b2bStock: b2bStock ?? undefined,
    priceBreakdown: {
      costAmount: i.cost_amount || 0,
      exchangeRate,
      alcoholTaxCents: i.alcohol_tax_cents || 0,
      marginPercentage: i.margin_percentage || 0,
      b2bMarginPercentage: i.b2b_margin_percentage ?? undefined,
      b2bShippingPerBottleSek: shippingPerBottleSek,
      b2bPriceExclVat:
        i.b2b_margin_percentage != null &&
        i.b2b_margin_percentage >= 0 &&
        i.b2b_margin_percentage < 100
          ? Math.round(
              calculateB2BPriceExclVat(
                i.cost_amount || 0,
                exchangeRate,
                i.alcohol_tax_cents || 0,
                i.b2b_margin_percentage,
                shippingPerBottleSek,
              ) * 100,
            ) / 100
          : undefined,
    },
  };

  return NextResponse.json(product);
}
