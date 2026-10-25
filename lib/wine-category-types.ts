export type WineCategoryFaqItem = {
  question: string;
  /** Plain text or markdown links `[label](/path)`. */
  answer: string;
};

export type WineCategoryDescriptionLink = {
  label: string;
  href: string;
};

export type WineCategoryFilter = {
  color?: string[];
  tags?: string[];
  /** @deprecated Prefer `farming` — kept for legacy rows. */
  isNatural?: boolean;
  filterGrape?: string;
  farming?: string[];
  /** Match producers.country_code (ISO), e.g. "FR". */
  countryCode?: string;
  /** Match producers.region, e.g. "Languedoc". */
  region?: string;
};

export type WineCategory = {
  slug: string;
  locale: "sv" | "en";
  h1: string;
  title: string;
  metaDescription: string;
  description: string;
  /** Optional guide link rendered directly under the intro. */
  descriptionLink?: WineCategoryDescriptionLink;
  longDescription?: string;
  /** Bullet list for grape category "taste & character" section. */
  tastingProfile?: string[];
  /** Grape category food pairing copy. */
  foodPairing?: string;
  /** Footer "about" copy — replaces duplicated description. */
  aboutText?: string;
  /** Editorial longDescription section heading (merged from content overrides). */
  contentHeading?: string;
  /** Optional FAQ items for editorial section + FAQPage JSON-LD. */
  faq?: WineCategoryFaqItem[];
  filter: WineCategoryFilter;
  hreflang?: string;
  canonical: string;
};
