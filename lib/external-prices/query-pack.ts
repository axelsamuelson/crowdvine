/**
 * Build multiple search queries per wine for candidate discovery (union + dedupe).
 */

import type { WineForMatch } from "./types";

/**
 * Returns an ordered list of search strings to try for a wine.
 * 1) producer + wine_name + vintage
 * 2) producer + wine_name
 * 3) wine_name + vintage
 * 4) producer + vintage
 * 5) wine_name
 * Empty segments are omitted; duplicates are not returned.
 */
export function buildQueryPack(wine: WineForMatch): string[] {
  const producer = wine.producer?.name?.trim() ?? "";
  const name = wine.wine_name?.trim() ?? "";
  const vintage = wine.vintage?.trim() ?? "";

  const result: string[] = [];
  const add = (q: string) => {
    const n = q.trim();
    if (n && !result.includes(n)) result.push(n);
  };

  if (producer && name && vintage) add([producer, name, vintage].join(" "));
  if (producer && name) add([producer, name].join(" "));
  if (name && vintage) add([name, vintage].join(" "));
  if (producer && vintage) add([producer, vintage].join(" "));
  if (name) add(name);
  return result;
}
