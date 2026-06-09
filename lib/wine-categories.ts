export type WineCategoryFilter = {
  color?: string[];
  tags?: string[];
  isNatural?: boolean;
};

export type WineCategory = {
  slug: string;
  locale: "sv" | "en";
  h1: string;
  title: string;
  metaDescription: string;
  description: string;
  filter: WineCategoryFilter;
  hreflang?: string;
  canonical: string;
};

export const WINE_CATEGORIES_SV: WineCategory[] = [
  {
    slug: "naturvin",
    locale: "sv",
    h1: "Naturvin",
    title: "Köpa naturvin online — direktimporterat från Languedoc | PACT",
    metaDescription:
      "Köp naturvin direkt från småproducenter i Languedoc. Hemleverans i Stockholm. Inga mellanhänder, inga tillsatser.",
    description:
      "Naturvin direktimporterat från Languedoc till Stockholm. Alla viner är ekologiskt eller biodynamiskt odlade utan tillsatser.",
    filter: { isNatural: true },
    hreflang: "natural-wine",
    canonical: "/vin/naturvin",
  },
  {
    slug: "rott-naturvin",
    locale: "sv",
    h1: "Rött naturvin",
    title: "Köpa rött naturvin online | PACT",
    metaDescription:
      "Rött naturvin direkt från Languedoc. Carignan, Grenache, Syrah och mer — hemleverans i Stockholm.",
    description:
      "Röda naturviner direktimporterade från Languedoc. Från lättrörliga vardagsviner till komplexa matviner.",
    filter: { isNatural: true, color: ["Red"] },
    hreflang: "red-natural-wine",
    canonical: "/vin/rott-naturvin",
  },
  {
    slug: "vitt-naturvin",
    locale: "sv",
    h1: "Vitt naturvin",
    title: "Köpa vitt naturvin online | PACT",
    metaDescription:
      "Vitt naturvin direkt från Languedoc. Vermentino, Chardonnay, Terret och mer — hemleverans i Stockholm.",
    description:
      "Vita naturviner direktimporterade från Languedoc. Mineraliska, friska och utan tillsatser.",
    filter: { isNatural: true, color: ["White"] },
    hreflang: "white-natural-wine",
    canonical: "/vin/vitt-naturvin",
  },
  {
    slug: "orange-naturvin",
    locale: "sv",
    h1: "Orange naturvin",
    title: "Köpa orange naturvin online | PACT",
    metaDescription:
      "Orange naturvin med skalkontakt direkt från Languedoc. Textur, djup och karaktär — hemleverans i Stockholm.",
    description:
      "Orangeviner med skalkontakt från Languedoc. Gjorda på vita druvor med lång kontakt med skalet — textur och djup.",
    filter: { isNatural: true, color: ["Orange"] },
    hreflang: "orange-natural-wine",
    canonical: "/vin/orange-naturvin",
  },
  {
    slug: "rod-och-vit-naturvin",
    locale: "sv",
    h1: "Rött & vitt naturvin",
    title: "Rött och vitt naturvin — assemblage | PACT",
    metaDescription:
      "Naturvin gjorda på både röda och vita druvor. Direktimporterat från Languedoc.",
    description:
      "Assemblage av röda och vita druvor — en ovanlig stil direktimporterad från Languedoc.",
    filter: { isNatural: true, color: ["Red & White"] },
    hreflang: "red-and-white-natural-wine",
    canonical: "/vin/rod-och-vit-naturvin",
  },
  {
    slug: "rod-och-orange-naturvin",
    locale: "sv",
    h1: "Rött & orange naturvin",
    title: "Rött och orange naturvin — assemblage | PACT",
    metaDescription:
      "Naturvin gjorda på röda druvor med skalkontakt. Direktimporterat från Languedoc.",
    description:
      "Co-fermenterade röda och orangea druvor — en expressiv stil från Languedoc.",
    filter: { isNatural: true, color: ["Red & Orange"] },
    hreflang: "red-and-orange-natural-wine",
    canonical: "/vin/rod-och-orange-naturvin",
  },
  {
    slug: "naturvin-languedoc",
    locale: "sv",
    h1: "Naturvin från Languedoc",
    title: "Naturvin från Languedoc — direktimport till Stockholm | PACT",
    metaDescription:
      "Naturvin direkt från småproducenter i Languedoc, Frankrike. Direktimporterat till Stockholm utan mellanhänder.",
    description:
      "Languedoc är Frankrikes mest dynamiska naturvinsregion. Vi importerar direkt från producenten till din dörr.",
    filter: { isNatural: true },
    hreflang: "natural-wine-languedoc",
    canonical: "/vin/naturvin-languedoc",
  },
  {
    slug: "naturvin-frankrike",
    locale: "sv",
    h1: "Naturvin från Frankrike",
    title: "Köpa naturvin från Frankrike online | PACT",
    metaDescription:
      "Franskt naturvin direktimporterat från Languedoc. Köp naturvin från Frankrike med hemleverans i Stockholm.",
    description:
      "Alla viner i PACTs sortiment kommer från Languedoc i södra Frankrike — direktimporterade utan mellanhänder.",
    filter: { isNatural: true },
    hreflang: "natural-wine-france",
    canonical: "/vin/naturvin-frankrike",
  },
  {
    slug: "rott-naturvin-languedoc",
    locale: "sv",
    h1: "Rött naturvin från Languedoc",
    title: "Rött naturvin från Languedoc | PACT",
    metaDescription:
      "Rött naturvin direkt från Languedoc, Frankrike. Carignan, Grenache, Syrah — hemleverans Stockholm.",
    description:
      "Röda naturviner från Languedocs bästa småproducenter. Direktimporterat till Stockholm.",
    filter: { isNatural: true, color: ["Red"] },
    hreflang: "red-natural-wine-languedoc",
    canonical: "/vin/rott-naturvin-languedoc",
  },
  {
    slug: "vitt-naturvin-languedoc",
    locale: "sv",
    h1: "Vitt naturvin från Languedoc",
    title: "Vitt naturvin från Languedoc | PACT",
    metaDescription:
      "Vitt naturvin direkt från Languedoc, Frankrike. Vermentino, Chardonnay, Terret — hemleverans Stockholm.",
    description:
      "Vita naturviner från Languedocs bästa småproducenter. Direktimporterat till Stockholm.",
    filter: { isNatural: true, color: ["White"] },
    hreflang: "white-natural-wine-languedoc",
    canonical: "/vin/vitt-naturvin-languedoc",
  },
  {
    slug: "orange-naturvin-languedoc",
    locale: "sv",
    h1: "Orange naturvin från Languedoc",
    title: "Orange naturvin från Languedoc | PACT",
    metaDescription:
      "Orange naturvin med skalkontakt direkt från Languedoc, Frankrike. Hemleverans Stockholm.",
    description:
      "Orangeviner från Languedoc — vita druvor med skalkontakt som ger textur, djup och karaktär.",
    filter: { isNatural: true, color: ["Orange"] },
    hreflang: "orange-natural-wine-languedoc",
    canonical: "/vin/orange-naturvin-languedoc",
  },
  {
    slug: "naturvin-hemleverans-stockholm",
    locale: "sv",
    h1: "Naturvin med hemleverans i Stockholm",
    title: "Naturvin hemleverans Stockholm — direktimport | PACT",
    metaDescription:
      "Beställ naturvin online med hemleverans i Stockholm. Direktimporterat från Languedoc via PACT.",
    description:
      "PACT levererar naturvin hem till dig i Stockholm. Direktimporterat från Languedoc — billigare och friare än vad som finns i butik.",
    filter: { isNatural: true },
    hreflang: "natural-wine-delivery-stockholm",
    canonical: "/vin/naturvin-hemleverans-stockholm",
  },
  {
    slug: "direktimport-vin",
    locale: "sv",
    h1: "Direktimport av vin från Languedoc",
    title: "Direktimport vin Sverige — köp direkt från producenten | PACT",
    metaDescription:
      "Köp vin direktimporterat från Languedoc till Sverige. PACT samlar beställningar och skickar direkt från producenten.",
    description:
      "PACT är en direktimportör av naturvin från Languedoc. Vi samlar beställningar tills en pall är full — sedan skickar producenten direkt till dig.",
    filter: {},
    hreflang: "direct-import-wine",
    canonical: "/vin/direktimport-vin",
  },
];

