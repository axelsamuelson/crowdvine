import type { Metadata } from "next";
import Link from "next/link";

import { GuideRankTable } from "@/components/guides/guide-rank-table";
import {
  GuideShopLinksBlock,
  loadGuideShopLinks,
} from "@/components/guides/guide-shop-links-block";
import { Footer } from "@/components/layout/footer";
import { renderArticleRichText } from "@/lib/guides/article-guide-shell";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import { guideHomeAbsoluteUrl } from "@/lib/guides/guide-article-crumbs";
import { guideCopy } from "@/lib/guides/guide-copy";
import { buildGuideFaqPageJsonLd } from "@/lib/guides/guide-json-ld";
import { countryLabel, regionLabel } from "@/lib/guides/guide-labels";
import { resolveTopWineCatalogLinks } from "@/lib/guides/guide-catalog-links";
import { guideHreflang, guidePath } from "@/lib/guides/guide-routes";
import { homePathForLocale } from "@/lib/i18n/localized-routes";
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";
import {
  ORANGE_WINE_EN_BLURBS,
  WORLDS_BEST_ORANGE_WINES_PATHS,
  worldsBestOrangeWinesGuide,
} from "@/lib/guides/worlds-best-orange-wines";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getGuideSeoOwnership } from "@/lib/guides/guide-seo-ownership";

export function getOrangeWinesFromTop100() {
  return TOP_100_WINES.filter((wine) => wine.type === "Orange");
}

export async function buildWorldsBestOrangeWinesMetadata(
  locale: AppLocale,
): Promise<Metadata> {
  const { config, seoBaseUrl } = await getGuideSeoOwnership();
  const pageUrl = `${seoBaseUrl}${WORLDS_BEST_ORANGE_WINES_PATHS[locale]}`;
  const rawTitle = worldsBestOrangeWinesGuide.metaTitle[locale];
  const title =
    locale === "en"
      ? { absolute: rawTitle }
      : categoryPageTitle(rawTitle, config.siteName);
  const socialTitle =
    locale === "en" ? rawTitle : categoryPageTitle(rawTitle, config.siteName);
  const description = worldsBestOrangeWinesGuide.metaDescription[locale];

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: guideHreflang("orangeWines", seoBaseUrl),
    },
    openGraph: {
      title: socialTitle,
      description,
      url: pageUrl,
      type: "article",
      locale: locale === "sv" ? "sv_SE" : "en_US",
      images: defaultOpenGraphImages({ siteName: config.siteName }),
    },
    twitter: pageTwitterCard(socialTitle, description),
  };
}

