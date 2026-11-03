export function matchesLiveFilter(
  isLive: boolean | null | undefined,
  filter: string,
): boolean {
  if (filter === "hidden") return isLive === false;
  if (filter === "live") return isLive !== false;
  return true;
}

/** `producer` or wholesaler (`wholesaler` / `wholesale`). */
export function matchesSourceFilter(
  sourceType: string | null | undefined,
  filter: string,
): boolean {
  if (!filter || filter === "all") return true;
  const value = (sourceType ?? "").trim().toLowerCase();
  if (filter === "producer") return value === "producer";
  if (filter === "wholesaler") {
    return value === "wholesaler" || value === "wholesale";
  }
  return true;
}

export function matchesImageFilter(
  hasImage: boolean,
  filter: string,
): boolean {
  if (filter === "with") return hasImage;
  if (filter === "without") return !hasImage;
  return true;
}
