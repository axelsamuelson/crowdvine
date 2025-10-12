import { Suspense } from "react";
import { ProductListContent } from "../../components/product-list-content";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function ProducerGroupPage({ params }: PageProps) {
  const { groupId } = await params;
  const sb = getSupabaseAdmin();

  // Get producer group info
  const { data: group, error: groupError } = await sb
    .from("producer_groups")
    .select(`
      id,
      name,
      description,
      producer_group_members(
        producer_id,
        producers(
          id,
          name,
          region
        )
      )
    `)
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    console.error("Group not found:", groupError);
    notFound();
  }

  // Get all producer IDs from the group
  const producerIds = group.producer_group_members?.map(
    (m: any) => m.producer_id
  ) || [];

  if (producerIds.length === 0) {
    return (
      <div className="p-sides py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">{group.name}</h1>
        <p className="text-gray-600">No producers in this group yet</p>
      </div>
    );
  }

  // Fetch all wines from all producers in the group
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
    .order("created_at", { ascending: false });

  if (winesError) {
    console.error("Error fetching wines:", winesError);
    notFound();
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

  const producerNames = group.producer_group_members
    ?.map((m: any) => m.producers?.name)
    .filter(Boolean)
    .join(", ") || "";

  return (
    <div className="p-sides py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{group.name}</h1>
        {group.description && (
          <p className="text-gray-600 mb-3">{group.description}</p>
        )}
        <p className="text-sm text-gray-500">
          Producers: {producerNames}
        </p>
      </div>

      {/* Products Grid */}
      <Suspense fallback={<div>Loading wines...</div>}>
        <ProductListContent products={products} collections={[]} />
      </Suspense>
    </div>
  );
}

