import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { GuideRankEntry } from "@/components/guides/guide-rank-entry";
import { Footer } from "@/components/layout/footer";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import {
  entryDescription,
  guideCopy,
} from "@/lib/guides/guide-copy";
import { countryLabel, wineTypeLabel } from "@/lib/guides/guide-labels";
import {
  guideHreflang,
  guidePath,
} from "@/lib/guides/guide-routes";
import { filterLanguedocRoussillonEntries } from "@/lib/guides/languedoc-region";
import {
  TOP_100_WINES,
  TOP_100_WINES_PUBLISHED_AT,
  TOP_100_WINES_UPDATED_AT,
} from "@/lib/guides/top-100-wines";
import {
  beginnerPickCopy,
  resolveAvailableBeginnerPicks,
  type BeginnerPickResolved,
} from "@/lib/guides/worlds-best-beginner-picks";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getGuideSeoOwnership } from "@/lib/guides/guide-seo-ownership";
import {
  SYSTEMBOLAGET_BEST_UPLINK,
  SYSTEMBOLAGET_RANKED_LISTS,
} from "@/lib/guides/systembolaget-list-links";
import { systembolagetProductUrl } from "@/lib/systembolaget/guide-wines";

function linkLanguedocMentions(
  text: string,
  locale: AppLocale,
): ReactNode {
  const href =
    locale === "sv"
      ? "/guider/naturvin-languedoc"
      : "/guides/languedoc-natural-wine";
  const parts = text.split("Languedoc");
  if (parts.length === 1) return text;
  return parts.flatMap((part, index) => {
    if (index === parts.length - 1) return [part];
    return [
      part,
      <Link
        key={`languedoc-${index}`}
        href={href}
        className="underline underline-offset-4 hover:text-foreground"
      >
        Languedoc
      </Link>,
    ];
  });
}

export async function buildWinesGuideMetadata(
  locale: AppLocale,
): Promise<Metadata> {
  const { config, seoBaseUrl } = await getGuideSeoOwnership();
  const copy = guideCopy(locale);
  const pageUrl = `${seoBaseUrl}${guidePath("wines", locale)}`;
  const title = categoryPageTitle(copy.wines.metaTitle, config.siteName);

  return {
    title,
    description: copy.wines.metaDescription,
    alternates: {
      canonical: pageUrl,
      languages: guideHreflang("wines", seoBaseUrl),
    },
    openGraph: {
      title,
      description: copy.wines.metaDescription,
      url: pageUrl,
      type: "article",
      images: defaultOpenGraphImages({ siteName: config.siteName }),
    },
    twitter: pageTwitterCard(title, copy.wines.metaDescription),
  };
}

