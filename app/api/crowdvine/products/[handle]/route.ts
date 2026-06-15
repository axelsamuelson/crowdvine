import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAppUrl, getInternalFetchHeaders } from "@/lib/app-url";
import { calculateB2BPriceExclVat } from "@/lib/price-breakdown";
import { isB2BHost } from "@/lib/b2b-site";
import { resolveWineAbv } from "@/lib/product/wine-enrichment";
import {
  extractWineArray,
  extractWineText,
} from "@/lib/i18n/wine-locale";
import {
  aggregateB2BPalletStock,
  B2B_PALLET_ITEM_STOCK_SELECT,
} from "@/lib/b2b-pallet-stock";
import { resolveProductAvailableForSale } from "@/lib/wine-availability";

function parseWineTasteTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (tag): tag is string => typeof tag === "string" && tag.trim().length > 0,
  );
}

export async function GET(
  request: Request,
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
  // First get the wine ID from handle (optionally filter by is_live if column exists)
  let wineIdResult = await sb
    .from("wines")
    .select("id")
    .eq("handle", resolvedParams.handle)
    .eq("is_live", true)
    .single();

  if (wineIdResult.error && /is_live|column.*does not exist/i.test(wineIdResult.error.message ?? "")) {
    wineIdResult = await sb
      .from("wines")
      .select("id")
      .eq("handle", resolvedParams.handle)
      .single();
  }

  if (wineIdResult.error || !wineIdResult.data)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const wineIdData = wineIdResult.data;

  const wineSelect = `
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
        summary,
        appellation,
        terroir,
        vinification,
        abv,
        alcohol_percentage,
        tasting_notes,
        farming,
        additives,
        serving_temp_c,
        food_pairing,
        elevation_masl,
        style_scale,
        winemaker_notes,
        awards,
        ageing,
        soil_type,
        tags,
        available_for_sale,
        producers!inner(name, region, subregion, lat, lon, boost_active)
      `;

  const wineSelectWithoutExtendedEnrichment = `
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
        summary,
        appellation,
        terroir,
        vinification,
        abv,
        alcohol_percentage,
        tasting_notes,
        farming,
        additives,
        serving_temp_c,
        food_pairing,
        elevation_masl,
        winemaker_notes,
        awards,
        tags,
        available_for_sale,
        producers!inner(name, region, subregion, lat, lon, boost_active)
      `;

  let result = await sb
    .from("wines")
    .select(wineSelect)
    .eq("is_live", true)
    .eq("id", wineIdData.id)
    .single();

  if (
    result.error &&
    /ageing|soil_type|additives|style_scale|column.*does not exist/i.test(result.error.message ?? "")
  ) {
    result = await sb
      .from("wines")
      .select(wineSelectWithoutExtendedEnrichment)
      .eq("is_live", true)
      .eq("id", wineIdData.id)
      .single();
    if (result.data) {
      (result.data as Record<string, unknown>).ageing = null;
      (result.data as Record<string, unknown>).soil_type = null;
      (result.data as Record<string, unknown>).additives = null;
      (result.data as Record<string, unknown>).style_scale = null;
      (result.data as Record<string, unknown>).tags = null;
    }
  }

  if (result.error && /is_live|column.*does not exist|summary|appellation|terroir|vinification|abv|tasting_notes|farming|serving_temp_c|food_pairing|elevation_masl|winemaker_notes|awards|tags/i.test(result.error.message ?? "")) {
    const wineSelectWithoutSummary = `
        id, wine_name, vintage, grape_varieties, color, handle,
        base_price_cents, cost_amount, cost_currency, exchange_rate,
        alcohol_tax_cents, margin_percentage, b2b_margin_percentage, b2b_stock,
        label_image_path, producer_id, description, description_html,
        producers!inner(name, boost_active)
      `;
    result = await sb
      .from("wines")
      .select(wineSelectWithoutSummary)
      .eq("id", wineIdData.id)
      .eq("is_live", true)
      .single();
    if (result.error && /is_live|column.*does not exist/i.test(result.error.message ?? "")) {
      result = await sb
        .from("wines")
        .select(wineSelectWithoutSummary)
        .eq("id", wineIdData.id)
        .single();
    }
    if (result.data) {
      const row = result.data as Record<string, unknown>;
      row.summary = null;
      row.tasting_notes = null;
      row.farming = null;
      row.additives = null;
      row.serving_temp_c = null;
      row.food_pairing = null;
      row.elevation_masl = null;
      row.style_scale = null;
      row.winemaker_notes = null;
      row.awards = null;
      row.ageing = null;
      row.soil_type = null;
      row.tags = null;
    }
  }

  const data = result.data;
  const error = result.error;

  if (error || !data)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Hide wines whose producer is offline
  const producerId = (data as any).producer_id;
  if (producerId) {
    const { data: prod } = await sb.from("producers").select("is_live").eq("id", producerId).maybeSingle();
    if (prod && (prod as any).is_live === false)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

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

  const locale = (request.headers.get("x-pact-locale") ?? "sv") as
    | "sv"
    | "en";

  const rawDescription = extractWineText(i.description, locale);
  const wineDescription =
    rawDescription ||
    `This exceptional ${i.color || "wine"} wine from ${i.vintage} showcases the unique characteristics of ${i.grape_varieties || "carefully selected grapes"}. Crafted with precision and passion, this wine offers a perfect balance of flavors and aromas that will delight your palate.`;

  const wineDescriptionHtml = i.description_html || `<p>${wineDescription}</p>`;

  // B2B stock and shipping: from Dirty Wine pallets
  let b2bStock: number | null = null;
  let shippingPerBottleSek = 0;
  try {
    const { data: palletItems, error } = await sb
      .from("b2b_pallet_shipment_items")
      .select(B2B_PALLET_ITEM_STOCK_SELECT)
      .eq("wine_id", wineIdData.id)
      .eq("b2b_pallet_shipments.is_active", true);
    if (error) throw error;
    if (palletItems && palletItems.length > 0) {
      const { stockMap, shippingMap } = aggregateB2BPalletStock(palletItems, {
        sellableOnly: true,
      });
      b2bStock = stockMap.get(wineIdData.id) ?? 0;
      shippingPerBottleSek = shippingMap.get(wineIdData.id) ?? 0;
    }
  } catch {
    /* cost_cents, is_active or b2b_pallet_shipments may not exist - fallback to stock only */
    try {
      const { data: fallback } = await sb
        .from("b2b_pallet_shipment_items")
        .select("quantity, quantity_sold, b2b_pallet_shipments!inner(is_active)")
        .eq("wine_id", wineIdData.id)
        .eq("b2b_pallet_shipments.is_active", true);
      if (fallback?.length) {
        const { stockMap } = aggregateB2BPalletStock(fallback, {
          sellableOnly: true,
        });
        b2bStock = stockMap.get(wineIdData.id) ?? 0;
      }
    } catch {
      /* ignore */
    }
  }
  if (b2bStock == null && i.b2b_stock != null) {
    b2bStock = Number(i.b2b_stock);
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const isB2BSite = isB2BHost(host);
  const availableForSale = resolveProductAvailableForSale({
    isB2BSite,
    b2bStock,
    availableForSale: (i as { available_for_sale?: boolean }).available_for_sale,
  });

  const specs: Record<string, string> = {};
  const producerEmbed = i.producers as {
    name?: string;
    region?: string;
    subregion?: string;
    lat?: number | null;
    lon?: number | null;
    boost_active?: boolean;
  } | null;
  const producerRegion = producerEmbed?.region;
  if (producerRegion?.trim()) specs["Region"] = producerRegion.trim();
  if (i.appellation?.trim()) specs["Appellation"] = i.appellation.trim();
  if (i.terroir?.trim()) specs["Terroir"] = i.terroir.trim();
  if (i.vinification?.trim()) specs["Vinification"] = i.vinification.trim();
  const resolvedAbv = resolveWineAbv(i.abv, i.alcohol_percentage);
  if (resolvedAbv) specs["ABV"] = resolvedAbv;

  const tasteTags = parseWineTasteTags(i.tags);

  const wineEnrichment = {
    tasting_notes: extractWineText(i.tasting_notes, locale),
    appellation: i.appellation?.trim() ? i.appellation.trim() : null,
    farming: i.farming?.trim() ? i.farming.trim() : null,
    additives: extractWineText(i.additives, locale),
    serving_temp_c: i.serving_temp_c?.trim() ? i.serving_temp_c.trim() : null,
    abv: resolvedAbv,
    alcohol_percentage:
      i.alcohol_percentage != null && Number.isFinite(Number(i.alcohol_percentage))
        ? Number(i.alcohol_percentage)
        : null,
    food_pairing:
      extractWineArray(i.food_pairing, locale)?.filter((s: string) =>
        s?.trim(),
      ) ?? null,
    soil_type: extractWineText(i.soil_type, locale),
    elevation_masl:
      i.elevation_masl != null && Number.isFinite(Number(i.elevation_masl))
        ? Number(i.elevation_masl)
        : null,
    style_scale:
      i.style_scale != null &&
      Number.isFinite(Number(i.style_scale)) &&
      Number(i.style_scale) >= 1 &&
      Number(i.style_scale) <= 5
        ? Number(i.style_scale)
        : null,
    ageing: extractWineText(i.ageing, locale),
    winemaker_notes: extractWineText(i.winemaker_notes, locale),
    awards:
      extractWineArray(i.awards, locale)?.filter((s: string) => s?.trim()) ??
      null,
    grapeVarieties: grapeVarieties.length > 0 ? grapeVarieties : null,
    color: colorName?.trim() ? colorName.trim() : null,
    taste_tags: tasteTags,
  };

  const product = {
    id: i.id,
    title: `${i.wine_name} ${i.vintage}`,
    description: wineDescription,
    descriptionHtml: wineDescriptionHtml,
    /** Short summary for PDP white box; null if not set. */
    summary: extractWineText(i.summary, locale),
    /** Wine specs for bullet list under description (Region, Appellation, Terroir, Vinification, ABV). */
    specs: Object.keys(specs).length > 0 ? specs : null,
    /** Enrichment fields for PDP sections (tasting notes, farming, food pairing, etc.). */
    wineEnrichment,
    taste_tags: tasteTags,
    handle: i.handle,
    productType: "wine",
    categoryId: i.producer_id,
    producerId: i.producer_id,
    producerName: producerEmbed?.name || "Unknown Producer",
    producerLocation: producerEmbed
      ? {
          lat: producerEmbed.lat ?? null,
          lon: producerEmbed.lon ?? null,
          subregion: producerEmbed.subregion ?? null,
          region: producerEmbed.region ?? null,
        }
      : null,
    producerBoostActive: producerEmbed?.boost_active === true,
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
      basePriceCents: i.base_price_cents,
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
