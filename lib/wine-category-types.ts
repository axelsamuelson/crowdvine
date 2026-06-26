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
  /** Bullet list for grape category "taste & character" section. */
  tastingProfile?: string[];
  /** Grape category food pairing copy. */
  foodPairing?: string;
  /** Footer "about" copy — replaces duplicated description. */
  aboutText?: string;
  filter: WineCategoryFilter;
  hreflang?: string;
  canonical: string;
};