export async function renderWorldsBestOrangeWinesPage(locale: AppLocale) {
  const orangeGuidePath = guidePath("orangeWines", locale);
  const [{ seoBaseUrl }, catalogLinks, guideShopLinks] = await Promise.all([
    getGuideSeoOwnership(),
    resolveTopWineCatalogLinks(locale),
    loadGuideShopLinks(orangeGuidePath, locale),
  ]);
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const orangeWines = getOrangeWinesFromTop100();
  const guide = worldsBestOrangeWinesGuide;

  const pageUrl = `${seoBaseUrl}${WORLDS_BEST_ORANGE_WINES_PATHS[locale]}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.h1[locale],
    description: guide.metaDescription[locale],
    url: pageUrl,
    inLanguage: locale === "sv" ? "sv-SE" : "en-GB",
    dateModified: guide.updated,
    isPartOf: {
      "@type": "WebSite",
      name: "PACT",
      url: seoBaseUrl,
    },
    about: {
      "@type": "Thing",
      name: locale === "sv" ? "Orange vin" : "Orange wine",
    },
  };

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: guideHomeAbsoluteUrl(seoBaseUrl, locale) },
    { name: copy.hubTitle, item: `${seoBaseUrl}${hubPath}` },
    { name: guide.breadcrumbShort[locale] },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: guide.h1[locale],
    description: guide.metaDescription[locale],
    numberOfItems: orangeWines.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: orangeWines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: wine.wine,
    })),
  };

  /** FAQ section is EN-only on this guide — no FAQPage for SV. */
  const faqJsonLd =
    locale === "en" ? buildGuideFaqPageJsonLd(guide.faqs) : null;

  const h2Class = "mb-4 border-b border-border pb-3 text-xl font-semibold";

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
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd),
          }}
        />
      ) : null}

      <div className="mx-auto max-w-3xl px-6 pt-top-spacing pb-16">
        <GuideBreadcrumbs
          crumbs={[
            { label: copy.home, href: homePathForLocale(locale) },
            { label: copy.hubTitle, href: hubPath },
            { label: guide.breadcrumbShort[locale] },
          ]}
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          {guide.h1[locale]}
        </h1>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
          {guide.intro[locale].map((paragraph, index) => (
            <p key={`intro-${index}`}>
              {renderArticleRichText(paragraph, `intro-${index}`)}
            </p>
          ))}
        </div>

        {locale === "en" ? (
          <>
            <section className="mt-14">
              <h2 className={h2Class}>{guide.howWeChose.heading}</h2>
              <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
                {guide.howWeChose.paragraphs.map((paragraph, index) => (
                  <p key={`chose-${index}`}>
                    {renderArticleRichText(paragraph, `chose-${index}`)}
                  </p>
                ))}
              </div>
            </section>

            <section className="mt-14">
              <h2 className={h2Class}>
                {guide.listHeading.en(orangeWines.length)}
              </h2>
              <div className="space-y-10">
                {orangeWines.map((wine, index) => {
                  const blurb = ORANGE_WINE_EN_BLURBS[wine.rank];
                  if (!blurb) {
                    throw new Error(
                      `Missing English orange-wine copy for rank ${wine.rank} (${wine.wine})`,
                    );
                  }
                  const links = catalogLinks[wine.rank];
                  const producerNode = links?.producer ? (
                    <Link
                      href={links.producer.href}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {wine.producer}
                    </Link>
                  ) : (
                    wine.producer
                  );
                  const wineNode = links?.wine ? (
                    <Link
                      href={links.wine.href}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {wine.wine}
                    </Link>
                  ) : (
                    wine.wine
                  );
                  return (
                    <article key={wine.rank}>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">
                        {index + 1}. {producerNode}, {wineNode}
                      </h3>
                      <p className="mt-1 text-sm italic leading-relaxed text-muted-foreground">
                        {blurb.origin}
                      </p>
                      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                        {renderArticleRichText(blurb.body, `wine-${wine.rank}`)}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-14">
              <h2 className={h2Class}>{guide.origins.heading}</h2>
              <div className="space-y-8">
                {guide.origins.sections.map((section) => (
                  <div key={section.heading}>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {section.heading}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                      {renderArticleRichText(section.body, section.heading)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-14">
              <h2 className={h2Class}>{guide.whereToStart.heading}</h2>
              <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
                {guide.whereToStart.paragraphs.map((paragraph, index) => (
                  <p key={`start-${index}`}>
                    {renderArticleRichText(paragraph, `start-${index}`)}
                  </p>
                ))}
              </div>
            </section>

            <section className="mt-14">
              <h2 className={h2Class}>{guide.faqHeading}</h2>
              <div className="space-y-8">
                {guide.faqs.map((faq) => (
                  <div key={faq.question}>
                    <h3 className="text-base font-semibold text-foreground">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                      {renderArticleRichText(faq.answer, faq.question)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <GuideShopLinksBlock
              guidePath={orangeGuidePath}
              locale={locale}
              links={guideShopLinks}
            />

            <nav className="mt-14 space-y-3 border-t border-border pt-8 text-sm">
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                {guide.furtherReadingHeading}
              </h2>
              {guide.furtherReading.map((link) => (
                <p key={link.href}>
                  <Link
                    href={link.href}
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </p>
              ))}
            </nav>
          </>
        ) : (
          <>
            <section className="mt-14">
              <h2 className={h2Class}>
                {guide.listHeading.sv(orangeWines.length)}
              </h2>
              <GuideRankTable
                columns={[
                  {
                    key: "rank",
                    label: copy.rank,
                    className: "w-14 tabular-nums",
                  },
                  { key: "wine", label: copy.wine },
                  { key: "producer", label: copy.producer },
                  { key: "region", label: copy.region },
                  { key: "country", label: copy.country },
                ]}
                rows={orangeWines.map((wine, index) => {
                  const links = catalogLinks[wine.rank];
                  return {
                    rank: index + 1,
                    wine: links?.wine ? (
                      <Link
                        href={links.wine.href}
                        className="underline underline-offset-4 hover:text-foreground"
                      >
                        {wine.wine}
                      </Link>
                    ) : (
                      wine.wine
                    ),
                    producer: links?.producer ? (
                      <Link
                        href={links.producer.href}
                        className="underline underline-offset-4 hover:text-foreground"
                      >
                        {wine.producer}
                      </Link>
                    ) : (
                      wine.producer
                    ),
                    region: regionLabel(wine.region, locale),
                    country: countryLabel(wine.country, locale),
                  };
                })}
              />
            </section>

            <GuideShopLinksBlock
              guidePath={orangeGuidePath}
              locale={locale}
              links={guideShopLinks}
            />

            <nav className="mt-14 space-y-3 border-t border-border pt-8 text-sm">
              {guide.links
                .filter((link) => link.label.sv.trim().length > 0)
                .map((link) => (
                  <p key={`sv-${link.href.sv}`}>
                    <Link
                      href={link.href.sv}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {link.label.sv}
                    </Link>
                  </p>
                ))}
            </nav>
          </>
        )}
      </div>

      <Footer />
    </>
  );
}
