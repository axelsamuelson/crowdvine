import type { GuideArticleContent, GuideArticleSection } from "@/lib/guides/guide-types";
import {
  formatRankBadge,
  formatSyncedAtLabel,
  freshestSyncedAt,
  getGuideWines,
  systembolagetProductUrl,
  type GuideWineCategory,
  type SystembolagetGuideWine,
} from "@/lib/systembolaget/guide-wines";

function wineDisplayName(wine: SystembolagetGuideWine): string {
  const producer = wine.producer_name?.trim() || "Unknown producer";
  const name = [wine.name_bold, wine.name_thin]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();
  return name ? `${producer} — ${name}` : producer;
}

function wineMetaLine(wine: SystembolagetGuideWine): string {
  const price =
    wine.price !== null && wine.price !== undefined
      ? `${wine.price} kr`
      : null;
  const grapes =
    wine.grapes && wine.grapes.length > 0 ? wine.grapes.join(", ") : null;
  const origin = [wine.origin_level_1, wine.country]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
  const parts = [
    price,
    wine.assortment_text,
    grapes,
    origin || null,
  ].filter((part): part is string => Boolean(part));
  return parts.join(" · ");
}

function wineSectionsFromRows(
  wines: SystembolagetGuideWine[],
): GuideArticleSection[] {
  return wines.map((wine) => {
    const heading = wineDisplayName(wine);
    const meta = wineMetaLine(wine);
    const noteEn =
      wine.editorial_note_en?.trim() ||
      wine.editorial_note_sv.trim();
    const noteSv = wine.editorial_note_sv.trim();
    const url = systembolagetProductUrl(wine.product_number);
    const badgeEn = formatRankBadge(wine, "en");
    const badgeSv = formatRankBadge(wine, "sv");

    return {
      heading: { en: heading, sv: heading },
      ...(badgeEn || badgeSv
        ? {
            headingBadge: {
              en: badgeEn ?? "",
              sv: badgeSv ?? "",
            },
          }
        : {}),
      body: {
        en: [meta, noteEn, url].filter((p) => p.trim().length > 0),
        sv: [meta, noteSv, url].filter((p) => p.trim().length > 0),
      },
    };
  });
}

/**
 * Merge live curated Systembolaget wines into a static guide article.
 * Keeps methodology / criteria / "what we don't list" as static copy.
 * Inserts wine sections immediately after the section whose English
 * heading matches `listHeadingEn`.
 */
export async function withLiveSystembolagetGuideWines(
  article: GuideArticleContent,
  options: {
    category: GuideWineCategory;
    listHeadingEn: string;
  },
): Promise<GuideArticleContent> {
  const wines = await getGuideWines(options.category, "recommended");
  const listHeadingIndex = article.sections.findIndex(
    (section) => section.heading?.en === options.listHeadingEn,
  );

  if (listHeadingIndex < 0) {
    return article;
  }

  const before = article.sections.slice(0, listHeadingIndex + 1);
  const after = article.sections.slice(listHeadingIndex + 1);

  let wineBlock: GuideArticleSection[];

  if (wines.length === 0) {
    wineBlock = [
      {
        body: {
          en: [
            "We are currently updating this list against Systembolaget's current assortment.",
          ],
          sv: [
            "Vi uppdaterar just nu listan mot Systembolagets aktuella sortiment.",
          ],
        },
      },
    ];
  } else {
    const syncedLabelEn = formatSyncedAtLabel(freshestSyncedAt(wines), "en");
    const syncedLabelSv = formatSyncedAtLabel(freshestSyncedAt(wines), "sv");
    wineBlock = [
      ...wineSectionsFromRows(wines),
      ...(syncedLabelEn && syncedLabelSv
        ? [
            {
              body: {
                en: [syncedLabelEn],
                sv: [syncedLabelSv],
              },
            } satisfies GuideArticleSection,
          ]
        : []),
    ];
  }

  return {
    ...article,
    sections: [...before, ...wineBlock, ...after],
  };
}

/** @deprecated Prefer withLiveSystembolagetGuideWines — kept for existing red pages. */
export async function withLiveRedSystembolagetWines(
  article: GuideArticleContent,
): Promise<GuideArticleContent> {
  return withLiveSystembolagetGuideWines(article, {
    category: "red",
    listHeadingEn: "The best red natural wines at Systembolaget",
  });
}
