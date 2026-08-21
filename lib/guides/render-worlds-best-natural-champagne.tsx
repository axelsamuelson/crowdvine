import type { Metadata } from "next";
import Link from "next/link";

import { GuideRankEntry } from "@/components/guides/guide-rank-entry";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Footer } from "@/components/layout/footer";
import { entryDescription, guideCopy } from "@/lib/guides/guide-copy";
import { countryLabel, wineTypeLabel } from "@/lib/guides/guide-labels";
import { guidePath } from "@/lib/guides/guide-routes";
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";
import { worldsBestNaturalChampagneGuide } from "@/lib/guides/worlds-best-natural-champagne";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { getSiteConfig } from "@/lib/site-config";

const PAGE_PATH = worldsBestNaturalChampagneGuide.path;

export function getChampagneWinesFromTop100() {
  return TOP_100_WINES.filter((wine) => wine.type === "Champagne");
}

export async function buildWorldsBestNaturalChampagneMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}${PAGE_PATH}`;
  const title = categoryPageTitle(
    worldsBestNaturalChampagneGuide.metaTitle,
    config.siteName,
  );

  return {
    title,
    description: worldsBestNaturalChampagneGuide.metaDescription,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: pageUrl,
        "x-default": pageUrl,
      },
    },
    openGraph: {
      title,
      description: worldsBestNaturalChampagneGuide.metaDescription,
      url: pageUrl,
      type: "article",
      locale: "en_US",
    },
  };
}

export async function renderWorldsBestNaturalChampagnePage() {
  const config = await getSiteConfig();
  const copy = guideCopy("en");
  const hubPath = guidePath("hub", "en");
  const pageUrl = `${config.baseUrl}${PAGE_PATH}`;
  const champagnes = getChampagneWinesFromTop100();

  const wineMetaLine = (entry: (typeof TOP_100_WINES)[number]) =>
    `${entry.producer} · ${entry.region} · ${countryLabel(entry.country, "en")} · ${wineTypeLabel(entry.type, "en")} · ${entry.grapes}`;

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
        name: worldsBestNaturalChampagneGuide.breadcrumbShort,
        item: pageUrl,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: worldsBestNaturalChampagneGuide.h1,
    description: worldsBestNaturalChampagneGuide.metaDescription,
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
              <BreadcrumbPage>
                {worldsBestNaturalChampagneGuide.breadcrumbShort}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          {worldsBestNaturalChampagneGuide.h1}
        </h1>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
          {worldsBestNaturalChampagneGuide.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {worldsBestNaturalChampagneGuide.listHeading(champagnes.length)}
          </h2>
          <div>
            {champagnes.map((wine, index) => (
              <GuideRankEntry
                key={wine.rank}
                rank={index + 1}
                title={wine.wine}
                meta={wineMetaLine(wine)}
                description={entryDescription(wine, "en")}
                compact={!wine.descriptionEn}
              />
            ))}
          </div>
        </section>

        <nav className="mt-14 space-y-3 border-t border-border pt-8 text-sm">
          {worldsBestNaturalChampagneGuide.links.map((link) => (
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
      </div>

      <Footer />
    </>
  );
}
