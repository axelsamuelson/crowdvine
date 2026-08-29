import type { Metadata } from "next";
import Link from "next/link";

import { GuideRankTable } from "@/components/guides/guide-rank-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Footer } from "@/components/layout/footer";
import { guideCopy } from "@/lib/guides/guide-copy";
import { countryLabel } from "@/lib/guides/guide-labels";
import { guideHreflang, guidePath } from "@/lib/guides/guide-routes";
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";
import {
  WORLDS_BEST_NATURAL_CHAMPAGNE_PATHS,
  worldsBestNaturalChampagneGuide,
} from "@/lib/guides/worlds-best-natural-champagne";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { getSiteConfig } from "@/lib/site-config";

export function getChampagneWinesFromTop100() {
  return TOP_100_WINES.filter((wine) => wine.type === "Champagne");
}

export async function buildWorldsBestNaturalChampagneMetadata(
  locale: AppLocale,
): Promise<Metadata> {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}${WORLDS_BEST_NATURAL_CHAMPAGNE_PATHS[locale]}`;
  const title = categoryPageTitle(
    worldsBestNaturalChampagneGuide.metaTitle[locale],
    config.siteName,
  );
  const description = worldsBestNaturalChampagneGuide.metaDescription[locale];

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: guideHreflang("naturalChampagne", config.baseUrl),
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "article",
      locale: locale === "sv" ? "sv_SE" : "en_US",
    },
  };
}

export async function renderWorldsBestNaturalChampagnePage(locale: AppLocale) {
  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const pagePath = WORLDS_BEST_NATURAL_CHAMPAGNE_PATHS[locale];
  const pageUrl = `${config.baseUrl}${pagePath}`;
  const champagnes = getChampagneWinesFromTop100();
  const guide = worldsBestNaturalChampagneGuide;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: copy.home,
        item: config.baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: copy.hubTitle,
        item: `${config.baseUrl}${hubPath}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: guide.breadcrumbShort[locale],
        item: pageUrl,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: guide.h1[locale],
    description: guide.metaDescription[locale],
    numberOfItems: champagnes.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: champagnes.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: wine.wine,
    })),
  };

  return (
    <>
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

      <div className="mx-auto max-w-3xl px-6 py-16">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">{copy.home}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={hubPath}>{copy.hubTitle}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{guide.breadcrumbShort[locale]}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          {guide.h1[locale]}
        </h1>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
          {guide.intro[locale].map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {guide.listHeading[locale](champagnes.length)}
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
            rows={champagnes.map((wine, index) => ({
              rank: index + 1,
              wine: wine.wine,
              producer: wine.producer,
              region: wine.region,
              country: countryLabel(wine.country, locale),
            }))}
          />
        </section>

        <nav className="mt-14 space-y-3 border-t border-border pt-8 text-sm">
          {guide.links
            .filter((link) => link.label[locale].trim().length > 0)
            .map((link) => (
              <p key={`${locale}-${link.href[locale]}`}>
                <Link
                  href={link.href[locale]}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {link.label[locale]}
                </Link>
              </p>
            ))}
        </nav>
      </div>

      <Footer />
    </>
  );
}
