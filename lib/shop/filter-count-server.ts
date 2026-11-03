import {
  getActiveColorFromPathname,
  getActiveWineRegionFromPathname,
} from "@/lib/wine-categories";
import { isProducerCollectionSegment } from "@/lib/shop/producer-collection-segment";
import { parseWineRegionParam } from "@/lib/wine-regions";

/** Path-based colour on /vin|/wine/[segment] (e.g. rott-naturvin → Red). */
export function pathColorFilterActive(
  collectionSegment: string | undefined,
): boolean {
  if (!collectionSegment) return false;
  return Boolean(
    getActiveColorFromPathname(`/vin/${collectionSegment}`) ||
      getActiveColorFromPathname(`/wine/${collectionSegment}`),
  );
}

/** Mirror of client useFilterCount — for SSR layout props only. */
export function countActiveShopFilters(
  searchParams: Record<string, string | string[] | undefined>,
  collectionSegment?: string,
): number {
  let count = 0;

  const arrayParam = (key: string): string[] => {
    const value = searchParams[key];
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const fcolor = arrayParam("fcolor");
  count += fcolor.length;
  // Clean colour category URLs have no ?fcolor= — still count path colour.
  if (fcolor.length === 0 && pathColorFilterActive(collectionSegment)) {
    count += 1;
  }

  count += arrayParam("fgrape").length;
  count += arrayParam("ffarming").length;
  count += arrayParam("fsource").length;
  const regionSlugs = parseWineRegionParam(searchParams.region);
  count += regionSlugs.length;
  if (
    regionSlugs.length === 0 &&
    collectionSegment &&
    (getActiveWineRegionFromPathname(`/vin/${collectionSegment}`) ||
      getActiveWineRegionFromPathname(`/wine/${collectionSegment}`))
  ) {
    count += 1;
  }

  // Wine category paths (rott-naturvin, …) share [collection] but are not producers.
  if (isProducerCollectionSegment(collectionSegment)) {
    count += 1;
  }

  const q = searchParams.q;
  const query = typeof q === "string" ? q : Array.isArray(q) ? q[0] : "";
  if (query.trim().length > 0) {
    count += 1;
  }

  return count;
}

export function parseSearchParamsFromQueryString(
  search: string,
): Record<string, string | string[] | undefined> {
  const params: Record<string, string | string[] | undefined> = {};
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return params;

  for (const part of query.split("&")) {
    if (!part) continue;
    const [rawKey, rawValue = ""] = part.split("=");
    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    const existing = params[key];
    if (existing === undefined) {
      params[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      params[key] = [existing, value];
    }
  }

  return params;
}
