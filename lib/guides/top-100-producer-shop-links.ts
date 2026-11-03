import { producerPublicPath } from "@/lib/i18n/localized-routes";
import type { AppLocale } from "@/lib/i18n/locale";
import { generateProducerSlug } from "@/lib/producer-handle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";

export type Top100ProducerShopLink = {
  href: string;
  label: string;
};

export function top100ProducerShopLinkLabel(
  locale: AppLocale,
  producerName: string,
): string {
  const name = producerName.trim();
  return locale === "sv"
    ? `Viner från ${name} hos PACT`
    : `${name} wines at PACT`;
}

/** Slug always comes from the legal name. The label uses display_name when set. */
export function top100ProducerShopLinkFromRow(
  locale: AppLocale,
  row: {
    name: string;
    displayName?: string | null;
    hasLiveWine: boolean;
  },
): Top100ProducerShopLink | null {
  if (!row.hasLiveWine) return null;
  const legalName = row.name.trim();
  if (!legalName) return null;
  const shown = row.displayName?.trim() || legalName;
  return {
    href: producerPublicPath(generateProducerSlug(legalName), locale),
    label: top100ProducerShopLinkLabel(locale, shown),
  };
}

function producerIdsOnTheList(): string[] {
  return [
    ...new Set(
      TOP_100_PRODUCERS.flatMap((producer) =>
        producer.producerId ? [producer.producerId] : [],
      ),
    ),
  ];
}

/**
 * One read for every mapped producer. Rows without a live wine are omitted.
 */
export async function getTop100ProducerShopLinks(
  locale: AppLocale,
): Promise<Record<string, Top100ProducerShopLink>> {
  const ids = producerIdsOnTheList();
  if (ids.length === 0) return {};

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("producers")
    .select("id, name, display_name, wines!inner(id)")
    .in("id", ids)
    .eq("wines.is_live", true);

  if (error) {
    throw new Error(error.message);
  }

  const links: Record<string, Top100ProducerShopLink> = {};
  for (const row of data ?? []) {
    const id = typeof row.id === "string" ? row.id : "";
    const name = typeof row.name === "string" ? row.name : "";
    const displayName =
      typeof row.display_name === "string" ? row.display_name : null;
    const wines = Array.isArray(row.wines) ? row.wines : [];
    const link = top100ProducerShopLinkFromRow(locale, {
      name,
      displayName,
      hasLiveWine: wines.length > 0,
    });
    if (id && link) links[id] = link;
  }
  return links;
}
