import { MetadataRoute } from "next";

import { generateProducerSlug } from "@/lib/producer-handle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = getSupabaseAdmin();
  const baseUrl = "https://pactwines.com";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/producers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/languedoc`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/languedoc/naturvin`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const { data: wines } = await sb
    .from("wines")
    .select("handle, updated_at")
    .eq("is_live", true);

  const winePages: MetadataRoute.Sitemap = (wines ?? [])
    .filter((w): w is { handle: string; updated_at: string | null } =>
      Boolean(w.handle?.trim()),
    )
    .map((w) => ({
      url: `${baseUrl}/product/${w.handle}`,
      lastModified: w.updated_at ? new Date(w.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const { data: producers } = await sb
    .from("producers")
    .select("name, created_at")
    .eq("is_live", true);

  const producerPages: MetadataRoute.Sitemap = (producers ?? [])
    .filter((p): p is { name: string; created_at: string | null } =>
      Boolean(p.name?.trim()),
    )
    .map((p) => ({
      url: `${baseUrl}/producer/${generateProducerSlug(p.name)}`,
      lastModified: p.created_at ? new Date(p.created_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [...staticPages, ...winePages, ...producerPages];
}
