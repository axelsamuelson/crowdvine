"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useParams } from "next/navigation";

/** Keep in sync with PRODUCER_BOXES_PATH. Not imported from config (that module is server-only). */
const PRODUCER_BOX_SLUGS = new Set(["naturvin-lada", "natural-wine-box"]);

function isShopCollectionSegment(segment: string | undefined): boolean {
  if (!segment) return false;
  return !PRODUCER_BOX_SLUGS.has(segment);
}

export function useFilterCount() {
  const params = useParams<{ collection: string }>();
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
  const [searchQ] = useQueryState("q", parseAsString);

  // Count active filters
  let count = 0;

  // Count color filters
  if (color.length > 0) {
    count += color.length;
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

  // Count collection filter (if not on "all" products).
  // Producer-box slugs share /vin/[collection] but are not a filter.
  if (isShopCollectionSegment(params.collection)) {
    count += 1;
  }

  if (searchQ && searchQ.trim().length > 0) {
    count += 1;
  }

  return count;
}

export function useCategoryFilterCount() {
  const params = useParams<{ collection: string }>();

  // Return 1 if a category is selected, 0 if not
  return isShopCollectionSegment(params.collection) ? 1 : 0;
}

export function useColorFilterCount() {
  const [color] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // Return the number of selected color filters
  return color.length;
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
