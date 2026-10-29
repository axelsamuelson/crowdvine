import type { Metadata } from "next";
import Link from "next/link";

import { SystembolagetGuideNav } from "@/components/guides/systembolaget-guide-nav";
import { Footer } from "@/components/layout/footer";
import { newNaturalWinesSystembolagetTitle } from "@/lib/guides/articles/new-natural-wines-systembolaget";
import { ARTICLE_GUIDE_H2_CLASS } from "@/lib/guides/article-guide-shell";
import { buildArticleGuideMeta } from "@/lib/guides/guide-article-seo";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import { guideHomeAbsoluteUrl } from "@/lib/guides/guide-article-crumbs";
import { guideCopy } from "@/lib/guides/guide-copy";
import { isGuideHrefVisibleFrom } from "@/lib/guides/guide-publication";
import { getGuideSeoOwnership } from "@/lib/guides/guide-seo-ownership";
import { guidePath } from "@/lib/guides/guide-routes";
import {
  RankedWineRow,
  wineNameParts,
} from "@/lib/guides/systembolaget-ranked-list";
import {
  formatReleaseCardLabel,
  formatReleaseGroupHeading,
  formatReleaseUpdatedLabel,
  groupReleaseWines,
} from "@/lib/guides/systembolaget-release-groups";
import {
  articlePath,
  isGuideArticlePublished,
  type GuideArticleContent,
} from "@/lib/guides/guide-types";
import {
  SYSTEMBOLAGET_GUIDE_NAV_LABEL,
  systembolagetGuideNavItems,
} from "@/lib/guides/systembolaget-list-links";
import { homePathForLocale } from "@/lib/i18n/localized-routes";
import type { AppLocale } from "@/lib/i18n/locale";
import {
  freshestSyncedAt,
  getGuideWines,
  systembolagetImageUrl,
  systembolagetProductUrl,
  type SystembolagetGuideWine,
} from "@/lib/systembolaget/guide-wines";

const EMPTY_COPY = {
  sv: "Inga nya naturviner just nu. Listan uppdateras när Systembolaget släpper nya viner.",
  en: "No new natural wines right now. The list updates when Systembolaget releases new wines.",
} as const;

const SECTION_HEADING = {
  upcoming: { sv: "Kommande släpp", en: "Coming soon" },
  released: { sv: "Nyss släppta", en: "Just released" },
} as const;

function wineListName(wine: SystembolagetGuideWine): string {
  const { producer, secondary } = wineNameParts(wine);
  return secondary ? `${producer} ${secondary}` : producer;
}

function withReleaseTitle(
  content: GuideArticleContent,
  now: Date,
): GuideArticleContent {
  return {
    ...content,
    title: newNaturalWinesSystembolagetTitle(now),
  };
}

export async function buildSystembolagetReleasesMetadata(
  content: GuideArticleContent,
  locale: AppLocale,
): Promise<Metadata> {
  const { config, seoBaseUrl } = await getGuideSeoOwnership();
  const unpublished = !isGuideArticlePublished(content);
  return buildArticleGuideMeta(
    withReleaseTitle(content, new Date()),
    locale,
    seoBaseUrl,
    config.siteName,
    {
      xDefault: "en",
      noindex: unpublished,
      nofollow: unpublished,
    },
  );
}

function limitedQuantityLabel(
  wine: SystembolagetGuideWine,
  locale: AppLocale,
): string | null {
  if (wine.availability_state !== "limited") return null;
  return locale === "sv" ? "Begränsad mängd" : "Limited quantity";
}

