import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAppUrl } from "@/lib/app-url";
import { getAllWineBoxCalculations } from "@/lib/wine-box-calculations";

function convertToFullUrl(path: string | null | undefined): string {
  if (!path)
    return "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop";

  const cleanPath = path.trim().replace(/\n/g, "");

  if (cleanPath.startsWith("http")) return cleanPath;
  if (cleanPath.startsWith("/uploads/")) {
    const baseUrl = getAppUrl();
    const fileName = cleanPath.replace("/uploads/", "");
    return `${baseUrl}/api/images/${fileName}`;
  }
  const baseUrl = getAppUrl();
  return `${baseUrl}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export interface ProductData {
  id: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  handle: string;
  productType: string;
  categoryId: string;
  producerId: string;
  producerName: string;
  options: Array<{ id: string; name: string; values: Array<{ id: string; name: string } | string> }>;
  variants: Array<{
    id: string;
    title: string;
    availableForSale: boolean;
    price: { amount: string; currencyCode: string };
    selectedOptions: Array<{ name: string; value: string }>;
  }>;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  featuredImage: { id: string; url: string; altText: string; width?: number; height?: number };
  images: Array<{ id: string; url: string; altText: string; width?: number; height?: number }>;
  seo: { title: string; description: string };
  tags: string[];
  availableForSale: boolean;
  currencyCode: string;
  updatedAt: string;
  createdAt: string;
}

/**
 * Fetch all products directly from DB. Use for SSR to avoid HTTP 401.
 */
export async function fetchProductsData(params?: {
  limit?: number;
  sortKey?: string;
  reverse?: boolean;
}): Promise<ProductData[]> {
  const limit = params?.limit ?? 200;
  const sortKey = params?.sortKey || "RELEVANCE";
  const reverse = params?.reverse ?? false;

  const sb = getSupabaseAdmin();

  let query = sb.from("wines").select(
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
      created_at,
      producers!inner(name)
    `,
  );

  switch (sortKey) {
    case "PRICE":
      query = query.order("base_price_cents", { ascending: !reverse });
      break;
    case "CREATED_AT":
    case "CREATED":
      query = query.order("created_at", { ascending: !reverse });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(limit);
  if (error) throw error;

  const wineIds = data?.map((wine: any) => wine.id) || [];
  const wineImagesMap = new Map<string, any[]>();

  if (wineIds.length > 0) {
    const { data: wineImages } = await sb
      .from("wine_images")
      .select("wine_id, image_path, alt_text, sort_order, is_primary")
      .in("wine_id", wineIds)
      .order("sort_order", { ascending: true });

    wineImages?.forEach((image: any) => {
      if (!wineImagesMap.has(image.wine_id)) wineImagesMap.set(image.wine_id, []);
      wineImagesMap.get(image.wine_id)!.push(image);
    });
  }

  return (data ?? []).map((i: any) => {
    const grapeVarieties = Array.isArray(i.grape_varieties)
      ? i.grape_varieties
      : i.grape_varieties
        ? i.grape_varieties.split(",").map((g: string) => g.trim())
        : [];
    const colorName = i.color_name || i.color;

    const wineImages = wineImagesMap.get(i.id) || [];
    const images =
      wineImages.length > 0
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

    const wineDescription =
      i.description ||
      `This exceptional ${i.color || "wine"} wine from ${i.vintage} showcases the unique characteristics of ${i.grape_varieties || "carefully selected grapes"}. Crafted with precision and passion.`;

    return {
      id: i.id,
      title: `${i.wine_name} ${i.vintage}`,
      description: wineDescription,
      descriptionHtml: i.description_html || `<p>${wineDescription}</p>`,
      handle: i.handle,
      productType: "wine",
      categoryId: i.producer_id,
      producerId: i.producer_id,
      producerName: i.producers?.name || "Unknown Producer",
      options: [
        {
          id: "grape-varieties",
          name: "Grape Varieties",
          values: grapeVarieties.map((v: string) => ({
            id: v.toLowerCase().replace(/\s+/g, "-"),
            name: v,
          })),
        },
        {
          id: "color",
          name: "Color",
          values: colorName
            ? [{ id: colorName.toLowerCase().replace(/\s+/g, "-"), name: colorName }]
            : [],
        },
      ],
      variants: [
        {
          id: `${i.id}-default`,
          title: "750 ml",
          availableForSale: true,
          price: { amount: Math.ceil(i.base_price_cents / 100).toString(), currencyCode: "SEK" },
          selectedOptions: [
            ...grapeVarieties.map((g: string) => ({ name: "Grape Varieties", value: g })),
            ...(colorName ? [{ name: "Color", value: colorName }] : []),
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
      featuredImage: images[0] || {
        id: `${i.id}-img`,
        url: convertToFullUrl(i.label_image_path),
        altText: i.wine_name,
        width: 600,
        height: 600,
      },
      images,
      seo: { title: i.wine_name, description: "" },
      tags: [...grapeVarieties, ...(colorName ? [colorName] : [])],
      availableForSale: true,
      currencyCode: "SEK",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  });
}

/**
 * Fetch products for a collection (producer or wine-boxes) directly from DB.
 */
export async function fetchCollectionProductsData(
  collectionId: string,
  params?: { limit?: number },
): Promise<ProductData[]> {
  const limit = params?.limit ?? 200;

  if (collectionId === "wine-boxes-collection") {
    const calculations = await getAllWineBoxCalculations();
    if (calculations.length === 0) return [];

    return calculations.slice(0, limit).map((calc) => ({
      id: calc.wineBoxId,
      title: calc.name,
      description: calc.description,
      descriptionHtml: "",
      handle: `wine-box-${calc.wineBoxId}`,
      productType: "wine-box",
      categoryId: "wine-boxes-collection",
      producerId: "",
      producerName: "",
      options: [
        { id: "size", name: "Size", values: [`${calc.bottleCount} Bottles`] },
        { id: "discount", name: "Discount", values: [`${Math.round(calc.discountPercentage)}% off`] },
      ],
      variants: [
        {
          id: `${calc.wineBoxId}-variant`,
          title: `${calc.bottleCount} Bottles`,
          availableForSale: true,
          price: { amount: Math.round(calc.finalPrice).toString(), currencyCode: "SEK" },
          selectedOptions: [
            { name: "Size", value: `${calc.bottleCount} Bottles` },
            { name: "Discount", value: `${Math.round(calc.discountPercentage)}% off` },
          ],
        },
      ],
      priceRange: {
        minVariantPrice: { amount: Math.round(calc.finalPrice).toString(), currencyCode: "SEK" },
        maxVariantPrice: { amount: Math.round(calc.finalPrice).toString(), currencyCode: "SEK" },
      },
      featuredImage: {
        id: `${calc.wineBoxId}-img`,
        url: calc.imageUrl || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
        altText: calc.name,
      },
      images: [
        {
          id: `${calc.wineBoxId}-img`,
          url: calc.imageUrl || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
          altText: calc.name,
        },
      ],
      seo: { title: calc.name, description: "" },
      tags: [`${calc.bottleCount}-bottles`, `${calc.discountPercentage}-discount`],
      availableForSale: true,
      currencyCode: "SEK",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })) as ProductData[];
  }

  const sb = getSupabaseAdmin();
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
      producer_id,
      producers(name)
    `,
    )
    .eq("producer_id", collectionId)
    .limit(limit);

  if (error) throw error;

  const { data: producerData } = await sb
    .from("producers")
    .select("name")
    .eq("id", collectionId)
    .single();

  const producerName = producerData?.name;

  return (data ?? []).map((i: any) => {
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
      producerId: i.producer_id,
      producerName: producerName || i.producers?.name || `Producer ${collectionId.substring(0, 8)}`,
      options: [
        {
          id: "grape-varieties",
          name: "Grape Varieties",
          values: grapeVarieties.map((v: string) => ({
            id: v.toLowerCase().replace(/\s+/g, "-"),
            name: v,
          })),
        },
        {
          id: "color",
          name: "Color",
          values: colorName
            ? [{ id: colorName.toLowerCase().replace(/\s+/g, "-"), name: colorName }]
            : [],
        },
      ],
      variants: [
        {
          id: `${i.id}-default`,
          title: "750 ml",
          availableForSale: true,
          price: { amount: Math.ceil(i.base_price_cents / 100).toString(), currencyCode: "SEK" },
          selectedOptions: [
            ...grapeVarieties.map((g: string) => ({ name: "Grape Varieties", value: g })),
            ...(colorName ? [{ name: "Color", value: colorName }] : []),
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
}