export const WINE_CATEGORIES_EN: WineCategory[] = [
  {
    slug: "natural-wine",
    locale: "en",
    h1: "Natural Wine",
    title: "Buy Natural Wine Online — Direct from Languedoc | PACT",
    metaDescription:
      "Buy natural wine directly from small producers in Languedoc. Home delivery in Stockholm. No middlemen, no additives.",
    description:
      "Natural wine directly imported from Languedoc to Stockholm. All wines are organically or biodynamically farmed without additives.",
    filter: { isNatural: true },
    hreflang: "naturvin",
    canonical: "/wine/natural-wine",
  },
  {
    slug: "red-natural-wine",
    locale: "en",
    h1: "Red Natural Wine",
    title: "Buy Red Natural Wine Online | PACT",
    metaDescription:
      "Red natural wine direct from Languedoc. Carignan, Grenache, Syrah and more — home delivery in Stockholm.",
    description:
      "Red natural wines directly imported from Languedoc. From light everyday wines to complex food wines.",
    filter: { isNatural: true, color: ["Red"] },
    hreflang: "rott-naturvin",
    canonical: "/wine/red-natural-wine",
  },
  {
    slug: "white-natural-wine",
    locale: "en",
    h1: "White Natural Wine",
    title: "Buy White Natural Wine Online | PACT",
    metaDescription:
      "White natural wine direct from Languedoc. Vermentino, Chardonnay, Terret and more — home delivery in Stockholm.",
    description:
      "White natural wines directly imported from Languedoc. Mineral, fresh and without additives.",
    filter: { isNatural: true, color: ["White"] },
    hreflang: "vitt-naturvin",
    canonical: "/wine/white-natural-wine",
  },
  {
    slug: "orange-natural-wine",
    locale: "en",
    h1: "Orange Natural Wine",
    title: "Buy Orange Natural Wine Online | PACT",
    metaDescription:
      "Orange natural wine with skin contact direct from Languedoc. Texture, depth and character — home delivery in Stockholm.",
    description:
      "Orange wines with skin contact from Languedoc. Made from white grapes with extended skin contact — texture and depth.",
    filter: { isNatural: true, color: ["Orange"] },
    hreflang: "orange-naturvin",
    canonical: "/wine/orange-natural-wine",
  },
  {
    slug: "red-and-white-natural-wine",
    locale: "en",
    h1: "Red & White Natural Wine",
    title: "Red and White Natural Wine — assemblage | PACT",
    metaDescription:
      "Natural wines made from both red and white grapes. Direct import from Languedoc.",
    description:
      "Assemblage of red and white grapes — an unusual style directly imported from Languedoc.",
    filter: { isNatural: true, color: ["Red & White"] },
    hreflang: "rod-och-vit-naturvin",
    canonical: "/wine/red-and-white-natural-wine",
  },
  {
    slug: "red-and-orange-natural-wine",
    locale: "en",
    h1: "Red & Orange Natural Wine",
    title: "Red and Orange Natural Wine | PACT",
    metaDescription:
      "Natural wines made from red grapes with skin contact. Direct import from Languedoc.",
    description:
      "Co-fermented red and orange grapes — an expressive style from Languedoc.",
    filter: { isNatural: true, color: ["Red & Orange"] },
    hreflang: "rod-och-orange-naturvin",
    canonical: "/wine/red-and-orange-natural-wine",
  },
  {
    slug: "natural-wine-languedoc",
    locale: "en",
    h1: "Natural Wine from Languedoc",
    title: "Natural Wine from Languedoc — Direct Import to Stockholm | PACT",
    metaDescription:
      "Natural wine direct from small producers in Languedoc, France. Imported directly to Stockholm without middlemen.",
    description:
      "Languedoc is France's most dynamic natural wine region. We import directly from the producer to your door.",
    filter: { isNatural: true },
    hreflang: "naturvin-languedoc",
    canonical: "/wine/natural-wine-languedoc",
  },
  {
    slug: "natural-wine-france",
    locale: "en",
    h1: "Natural Wine from France",
    title: "Buy French Natural Wine Online | PACT",
    metaDescription:
      "French natural wine directly imported from Languedoc. Buy natural wine from France with home delivery in Stockholm.",
    description:
      "All wines in PACT's range come from Languedoc in southern France — directly imported without middlemen.",
    filter: { isNatural: true },
    hreflang: "naturvin-frankrike",
    canonical: "/wine/natural-wine-france",
  },
  {
    slug: "red-natural-wine-languedoc",
    locale: "en",
    h1: "Red Natural Wine from Languedoc",
    title: "Red Natural Wine from Languedoc | PACT",
    metaDescription:
      "Red natural wine direct from Languedoc, France. Carignan, Grenache, Syrah — home delivery Stockholm.",
    description:
      "Red natural wines from Languedoc's best small producers. Directly imported to Stockholm.",
    filter: { isNatural: true, color: ["Red"] },
    hreflang: "rott-naturvin-languedoc",
    canonical: "/wine/red-natural-wine-languedoc",
  },
  {
    slug: "white-natural-wine-languedoc",
    locale: "en",
    h1: "White Natural Wine from Languedoc",
    title: "White Natural Wine from Languedoc | PACT",
    metaDescription:
      "White natural wine direct from Languedoc, France. Vermentino, Chardonnay, Terret — home delivery Stockholm.",
    description:
      "White natural wines from Languedoc's best small producers. Directly imported to Stockholm.",
    filter: { isNatural: true, color: ["White"] },
    hreflang: "vitt-naturvin-languedoc",
    canonical: "/wine/white-natural-wine-languedoc",
  },
  {
    slug: "orange-natural-wine-languedoc",
    locale: "en",
    h1: "Orange Natural Wine from Languedoc",
    title: "Orange Natural Wine from Languedoc | PACT",
    metaDescription:
      "Orange natural wine with skin contact direct from Languedoc, France. Home delivery Stockholm.",
    description:
      "Orange wines from Languedoc — white grapes with skin contact for texture, depth and character.",
    filter: { isNatural: true, color: ["Orange"] },
    hreflang: "orange-naturvin-languedoc",
    canonical: "/wine/orange-natural-wine-languedoc",
  },
  {
    slug: "natural-wine-delivery-stockholm",
    locale: "en",
    h1: "Natural Wine Home Delivery Stockholm",
    title: "Natural Wine Delivery Stockholm — Direct Import | PACT",
    metaDescription:
      "Order natural wine online with home delivery in Stockholm. Directly imported from Languedoc via PACT.",
    description:
      "PACT delivers natural wine to your home in Stockholm. Directly imported from Languedoc — better value and more interesting than what you'll find in stores.",
    filter: { isNatural: true },
    hreflang: "naturvin-hemleverans-stockholm",
    canonical: "/wine/natural-wine-delivery-stockholm",
  },
  {
    slug: "direct-import-wine",
    locale: "en",
    h1: "Direct Import Wine from Languedoc",
    title: "Direct Import Wine Sweden — Buy Direct from Producer | PACT",
    metaDescription:
      "Buy wine directly imported from Languedoc to Sweden. PACT aggregates orders and ships directly from the producer.",
    description:
      "PACT is a direct importer of natural wine from Languedoc. We aggregate orders until a pallet is full — then the producer ships directly to you.",
    filter: {},
    hreflang: "direktimport-vin",
    canonical: "/wine/direct-import-wine",
  },
];