export async function renderSystembolagetReleasesPage(
  content: GuideArticleContent,
  locale: AppLocale,
) {
  const wines = await getGuideWines("new", "recommended");
  const calendar = groupReleaseWines(wines, new Date());
  const shown = [
    ...calendar.upcoming.flatMap((group) => group.wines),
    ...calendar.released.flatMap((group) => group.wines),
  ];
  const { seoBaseUrl } = await getGuideSeoOwnership();
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const pagePath = articlePath(content, locale);
  const pageUrl = `${seoBaseUrl}${pagePath}`;
  const intro = content.lede?.[locale] ?? content.hubCard.description[locale];
  const syncedAt = freshestSyncedAt(shown);
  const updatedLabel = formatReleaseUpdatedLabel(syncedAt, locale);
  const bothEmpty =
    calendar.upcoming.length === 0 && calendar.released.length === 0;

  const about =
    content.jsonLdAbout.type === "Person"
      ? {
          "@type": "Person" as const,
          name: content.jsonLdAbout.name,
          ...(content.jsonLdAbout.jobTitle
            ? { jobTitle: content.jsonLdAbout.jobTitle }
            : {}),
        }
      : content.jsonLdAbout.type === "Place"
        ? {
            "@type": "Place" as const,
            name: content.jsonLdAbout.name,
          }
        : {
            "@type": "Thing" as const,
            name: content.jsonLdAbout.name,
          };

  const dateModified = syncedAt && syncedAt > (content.updated ?? "")
    ? syncedAt
    : content.updated ?? syncedAt;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: content.h1[locale],
    description: content.meta[locale],
    inLanguage: locale === "sv" ? "sv-SE" : "en",
    mainEntityOfPage: pageUrl,
    url: pageUrl,
    author: { "@type": "Organization", name: "PACT", url: seoBaseUrl },
    publisher: { "@type": "Organization", name: "PACT", url: seoBaseUrl },
    about,
    ...(dateModified ? { dateModified } : {}),
  };

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: guideHomeAbsoluteUrl(seoBaseUrl, locale) },
    { name: copy.hubTitle, item: `${seoBaseUrl}${hubPath}` },
    { name: content.breadcrumbShort[locale] },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: content.h1[locale],
    url: pageUrl,
    numberOfItems: shown.length,
    itemListElement: shown.map((wine, index) => {
      const image = systembolagetImageUrl(wine.image_url, 200);
      return {
        "@type": "ListItem",
        position: index + 1,
        name: wineListName(wine),
        url: systembolagetProductUrl(wine.product_number),
        ...(image ? { image } : {}),
      };
    }),
  };

  const faqs = content.faqs ?? [];
  const faqJsonLd =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          name: content.h1[locale],
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question[locale],
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer[locale],
            },
          })),
        }
      : null;

  const sections = (
    [
      ["upcoming", calendar.upcoming],
      ["released", calendar.released],
    ] as const
  ).filter(([, groups]) => groups.length > 0);

  let cardIndex = 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <div className="mx-auto max-w-3xl px-6 pt-top-spacing pb-16">
        <GuideBreadcrumbs
          crumbs={[
            { label: copy.home, href: homePathForLocale(locale) },
            { label: copy.hubTitle, href: hubPath },
            { label: content.breadcrumbShort[locale] },
          ]}
        />

        <div className="max-w-[68ch]">
          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
            {content.h1[locale]}
          </h1>
          <SystembolagetGuideNav
            label={SYSTEMBOLAGET_GUIDE_NAV_LABEL[locale]}
            items={systembolagetGuideNavItems(locale)}
            active="new"
          />
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {intro}
          </p>

          {bothEmpty ? (
            <p className="mt-10 text-[17px] leading-[1.75] text-foreground/80">
              {EMPTY_COPY[locale]}
            </p>
          ) : (
            <div className="mt-10 space-y-12">
              {sections.map(([kind, groups]) => (
                <section key={kind} aria-labelledby={`releases-${kind}`}>
                  <h2 id={`releases-${kind}`} className={ARTICLE_GUIDE_H2_CLASS}>
                    {SECTION_HEADING[kind][locale]}
                  </h2>
                  <div className="mt-6 space-y-8">
                    {groups.map((group) => (
                      <div key={group.dateKey}>
                        <h3 className="text-base font-semibold tracking-tight text-foreground">
                          {formatReleaseGroupHeading(group.dateKey, locale)}
                        </h3>
                        <ol className="list-none p-0">
                          {group.wines.map((wine) => {
                            const priority = cardIndex < 3;
                            cardIndex += 1;
                            return (
                              <li key={wine.id}>
                                <RankedWineRow
                                  wine={wine}
                                  rank={0}
                                  locale={locale}
                                  priority={priority}
                                  showRank={false}
                                  launchLabel={formatReleaseCardLabel(
                                    group.dateKey,
                                    locale,
                                    kind,
                                  )}
                                  limitedLabelText={limitedQuantityLabel(
                                    wine,
                                    locale,
                                  )}
                                />
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {updatedLabel ? (
            <p className="mt-6 text-sm text-muted-foreground">{updatedLabel}</p>
          ) : null}

          {faqs.length > 0 ? (
            <section className="mt-14 border-t border-border pt-14">
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>
                {locale === "sv" ? "Vanliga frågor" : "Frequently asked questions"}
              </h2>
              <div className="mt-6 space-y-8">
                {faqs.map((faq) => (
                  <div key={faq.question[locale]}>
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      {faq.question[locale]}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">
                      {faq.answer[locale]}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {content.furtherReadingHeading ? (
          <nav className="mt-16 space-y-3 border-t border-border pt-8 text-sm">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {content.furtherReadingHeading[locale]}
            </h2>
            {content.internalLinks
              .filter(
                (link) =>
                  link.label[locale].trim().length > 0 &&
                  isGuideHrefVisibleFrom(content, link.href[locale]),
              )
              .map((link) => (
                <p key={`${link.href[locale]}-${link.label[locale]}`}>
                  <Link
                    href={link.href[locale]}
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {link.label[locale]}
                  </Link>
                </p>
              ))}
          </nav>
        ) : null}
      </div>

      <Footer />
    </>
  );
}
