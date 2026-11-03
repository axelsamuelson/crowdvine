import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generateProducerSlug } from "@/lib/producer-handle";
import { producerDisplayName } from "@/lib/producer-display-name";

export interface CollectionData {
  id: string;
  handle: string;
  title: string;
  /** Raw producers.display_name. */
  displayName?: string | null;
  description: string;
  updatedAt: string;
  createdAt: string;
  seo?: { title: string; description: string };
  /** Raw JSONB from producers.short_description — locale resolved at render. */
  shortDescription?: Record<string, string> | string | null;
  certification?: string | null;
  /** Organic registry URL; absent → according-to-producer organic wording. */
  certificationVerifiedUrl?: string | null;
  /** Registry proves conversion (not full organic yet). */
  certificationInConversion?: boolean | null;
  /** Organic certification stopped (ARRETEE). */
  certificationLapsed?: boolean | null;
  subregion?: string | null;
  foundedYear?: number | null;
  /** Producer region (also embedded in legacy description). */
  region?: string | null;
}

const PRODUCER_SELECT =
  "id, name, display_name, region, short_description, certification, certification_verified_url, certification_in_conversion, certification_lapsed, subregion, founded_year";

/**
 * Fetch collections (producers + wine boxes) directly from DB.
 * Use this for SSR to avoid HTTP fetch and Vercel Deployment Protection 401.
 */
export async function fetchCollectionsData(): Promise<CollectionData[]> {
  const sb = getSupabaseAdmin();

  try {
    const { data: producers, error } = await sb
      .from("producers")
      .select(PRODUCER_SELECT)
      .order("name")
      .eq("is_live", true);
    if (error && /is_live|column.*does not exist|could not find.*column/i.test(error.message)) {
      let retrySelect = PRODUCER_SELECT;
      if (/certification_lapsed/i.test(error.message)) {
        retrySelect = retrySelect.replace(", certification_lapsed", "");
      }
      if (/certification_in_conversion/i.test(error.message)) {
        retrySelect = retrySelect.replace(", certification_in_conversion", "");
      }
      if (/certification_verified_url/i.test(error.message)) {
        retrySelect = retrySelect.replace(", certification_verified_url", "");
      }
      if (/display_name/i.test(error.message)) {
        retrySelect = retrySelect.replace(", display_name", "");
      }
      const fallback = await sb
        .from("producers")
        .select(retrySelect)
        .order("name");
      if (fallback.error) throw fallback.error;
      return buildCollectionsFromProducers(fallback.data ?? []);
    }
    if (error) throw error;
    return buildCollectionsFromProducers(producers ?? []);
  } catch {
    const { data: producers, error } = await sb
      .from("producers")
      .select(PRODUCER_SELECT)
      .order("name");
    if (error) throw error;
    return buildCollectionsFromProducers(producers ?? []);
  }
}

function buildCollectionsFromProducers(producers: any[]): CollectionData[] {
  return producers.map((producer: any) => ({
    id: producer.id,
    handle: generateProducerSlug(producer.name),
    title: producer.name,
    displayName:
      typeof producer.display_name === "string" && producer.display_name.trim()
        ? producer.display_name.trim()
        : null,
    region: producer.region ?? null,
    description: `Wines from ${producerDisplayName({
      name: producer.name,
      display_name: producer.display_name,
    })} in ${producer.region}`,
    shortDescription: producer.short_description ?? null,
    certification: producer.certification ?? null,
    certificationVerifiedUrl: producer.certification_verified_url ?? null,
    certificationInConversion: producer.certification_in_conversion === true,
    certificationLapsed: producer.certification_lapsed === true,
    subregion: producer.subregion ?? null,
    foundedYear: producer.founded_year ?? null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }));
}

/** Read producer shop fields from a collection returned by getCollection(). */
export function asProducerCollectionData(
  collection: { id: string; handle: string; title: string; description: string },
): CollectionData {
  return collection as CollectionData;
}
