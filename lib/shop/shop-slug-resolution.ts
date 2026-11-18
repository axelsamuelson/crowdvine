import { cache } from "react";
import { notFound } from "next/navigation";

import { isProducerBoxesSlug } from "@/lib/producer-boxes/config";
import { getCollection } from "@/lib/shopify";
import type { Collection } from "@/lib/shopify/types";
import { resolveGrapeCategoryBySlug } from "@/lib/wine-grape-categories";
import type { WineCategory } from "@/lib/wine-category-types";

export type ShopSlugLocale = "sv" | "en";

/**
 * What /vin/[slug] and /wine/[slug] are allowed to render.
 * Order matches the pages: producer boxes, then category (static or grape),
 * then a producer collection. Anything else is missing.
 */
export type ShopSlugResolution =
  | { kind: "producer-boxes" }
  | { kind: "category"; category: WineCategory }
  | { kind: "collection"; collection: Collection }
  | { kind: "missing" };

export type ResolvedShopSlug = Exclude<ShopSlugResolution, { kind: "missing" }>;

/** Single /vin or /wine segment. Nested paths such as /vin/group/[id] are ignored. */
export function shopPathSlug(
  pathname: string,
  locale: ShopSlugLocale,
): string | null {
  const prefix = locale === "sv" ? "/vin/" : "/wine/";
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  if (!rest || rest.includes("/")) return null;
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

async function resolveShopSlugUncached(
  slug: string,
  locale: ShopSlugLocale,
): Promise<ShopSlugResolution> {
  if (isProducerBoxesSlug(slug, locale)) {
    return { kind: "producer-boxes" };
  }

  const category = await resolveGrapeCategoryBySlug(slug, locale);
  if (category) return { kind: "category", category };

  const collection = await getCollection(slug);
  if (!collection) return { kind: "missing" };

  return { kind: "collection", collection };
}

/** Per-request memo so the layout, metadata, and page share one lookup. */
export const resolveShopSlug = cache(resolveShopSlugUncached);

/** Unknown slugs are a real 404. Known entities are returned for the page to render. */
export async function notFoundUnlessShopSlug(
  slug: string,
  locale: ShopSlugLocale,
): Promise<ResolvedShopSlug> {
  const resolved = await resolveShopSlug(slug, locale);
  if (resolved.kind === "missing") notFound();
  return resolved;
}