export async function renderWinesGuidePage(locale: AppLocale) {
  const { seoBaseUrl } = await getGuideSeoOwnership();
  const copy = guideCopy(locale);
  const beginner = beginnerPickCopy(locale);
  const hubPath = guidePath("hub", locale);
  const producersPath = guidePath("producers", locale);
  const pageUrl = `${seoBaseUrl}${guidePath("wines", locale)}`;
  const shopNatural =
    locale === "sv" ? "/vin" : "/wine";
  const bestList = SYSTEMBOLAGET_RANKED_LISTS.find(
    (list) => list.category === "best",
  );
  const languedocShop = locale === "sv" ? "/vin" : "/wine";

  // Same BEGINNER_PICKS + resolver for both /guides/... and /guider/... pages.
  // Never drop the section on a locale just because the product lookup failed;
  // resolveAvailableBeginnerPicks falls back to editorial copy without prices.
  const beginnerResolved = await resolveAvailableBeginnerPicks();
  const beginnerPicks: BeginnerPickResolved[] = beginnerResolved.available;

  const top10 = TOP_100_WINES.filter((w) => w.rank <= 10);
  const mid = TOP_100_WINES.filter((w) => w.rank >= 11 && w.rank <= 30);
  const rest = TOP_100_WINES.filter((w) => w.rank >= 31);
  const languedoc = filterLanguedocRoussillonEntries(TOP_100_WINES);

  const wineMetaLine = (entry: (typeof TOP_100_WINES)[number]) =>
    `${entry.producer} · ${entry.region} · ${countryLabel(entry.country, locale)} · ${wineTypeLabel(entry.type, locale)} · ${entry.grapes}`;

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: seoBaseUrl },
    { name: copy.hubTitle, item: `${seoBaseUrl}${hubPath}` },
    { name: copy.wines.breadcrumbShort },
  ]);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: copy.wines.h1,
    name: copy.wines.h1,
    description: copy.wines.metaDescription,
    url: pageUrl,
    inLanguage: locale === "sv" ? "sv-SE" : "en-GB",
    datePublished: TOP_100_WINES_PUBLISHED_AT,
    dateModified: TOP_100_WINES_UPDATED_AT,
    isPartOf: {
      "@type": "WebSite",
      name: "PACT",
      url: seoBaseUrl,
    },
    about: {
      "@type": "Thing",
      name: locale === "sv" ? "Naturvin" : "Natural wine",
    },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.wines.h1,
    description: copy.wines.metaDescription,
    numberOfItems: 100,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: TOP_100_WINES.map((wine) => ({
      "@type": "ListItem",
      position: wine.rank,
      name: wine.wine,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd),
        }}
      />

      <div className="mx-auto max-w-3xl px-6 pt-top-spacing pb-16">
        <GuideBreadcrumbs
          crumbs={[
            { label: copy.home, href: "/" },
            { label: copy.hubTitle, href: hubPath },
            { label: copy.wines.breadcrumbShort },
          ]}
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          {copy.wines.h1}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {copy.wines.updatedLine}
        </p>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
          {copy.wines.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>
              {linkLanguedocMentions(paragraph, locale)}
            </p>
          ))}
        </div>

        <aside className="mt-10 border border-border bg-muted/30 px-5 py-5">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {copy.wines.top10GlanceHeading}
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            {top10.map((wine) => (
              <li key={wine.rank}>
                <Link
                  href={`#wine-rank-${wine.rank}`}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  <span className="font-medium text-foreground">{`${wine.wine}, ${wine.producer}`}</span>
                </Link>
              </li>
            ))}
          </ol>
        </aside>

        {beginnerPicks.length > 0 ? (
          <section className="mt-14">
            <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
              {beginner.heading}
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {beginner.intro}
            </p>
            <ol className="mt-8 list-decimal space-y-6 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              {beginnerPicks.map((pick) => {
                const origin = pick.origin[locale];
                const body = pick.body[locale];
                const price =
                  locale === "sv" &&
                  pick.product &&
                  typeof pick.product.price === "number" &&
                  !Number.isNaN(pick.product.price)
                    ? `${Math.round(pick.product.price)} kr`
                    : null;
                const productUrl = systembolagetProductUrl(pick.productNumber);

                return (
                  <li key={pick.productNumber} className="pl-1">
                    <p>
                      <span className="font-semibold text-foreground">
                        {pick.name}
                      </span>{" "}
                      ({origin}). {body}
                      {price ? (
                        <>
                          {" "}
                          <Link
                            href={productUrl}
                            className="font-medium tabular-nums text-foreground underline underline-offset-4 hover:text-foreground"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {price}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ol>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground md:text-base">
              {beginner.moreBefore}
              <Link
                href={beginner.moreHref}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {beginner.moreLink}
              </Link>
              {beginner.moreAfter}
            </p>
          </section>
        ) : null}

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.top10}
          </h2>
          <div>
            {top10.map((wine) => (
              <GuideRankEntry
                key={wine.rank}
                id={`wine-rank-${wine.rank}`}
                rank={wine.rank}
                title={wine.wine}
                meta={wineMetaLine(wine)}
                description={entryDescription(wine, locale)}
              />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.mid}
          </h2>
          <div>
            {mid.map((wine) => (
              <GuideRankEntry
                key={wine.rank}
                id={`wine-rank-${wine.rank}`}
                rank={wine.rank}
                title={wine.wine}
                meta={wineMetaLine(wine)}
                description={entryDescription(wine, locale)}
                compact
              />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.rest}
          </h2>
          <div>
            {rest.map((wine) => (
              <GuideRankEntry
                key={wine.rank}
                id={`wine-rank-${wine.rank}`}
                rank={wine.rank}
                title={wine.wine}
                meta={wineMetaLine(wine)}
                description={entryDescription(wine, locale)}
                compact
              />
            ))}
          </div>
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.languedocHeading}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {linkLanguedocMentions(copy.wines.languedocBody, locale)}{" "}
            <Link
              href={languedocShop}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {copy.wines.languedocShopLabel}
            </Link>
            .
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {languedoc.map((wine) => (
              <li key={wine.rank}>
                <span className="font-medium tabular-nums text-foreground">
                  #{wine.rank}
                </span>{" "}
                {wine.wine}
                <span className="text-muted-foreground/80">
                  {", "}
                  {wine.producer}, {wine.region}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <nav className="mt-14 space-y-3 border-t border-border pt-8 text-sm">
          <p>
            <Link
              href={producersPath}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {copy.wines.crossLinkProducers}
            </Link>
          </p>
          {bestList ? (
            <p>
              <Link
                href={bestList.href[locale]}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {SYSTEMBOLAGET_BEST_UPLINK.anchor[locale]} →
              </Link>
            </p>
          ) : null}
          <p>
            <Link
              href={shopNatural}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {copy.shopNaturalWine}
            </Link>
          </p>
        </nav>
      </div>

      <Footer />
    </>
  );
}
