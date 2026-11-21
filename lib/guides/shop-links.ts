/**
 * Contextual shop links for guide pages (/guider/*, /guides/* and hubs).
 * Link map verified live by SEO (Alex) 15/11. Lead-in copy: CMO final.
 */

export type GuideShopLink = {
  href: string;
  /** Anchor text exactly as in the SEO link map — no arrows or buying words. */
  anchor: string;
};

/** Explicit NONE = no shop-links block for that guide path. */
export type GuideShopLinksEntry = readonly GuideShopLink[] | "NONE";

export const GUIDE_SHOP_LINKS_HEADING = {
  sv: "Naturviner hos PACT",
  en: "Natural wines at PACT",
} as const;

/** Lead-in (Inès 2026-11-20: shared pallet or direct home; no buying prompts). */
export const GUIDE_SHOP_LINKS_LEAD = {
  sv: "Vi säljer naturvin från Frankrike med leverans i hela Sverige, på delad pall eller direkt hem.",
  en: "We sell natural wine from France with delivery across Sweden, on a shared pallet or directly to your door.",
} as const;

/**
 * Primary button label in the shop block (no arrow).
 * Distinct from guide-copy `shopNaturalWine` which still uses "→" elsewhere.
 */
export const GUIDE_SHOP_LINKS_BUTTON = {
  sv: "Shoppa naturvin",
  en: "Shop natural wine",
} as const;

/** Sentence case for pillista anchors; keeps proper nouns / rest of string. */
export function sentenceCaseAnchor(anchor: string): string {
  const trimmed = anchor.trim();
  if (!trimmed) return trimmed;
  const first = trimmed.charAt(0);
  return first.toLocaleUpperCase("sv-SE") + trimmed.slice(1);
}

/**
 * Shop paths that must not appear as guide → shop targets (noindex / thin /
 * wrong-locale slugs). Includes explicit paths plus pet-nat / sparkling /
 * rose / glouglou / georgia category slugs.
 */
export const GUIDE_SHOP_LINK_NOINDEX_TARGETS = [
  "/vin/naturvin-champagne",
  "/vin/naturvin-alsace",
  "/vin/ekologiskt-vin",
  "/wine/champagne-natural-wine",
  "/wine/alsace-natural-wine",
  "/wine/organic-wine",
  "/wine/naturvin-lada",
  "/vin/natural-wine-box",
] as const;

const NOINDEX_SLUG_FRAGMENTS = [
  "pet-nat",
  "petnat",
  "sparkling",
  "mousserande",
  "rose",
  "rosé",
  "glouglou",
  "glou-glou",
  "georgia",
  "georgien",
] as const;

/** Max contextual shop links per guide. */
export const GUIDE_SHOP_LINKS_MAX = 3;

/**
 * Guide path → links. Keys are the public pathname without trailing slash
 * (`/guides`, `/guider`, `/guides/jean-foillard`, …).
 */
