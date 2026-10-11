import type { GuideBreadcrumbJsonLdItem } from "@/lib/guides/guide-breadcrumbs";
import { GUIDE_PATHS } from "@/lib/guides/guide-routes";
import type { AppLocale } from "@/lib/i18n/locale";

export type ArticleGuideCrumb = {
  label: string;
  /** Omit on the current page. */
  href?: string;
};

/**
 * Producer guides that sit under the top-100 producers list.
 * Gang of Four stays on the three-item trail.
 */
const PRODUCER_LIST_CHILD_SLUGS = new Set([
  "pierre-overnoy",
  "thierry-allemand",
  "josko-gravner",
  "jean-francois-ganevat",
  "jacques-selosse",
  "radikon",
  "jean-foillard",
  "marcel-lapierre",
  "guy-breton",
  "jean-paul-thevenet",
]);

const STYLE_CHILD_SLUGS = new Set([
  "what-is-red-natural-wine",
  "what-is-white-natural-wine",
  "what-is-orange-wine",
]);

const PRODUCER_LIST_PARENT = {
  en: "World's best natural wine producers",
  sv: "Världens bästa naturvinsproducenter",
} as const;

const STYLE_PARENT = {
  en: "What is natural wine?",
  sv: "Vad är naturvin?",
} as const;

/**
 * Visible trail for an article guide. Home and the hub, then an optional
 * parent, then the current page with no href.
 */
export function articleGuideCrumbs(input: {
  locale: AppLocale;
  homeLabel: string;
  hubLabel: string;
  hubPath: string;
  pageLabel: string;
  /** English article slug. */
  slug: string;
}): ArticleGuideCrumb[] {
  const crumbs: ArticleGuideCrumb[] = [
    { label: input.homeLabel, href: "/" },
    { label: input.hubLabel, href: input.hubPath },
  ];

  if (PRODUCER_LIST_CHILD_SLUGS.has(input.slug)) {
    crumbs.push({
      label: PRODUCER_LIST_PARENT[input.locale],
      href: GUIDE_PATHS.producers[input.locale],
    });
  } else if (STYLE_CHILD_SLUGS.has(input.slug)) {
    crumbs.push({
      label: STYLE_PARENT[input.locale],
      href:
        input.locale === "sv"
          ? "/guider/vad-ar-naturvin"
          : "/guides/what-is-natural-wine",
    });
  }

  crumbs.push({ label: input.pageLabel });
  return crumbs;
}

/** JSON-LD items with the same names and destinations as the visible trail. */
export function articleGuideJsonLdItems(
  crumbs: ArticleGuideCrumb[],
  seoBaseUrl: string,
): GuideBreadcrumbJsonLdItem[] {
  return crumbs.map((crumb, index) => {
    const isLast = index === crumbs.length - 1;
    if (isLast || !crumb.href) {
      return { name: crumb.label };
    }
    const item =
      crumb.href === "/" ? seoBaseUrl : `${seoBaseUrl}${crumb.href}`;
    return { name: crumb.label, item };
  });
}
