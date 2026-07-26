const LANGUEDOC_REGION_RE =
  /Languedoc|Roussillon|Hérault|Faugères|Saint-Chinian|Gard|Calce/i;

export function isLanguedocRoussillonRegion(region: string): boolean {
  return LANGUEDOC_REGION_RE.test(region);
}

export function filterLanguedocRoussillonEntries<T extends { region: string }>(
  entries: T[],
): T[] {
  return entries.filter((entry) => isLanguedocRoussillonRegion(entry.region));
}