/** Short color slugs → canonical category slug (EN). */
export const WINE_CATEGORY_EN_ALIASES: Record<string, string> = {
  red: "red-natural-wine",
  white: "white-natural-wine",
  orange: "orange-natural-wine",
};

/** Short color slugs → canonical category slug (SV). */
export const WINE_CATEGORY_SV_ALIASES: Record<string, string> = {
  rott: "rott-naturvin",
  vitt: "vitt-naturvin",
};

export function getWineCategoryEnCanonicalSlug(slug: string): string {
  return WINE_CATEGORY_EN_ALIASES[slug] ?? slug;
}

export function getWineCategorySvCanonicalSlug(slug: string): string {
  return WINE_CATEGORY_SV_ALIASES[slug] ?? slug;
}

export function isWineCategoryEnAlias(slug: string): boolean {
  return slug in WINE_CATEGORY_EN_ALIASES;
}

export function isWineCategorySvAlias(slug: string): boolean {
  return slug in WINE_CATEGORY_SV_ALIASES;
}

export function getWineCategorySv(slug: string): WineCategory | undefined {
  const canonicalSlug = getWineCategorySvCanonicalSlug(slug);
  return WINE_CATEGORIES_SV.find((c) => c.slug === canonicalSlug);
}

export function getWineCategoryEn(slug: string): WineCategory | undefined {
  const canonicalSlug = getWineCategoryEnCanonicalSlug(slug);
  return WINE_CATEGORIES_EN.find((c) => c.slug === canonicalSlug);
}

export function getHreflangPath(category: WineCategory): string {
  if (!category.hreflang) return category.canonical;
  return category.locale === "sv"
    ? `/wine/${category.hreflang}`
    : `/vin/${category.hreflang}`;
}

export function getCategoryUrlForColor(
  colorName: string,
  locale: "sv" | "en",
): string | null {
  const uiToDbColor: Record<string, string> = {
    "Red/White": "Red & White",
    "Red/Orange": "Red & Orange",
  };
  const dbColor = uiToDbColor[colorName] ?? colorName;

  const categories =
    locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;

  const match = categories.find(
    (c) =>
      c.filter.color?.length === 1 &&
      c.filter.color[0] === dbColor &&
      c.filter.isNatural === true &&
      !c.filter.tags?.length &&
      !c.slug.includes("languedoc") &&
      !c.slug.includes("frankrike") &&
      !c.slug.includes("france") &&
      !c.slug.includes("stockholm") &&
      !c.slug.includes("delivery") &&
      !c.slug.includes("hemleverans"),
  );

  return match ? match.canonical : null;
}
