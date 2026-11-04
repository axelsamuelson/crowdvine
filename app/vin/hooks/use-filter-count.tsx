"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useParams, usePathname } from "next/navigation";
import { isProducerCollectionSegment } from "@/lib/shop/producer-collection-segment";
import {
  getActiveColorFromPathname,
  getActiveWineRegionFromPathname,
} from "@/lib/wine-categories";

type ShopRouteParams = {
  collection?: string | string[];
  category?: string | string[];
};

function paramValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value.length > 0 ? value : undefined;
  if (Array.isArray(value)) return value.find((part) => part.length > 0);
  return undefined;
}

/** Producer handle from /vin/[collection] or /wine/[category]. Category and box slugs are ignored. */
export function producerSegmentFromParams(
  params: ShopRouteParams | null,
): string | undefined {
  if (!params) return undefined;
  const segment = paramValue(params.collection) ?? paramValue(params.category);
  return isProducerCollectionSegment(segment) ? segment : undefined;
}

export function useFilterCount() {
  const params = useParams<ShopRouteParams>();
  const pathname = usePathname() || "";
  const [color] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [grapes] = useQueryState(
    "fgrape",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [sources] = useQueryState(
    "fsource",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [farming] = useQueryState(
    "ffarming",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [regions] = useQueryState(
    "region",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [searchQ] = useQueryState("q", parseAsString);

  // Count active filters
  let count = 0;

  // Count color filters (?fcolor= and clean colour category URLs)
  if (color.length > 0) {
    count += color.length;
  } else if (getActiveColorFromPathname(pathname)) {
    count += 1;
  }

  // Count grape filters
  if (grapes.length > 0) {
    count += grapes.length;
  }

  // Count farming filters
  if (farming.length > 0) {
    count += farming.length;
  }

  // Count competitor/source filters
  if (sources.length > 0) {
    count += sources.length;
  }

  if (regions.length > 0) {
    count += regions.length;
  } else if (getActiveWineRegionFromPathname(pathname)) {
    count += 1;
  }

  // Count producer collection filter only — wine category paths
  // (e.g. /vin/rott-naturvin) share [collection] but are not producers.
  if (producerSegmentFromParams(params)) {
    count += 1;
  }

  if (searchQ && searchQ.trim().length > 0) {
    count += 1;
  }

  return count;
}

export function useCategoryFilterCount() {
  const params = useParams<ShopRouteParams>();

  // Return 1 if a producer collection is selected, 0 if not
  return producerSegmentFromParams(params) ? 1 : 0;
}

export function useColorFilterCount() {
  const pathname = usePathname() || "";
  const [color] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  if (color.length > 0) return color.length;
  return getActiveColorFromPathname(pathname) ? 1 : 0;
}

export function useGrapeFilterCount() {
  const [grapes] = useQueryState(
    "fgrape",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  return grapes.length;
}

export function useCompetitorFilterCount() {
  const [sources] = useQueryState(
    "fsource",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  return sources.length;
}

export function useFarmingFilterCount() {
  const [farming] = useQueryState(
    "ffarming",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  return farming.length;
}

export function useRegionFilterCount() {
  const pathname = usePathname() || "";
  const [regions] = useQueryState(
    "region",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  if (regions.length > 0) return regions.length;
  return getActiveWineRegionFromPathname(pathname) ? 1 : 0;
}
