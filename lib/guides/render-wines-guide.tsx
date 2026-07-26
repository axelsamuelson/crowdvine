import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { GuideRankEntry } from "@/components/guides/guide-rank-entry";
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
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { getSiteConfig } from "@/lib/site-config";

function linkLanguedocMentions(text: string): ReactNode {
  const parts = text.split("Languedoc");
  if (parts.length === 1) return text;
  return parts.flatMap((part, index) => {
    if (index === parts.length - 1) return [part];
    return [
      part,
      <Link
        key={`languedoc-${index}`}
        href="/languedoc"
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
  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const pageUrl = `${config.baseUrl}${guidePath("wines", locale)}`;
  const title = categoryPageTitle(copy.wines.metaTitle, config.siteName);

  return {
    title,
    description: copy.wines.metaDescription,
    alternates: {
      canonical: pageUrl,
      languages: guideHreflang("wines", config.baseUrl),
    },
    openGraph: {
      title,
      description: copy.wines.metaDescription,
      url: pageUrl,
      type: "article",
    },
  };
}

export async function renderWinesGuidePage(locale: AppLocale) {
  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const pageUrl = `${config.baseUrl}${guidePath("wines", locale)}`;
  const hubPath = guidePath("hub", locale);
  const producersPath = guidePath("producers", locale);
  const shopNatural =
    locale === "sv" ? "/vin/naturvin" : "/wine/natural-wine";
  const languedocShop =
    locale === "sv"
      ? "/vin/naturvin-languedoc"
      : "/wine/natural-wine-languedoc";

  const top10 = TOP_100_WINES.filter((w) => w.rank <= 10);
  const mid = TOP_100_WINES.filter((w) => w.rank >= 11 && w.rank <= 30);
  const rest = TOP_100_WINES.filter((w) => w.rank >= 31);
  const languedoc = filterLanguedocRoussillonEntries(TOP_100_WINES);

  const wineMetaLine = (entry: (typeof TOP_100_WINES)[number]) =>
    `${entry.producer} · ${entry.region} · ${countryLabel(entry.country, locale)} · ${wineTypeLabel(entry.type, locale)} · ${entry.grapes}`;

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
        name: copy.wines.h1,
        item: pageUrl,
      },
    ],
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
              <BreadcrumbPage>{copy.wines.breadcrumbShort}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          {copy.wines.h1}
        </h1>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
          {copy.wines.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>
              {linkLanguedocMentions(paragraph)}
            </p>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.top10}
          </h2>
          <div>
            {top10.map((wine) => (
              <GuideRankEntry
                key={wine.rank}
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
          <GuideRankTable
            columns={[
              { key: "rank", label: copy.rank, className: "w-14 tabular-nums" },
              { key: "wine", label: copy.wine },
              { key: "producer", label: copy.producer },
              { key: "region", label: copy.region },
              { key: "country", label: copy.country },
              { key: "type", label: copy.type },
              { key: "grapes", label: copy.grapes },
            ]}
            rows={rest.map((wine) => ({
              rank: wine.rank,
              wine: wine.wine,
              producer: wine.producer,
              region: wine.region,
              country: countryLabel(wine.country, locale),
              type: wineTypeLabel(wine.type, locale),
              grapes: wine.grapes,
            }))}
          />
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.languedocHeading}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {linkLanguedocMentions(copy.wines.languedocBody)}{" "}
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
                  {" "}
                  — {wine.producer}, {wine.region}
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
