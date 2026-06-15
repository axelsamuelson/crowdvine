import { MetadataRoute } from "next";

import { generateProducerSlug } from "@/lib/producer-handle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { WINE_CATEGORIES_EN, WINE_CATEGORIES_SV } from "@/lib/wine-categories";

// dirtywine.se använder samma sitemap via robots.txt som pekar till pactwines.com/sitemap.xml
// En separat sitemap för dirtywine.se kan implementeras via en dedikerad route om Google
// Search Console kräver det.

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
      url: `${baseUrl}/vin`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/wine`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
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
    .flatMap((w) => {
      const lastModified = w.updated_at ? new Date(w.updated_at) : new Date();
      const entry = {
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
      return [
        { url: `${baseUrl}/product/${w.handle}`, ...entry },
        { url: `${baseUrl}/produkt/${w.handle}`, ...entry },
      ];
    });

  const { data: producers } = await sb
    .from("producers")
    .select("name, created_at")
    .eq("is_live", true);

  const producerPages: MetadataRoute.Sitemap = (producers ?? [])
    .filter((p): p is { name: string; created_at: string | null } =>
      Boolean(p.name?.trim()),
    )
    .flatMap((p) => {
      const slug = generateProducerSlug(p.name);
      const lastModified = p.created_at ? new Date(p.created_at) : new Date();
      const entry = {
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
      return [
        { url: `${baseUrl}/producer/${slug}`, ...entry },
        { url: `${baseUrl}/producent/${slug}`, ...entry },
      ];
    });

  const vinCategories: MetadataRoute.Sitemap = WINE_CATEGORIES_SV.map((c) => ({
    url: `${baseUrl}/vin/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const wineCategories: MetadataRoute.Sitemap = WINE_CATEGORIES_EN.map((c) => ({
    url: `${baseUrl}/wine/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...vinCategories, ...wineCategories, ...winePages, ...producerPages];
}