export const GUIDE_SHOP_LINKS: Record<string, GuideShopLinksEntry> = {
  "/guides": [
    { href: "/wine", anchor: "natural wine" },
    { href: "/wine/orange-natural-wine", anchor: "orange wine" },
    {
      href: "/wine/languedoc-natural-wine",
      anchor: "natural wine from the Languedoc",
    },
  ],
  "/guider": [
    { href: "/vin", anchor: "naturvin" },
    { href: "/vin/orange-naturvin", anchor: "orange vin" },
    {
      href: "/vin/naturvin-languedoc",
      anchor: "naturvin från Languedoc",
    },
  ],

  "/guides/worlds-best-natural-wine-producers": [
    { href: "/producers", anchor: "producers" },
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/worlds-best-natural-wines": [
    { href: "/wine", anchor: "natural wine" },
    { href: "/wine/red-natural-wine", anchor: "red natural wine" },
    { href: "/wine/orange-natural-wine", anchor: "orange wine" },
  ],
  "/guides/worlds-best-orange-wines": [
    { href: "/wine/orange-natural-wine", anchor: "orange wine" },
  ],
  "/guides/worlds-best-natural-champagne": [
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/jean-foillard": [
    {
      href: "/producers/domaine-jean-foillard",
      anchor: "Jean Foillard",
    },
    {
      href: "/wine/beaujolais-natural-wine",
      anchor: "natural wine from Beaujolais",
    },
  ],
  "/guides/thierry-allemand": "NONE",
  "/guides/gang-of-four-wine": [
    {
      href: "/producers/domaine-jean-foillard",
      anchor: "Jean Foillard",
    },
    {
      href: "/wine/beaujolais-natural-wine",
      anchor: "natural wine from Beaujolais",
    },
  ],
  "/guides/best-natural-wines-systembolaget": [
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/jura-natural-wine": [
    {
      href: "/wine/jura-natural-wine",
      anchor: "natural wine from the Jura",
    },
    {
      href: "/producers/sas-anne-et-jean-francois-ganevat",
      anchor: "Jean-François Ganevat",
    },
  ],
  "/guides/radikon": "NONE",
  "/guides/best-orange-natural-wines-systembolaget": [
    { href: "/wine/orange-natural-wine", anchor: "orange wine" },
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/pierre-overnoy": "NONE",
  "/guides/beaujolais-natural-wine": [
    {
      href: "/wine/beaujolais-natural-wine",
      anchor: "natural wine from Beaujolais",
    },
    {
      href: "/producers/domaine-jean-foillard",
      anchor: "Jean Foillard",
    },
  ],
  "/guides/georgia-natural-wine": [
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/jacques-selosse": "NONE",
  "/guides/josko-gravner": "NONE",
  "/guides/jean-francois-ganevat": [
    {
      href: "/producers/sas-anne-et-jean-francois-ganevat",
      anchor: "Jean-François Ganevat",
    },
    {
      href: "/wine/jura-natural-wine",
      anchor: "natural wine from the Jura",
    },
  ],
  "/guides/natural-wine-home-delivery": [
    { href: "/wine", anchor: "natural wine" },
    { href: "/wine/natural-wine-box", anchor: "natural wine box" },
  ],
  "/guides/what-is-orange-wine": [
    { href: "/wine/orange-natural-wine", anchor: "orange wine" },
  ],
  "/guides/best-red-natural-wines-systembolaget": [
    { href: "/wine/red-natural-wine", anchor: "red natural wine" },
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/guy-breton": "NONE",
  "/guides/jean-paul-thevenet": "NONE",
  "/guides/buy-natural-wine-online-sweden": [
    { href: "/wine", anchor: "natural wine online" },
  ],
  "/guides/marcel-lapierre": "NONE",
  "/guides/languedoc-natural-wine": [
    {
      href: "/wine/languedoc-natural-wine",
      anchor: "natural wine from the Languedoc",
    },
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/new-natural-wines-systembolaget": [
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/best-rose-natural-wines-systembolaget": [
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/what-is-natural-wine": [
    { href: "/wine", anchor: "natural wine online" },
  ],
  "/guides/best-glou-glou-wines-systembolaget": [
    { href: "/wine", anchor: "natural wine" },
    { href: "/wine/red-natural-wine", anchor: "red natural wine" },
  ],
  "/guides/best-natural-wines-under-200-systembolaget": [
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/best-pet-nat-systembolaget": [
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/best-sparkling-natural-wines-systembolaget": [
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/best-white-natural-wines-systembolaget": [
    { href: "/wine/white-natural-wine", anchor: "white natural wine" },
    { href: "/wine", anchor: "natural wine" },
  ],
  "/guides/natural-vs-organic-vs-biodynamic-wine": [
    { href: "/wine", anchor: "natural wine" },
    { href: "/wine/biodynamic-wine", anchor: "biodynamic wine" },
  ],
  "/guides/what-is-pet-nat": [{ href: "/wine", anchor: "natural wine" }],

  "/guider/basta-orange-naturviner-systembolaget": [
    { href: "/vin/orange-naturvin", anchor: "orange vin" },
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/basta-pet-nat-systembolaget": [
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/basta-roda-naturviner-systembolaget": [
    { href: "/vin/rott-naturvin", anchor: "rött naturvin" },
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/basta-vita-naturviner-systembolaget": [
    { href: "/vin/vitt-naturvin", anchor: "vitt naturvin" },
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/varldens-basta-orange-viner": [
    { href: "/vin/orange-naturvin", anchor: "orange vin" },
  ],
  "/guider/nya-naturviner-systembolaget": [
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/varldens-basta-naturliga-champagne": [
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/basta-naturvinerna-pa-systembolaget": [
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/basta-naturviner-under-200kr-systembolaget": [
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/gang-of-four-wine": [
    {
      href: "/producenter/domaine-jean-foillard",
      anchor: "Jean Foillard",
    },
    {
      href: "/vin/naturvin-beaujolais",
      anchor: "naturvin från Beaujolais",
    },
  ],
  "/guider/jean-paul-thevenet": "NONE",
  "/guider/pierre-overnoy": "NONE",
  "/guider/basta-mousserande-naturviner-systembolaget": [
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/varldens-basta-naturviner": [
    { href: "/vin", anchor: "naturvin" },
    { href: "/vin/rott-naturvin", anchor: "rött naturvin" },
    { href: "/vin/orange-naturvin", anchor: "orange vin" },
  ],
  "/guider/radikon": "NONE",
  "/guider/guy-breton": "NONE",
  "/guider/georgia-natural-wine": [{ href: "/vin", anchor: "naturvin" }],
  "/guider/basta-rose-naturviner-systembolaget": [
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/marcel-lapierre": "NONE",
  "/guider/basta-glouglou-viner-systembolaget": [
    { href: "/vin", anchor: "naturvin" },
    { href: "/vin/rott-naturvin", anchor: "rött naturvin" },
  ],
  "/guider/vad-ar-naturvin": [
    { href: "/vin", anchor: "naturvin online" },
  ],
  "/guider/vad-ar-pet-nat": [{ href: "/vin", anchor: "naturvin" }],
  "/guider/jura-natural-wine": [
    {
      href: "/vin/naturvin-jura",
      anchor: "naturvin från Jura",
    },
    {
      href: "/producenter/sas-anne-et-jean-francois-ganevat",
      anchor: "Jean-François Ganevat",
    },
  ],
  "/guider/vad-ar-orange-vin": [
    { href: "/vin/orange-naturvin", anchor: "orange vin" },
  ],
  "/guider/jean-francois-ganevat": [
    {
      href: "/producenter/sas-anne-et-jean-francois-ganevat",
      anchor: "Jean-François Ganevat",
    },
    {
      href: "/vin/naturvin-jura",
      anchor: "naturvin från Jura",
    },
  ],
  "/guider/beaujolais-natural-wine": [
    {
      href: "/vin/naturvin-beaujolais",
      anchor: "naturvin från Beaujolais",
    },
    {
      href: "/producenter/domaine-jean-foillard",
      anchor: "Jean Foillard",
    },
  ],
  "/guider/varldens-basta-naturvinsproducenter": [
    { href: "/producenter", anchor: "producenter" },
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/jacques-selosse": "NONE",
  "/guider/josko-gravner": "NONE",
  "/guider/jean-foillard": [
    {
      href: "/producenter/domaine-jean-foillard",
      anchor: "Jean Foillard",
    },
    {
      href: "/vin/naturvin-beaujolais",
      anchor: "naturvin från Beaujolais",
    },
  ],
  "/guider/thierry-allemand": "NONE",
  "/guider/hemleverans-av-naturvin": [
    { href: "/vin", anchor: "naturvin" },
    { href: "/vin/naturvin-lada", anchor: "naturvinslåda" },
  ],
  "/guider/naturvin-languedoc": [
    {
      href: "/vin/naturvin-languedoc",
      anchor: "naturvin från Languedoc",
    },
    { href: "/vin", anchor: "naturvin" },
  ],
  "/guider/kopa-naturvin-online": [
    { href: "/vin", anchor: "naturvin online" },
  ],
};

function normalizeGuidePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return trimmed;
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith("/")
    ? withSlash.slice(0, -1)
    : withSlash;
}

/** Links for a guide path, or null when NONE / missing (no block). */
export function getGuideShopLinks(
  guidePath: string,
): readonly GuideShopLink[] | null {
  const entry = GUIDE_SHOP_LINKS[normalizeGuidePath(guidePath)];
  if (entry === undefined || entry === "NONE") return null;
  return entry;
}

export function isSystembolagetGuideSlug(slug: string): boolean {
  return slug.endsWith("-systembolaget");
}

/**
 * Existing end-of-article shop CTA ("Shoppa naturvin →" / "Shop natural wine →").
 * Hidden on every Systembolaget guide (slug ends with -systembolaget).
 */
export function shouldShowGuideShopCta(slug: string): boolean {
  return !isSystembolagetGuideSlug(slug);
}

export function isGuideShopLinkNoindexTarget(href: string): boolean {
  const path = normalizeGuidePath(href).split("?")[0]?.split("#")[0] ?? href;
  if (
    (GUIDE_SHOP_LINK_NOINDEX_TARGETS as readonly string[]).includes(path)
  ) {
    return true;
  }
  const segments = path.split("/").filter(Boolean);
  const slug = segments[segments.length - 1]?.toLowerCase() ?? "";
  return NOINDEX_SLUG_FRAGMENTS.some((fragment) => slug.includes(fragment));
}

export function guideShopLinkLocale(href: string): "sv" | "en" | null {
  const path = normalizeGuidePath(href);
  if (
    path === "/vin" ||
    path.startsWith("/vin/") ||
    path === "/producenter" ||
    path.startsWith("/producenter/")
  ) {
    return "sv";
  }
  if (
    path === "/wine" ||
    path.startsWith("/wine/") ||
    path === "/producers" ||
    path.startsWith("/producers/")
  ) {
    return "en";
  }
  return null;
}
