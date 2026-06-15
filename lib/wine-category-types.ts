export type WineCategoryFilter = {
  color?: string[];
  tags?: string[];
  /** @deprecated Prefer `farming` — kept for legacy rows. */
  isNatural?: boolean;
  filterGrape?: string;
  farming?: string[];
};

export type WineCategory = {
  slug: string;
  locale: "sv" | "en";
  h1: string;
  title: string;
  metaDescription: string;
  description: string;
  longDescription?: string;
  filter: WineCategoryFilter;
  hreflang?: string;
  canonical: string;
};
