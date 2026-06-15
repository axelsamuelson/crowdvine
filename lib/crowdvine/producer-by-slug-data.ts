import { PRODUCER_DB_SELECT } from "@/lib/catalog-mappers";
import {
  extractWineText,
  type WineLocale,
} from "@/lib/i18n/wine-locale";
import { generateProducerSlug } from "@/lib/producer-handle";
import { fetchIndexableProducersFromDb } from "@/lib/crowdvine/indexable-producers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AppLocale } from "@/lib/i18n/locale";

type ProducerRow = {
  id: string;
  name: string;
  region: string | null;
  subregion: string | null;
  country_code: string | null;
  founded_year: number | null;
  short_description: unknown;
  bio_long: unknown;
  certification: string | null;
  contact_name: string | null;
};

type WineRow = {
  id: string;
  wine_name: string;
  vintage: string | null;
  handle: string;
  color: string | null;
  base_price_cents: number | null;
  summary: unknown;
  grape_varieties: string | null;
  appellation: string | null;
  is_live: boolean | null;
  farming: string | null;
};

export type ProducerBySlugPayload = {
  producer: {
    id: string;
    name: string;
    region: string | null;
    subregion: string | null;
    country: string | null;
    founded_year: number | null;
    certification: string | null;
    contact_name: string | null;
    bio_short: string | null;
    bio_long: string | null;
    slug: string;
  };
  wines: Array<{
    id: string;
    wine_name: string;
    vintage: string | null;
    handle: string;
    type: string | null;
    color: string | null;
    price_sek: number;
    summary: string | null;
    grape_varieties: string | null;
    appellation: string | null;
    is_published: boolean;
    farming: string | null;
  }>;
};

function mapWineRow(row: WineRow, locale: WineLocale) {
  return {
    id: row.id,
    wine_name: row.wine_name,
    vintage: row.vintage,
    handle: row.handle,
    type: row.color,
    color: row.color,
    price_sek:
      row.base_price_cents != null
        ? Math.round(row.base_price_cents / 100)
        : 0,
    summary: extractWineText(
      row.summary as Record<string, string> | string | null,
      locale,
    ),
    grape_varieties: row.grape_varieties,
    appellation: row.appellation,
    is_published: row.is_live === true,
    farming: row.farming,
  };
}

/** Direct DB lookup — bypasses HTTP and Deployment Protection. */
export async function getProducerBySlugForLocale(
  rawSlug: string,
  locale: AppLocale,
): Promise<ProducerBySlugPayload | null> {
  const slug = rawSlug?.trim().toLowerCase();
  if (!slug) return null;

  const wineLocale: WineLocale = locale === "en" ? "en" : "sv";
  const sb = getSupabaseAdmin();

  const producers = await fetchIndexableProducersFromDb(PRODUCER_DB_SELECT);

  const producer = producers.find(
    (row) => generateProducerSlug(String((row as ProducerRow).name)) === slug,
  ) as ProducerRow | undefined;

  if (!producer) return null;

  const { data: wines, error: winesError } = await sb
    .from("wines")
    .select(
      "id, wine_name, vintage, handle, color, base_price_cents, summary, grape_varieties, appellation, is_live, farming",
    )
    .eq("producer_id", producer.id)
    .eq("is_live", true);

  if (winesError) return null;

  return {
    producer: {
      id: producer.id,
      name: producer.name,
      region: producer.region,
      subregion: producer.subregion,
      country: producer.country_code,
      founded_year: producer.founded_year,
      certification: producer.certification,
      contact_name: producer.contact_name,
      bio_short: extractWineText(
        producer.short_description as Record<string, string> | string | null,
        wineLocale,
      ),
      bio_long: extractWineText(
        producer.bio_long as Record<string, string> | string | null,
        wineLocale,
      ),
      slug: generateProducerSlug(producer.name),
    },
    wines: (wines ?? []).map((row) => mapWineRow(row as WineRow, wineLocale)),
  };
}
