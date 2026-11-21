import { TOP_100_WINES, type TopWine } from "@/lib/guides/top-100-wines";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import type { AppLocale } from "@/lib/i18n/locale";
import {
  producerPublicHrefFromLegalName,
  productPublicPath,
} from "@/lib/i18n/localized-routes";
import { generateProducerSlug } from "@/lib/producer-handle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type GuideCatalogProducerLink = {
  href: string;
  label: string;
};

export type GuideCatalogWineLink = {
  href: string;
  handle: string;
};

function normalizeMatchKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Live producers with ≥1 live wine, keyed by public profile slug.
 * Also aliases top-100 display names (e.g. "Jean Foillard") onto the
 * legal-name slug used by the public producer page.
 */
export async function getLiveProducerPublicLinksBySlug(
  locale: AppLocale,
): Promise<Record<string, GuideCatalogProducerLink>> {
  const sb = getSupabaseAdmin();
  const topIds = TOP_100_PRODUCERS.flatMap((producer) =>
    producer.producerId ? [producer.producerId] : [],
  );

  const { data, error } = await sb
    .from("producers")
    .select("id, name, display_name, wines!inner(id)")
    .eq("status", "active")
    .eq("is_live", true)
    .eq("wines.is_live", true);

  if (error) return {};

  const links: Record<string, GuideCatalogProducerLink> = {};
  const idToLink = new Map<string, GuideCatalogProducerLink>();

  for (const row of data ?? []) {
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const id = typeof row.id === "string" ? row.id : "";
    if (!name) continue;
    const slug = generateProducerSlug(name);
    if (!slug) continue;
    const display =
      typeof row.display_name === "string" && row.display_name.trim()
        ? row.display_name.trim()
        : name;
    const link: GuideCatalogProducerLink = {
      // slug from legal producers.name — never display_name
      href: producerPublicHrefFromLegalName(name, locale),
      label: display,
    };
    links[slug] = link;
    if (id) idToLink.set(id, link);
  }

  for (const producer of TOP_100_PRODUCERS) {
    if (!producer.producerId || !topIds.includes(producer.producerId)) continue;
    const link = idToLink.get(producer.producerId);
    if (!link) continue;
    const alias = generateProducerSlug(producer.name);
    if (alias) links[alias] = link;
  }

  return links;
}

type ProducerWineRow = {
  handle: string;
  wine_name: string;
  producer_slug: string;
  producer_id: string | null;
};

/**
 * Live wine handles for producers we sell, for matching guide wine titles → PDP.
 */
export async function getLiveProducerWinesForGuideMatching(): Promise<
  ProducerWineRow[]
> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wines")
    .select("handle, wine_name, producers!inner(id, name, status, is_live)")
    .eq("is_live", true)
    .eq("producers.status", "active")
    .eq("producers.is_live", true);

  if (error) return [];

  const rows: ProducerWineRow[] = [];
  for (const row of data ?? []) {
    const handle = typeof row.handle === "string" ? row.handle.trim() : "";
    const wineName =
      typeof row.wine_name === "string" ? row.wine_name.trim() : "";
    const producers = row.producers as
      | { id?: string | null; name?: string | null }
      | { id?: string | null; name?: string | null }[]
      | null;
    const producer = Array.isArray(producers) ? producers[0] : producers;
    const producerName =
      typeof producer?.name === "string" ? producer.name.trim() : "";
    const producerId =
      typeof producer?.id === "string" ? producer.id : null;
    if (!handle || !wineName || !producerName) continue;
    rows.push({
      handle,
      wine_name: wineName,
      producer_slug: generateProducerSlug(producerName),
      producer_id: producerId,
    });
  }
  return rows;
}

export function matchGuideWineToPdpHandle(
  wine: Pick<TopWine, "wine" | "producer" | "topProducerName">,
  catalog: ProducerWineRow[],
): string | null {
  const producerSlug = generateProducerSlug(
    wine.topProducerName?.trim() || wine.producer,
  );
  if (!producerSlug) return null;

  const topEntry = wine.topProducerName
    ? TOP_100_PRODUCERS.find((entry) => entry.name === wine.topProducerName)
    : undefined;

  const candidates = catalog.filter(
    (row) =>
      row.producer_slug === producerSlug ||
      (topEntry?.producerId != null &&
        row.producer_id === topEntry.producerId),
  );
  if (candidates.length === 0) return null;

  const target = normalizeMatchKey(wine.wine);
  if (!target) return null;

  const exact = candidates.find(
    (row) => normalizeMatchKey(row.wine_name) === target,
  );
  if (exact) return exact.handle;

  // Require a substantial containment match so "Morgon" does not grab
  // every Morgon cuvée on the domaine.
  const partial = candidates.find((row) => {
    const key = normalizeMatchKey(row.wine_name);
    if (key.length < 8 || target.length < 8) return false;
    return key.includes(target) || target.includes(key);
  });
  return partial?.handle ?? null;
}

export function guideProducerSlugForTopWine(
  wine: Pick<TopWine, "producer" | "topProducerName">,
): string | null {
  const fromTop = wine.topProducerName?.trim();
  if (fromTop) {
    const listed = TOP_100_PRODUCERS.find((entry) => entry.name === fromTop);
    if (listed) return generateProducerSlug(listed.name);
    return generateProducerSlug(fromTop);
  }
  const producer = wine.producer?.trim();
  return producer ? generateProducerSlug(producer) : null;
}

export async function resolveTopWineCatalogLinks(
  locale: AppLocale,
): Promise<
  Record<
    number,
    {
      producer?: GuideCatalogProducerLink;
      wine?: GuideCatalogWineLink;
    }
  >
> {
  const [producerLinks, wineCatalog] = await Promise.all([
    getLiveProducerPublicLinksBySlug(locale),
    getLiveProducerWinesForGuideMatching(),
  ]);

  const result: Record<
    number,
    {
      producer?: GuideCatalogProducerLink;
      wine?: GuideCatalogWineLink;
    }
  > = {};

  for (const wine of TOP_100_WINES) {
    const slug = guideProducerSlugForTopWine(wine);
    const producer = slug ? producerLinks[slug] : undefined;
    const handle = matchGuideWineToPdpHandle(wine, wineCatalog);
    const wineLink = handle
      ? { href: productPublicPath(handle, locale), handle }
      : undefined;
    if (producer || wineLink) {
      result[wine.rank] = {
        ...(producer ? { producer } : {}),
        ...(wineLink ? { wine: wineLink } : {}),
      };
    }
  }

  return result;
}
