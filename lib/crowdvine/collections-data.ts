import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface CollectionData {
  id: string;
  handle: string;
  title: string;
  description: string;
  updatedAt: string;
  createdAt: string;
  seo?: { title: string; description: string };
}

/**
 * Fetch collections (producers + wine boxes) directly from DB.
 * Use this for SSR to avoid HTTP fetch and Vercel Deployment Protection 401.
 */
export async function fetchCollectionsData(): Promise<CollectionData[]> {
  const sb = getSupabaseAdmin();

  const { data: producers, error } = await sb
    .from("producers")
    .select("id, name, region")
    .order("name");

  if (error) throw error;

  const producerCollections = (producers || []).map((producer: any) => ({
    id: producer.id,
    handle: producer.name.toLowerCase().replace(/\s+/g, "-"),
    title: producer.name,
    description: `Wines from ${producer.name} in ${producer.region}`,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }));

  const wineBoxesCollection: CollectionData = {
    id: "wine-boxes-collection",
    handle: "wine-boxes",
    title: "Wine Boxes",
    description:
      "Curated wine packages with 3 or 6 bottles featuring organic, light reds, pet-nat, and more",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return [wineBoxesCollection, ...producerCollections];
}
