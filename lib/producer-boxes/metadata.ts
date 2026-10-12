import type { Metadata } from "next";
import type { AppLocale } from "@/lib/i18n/locale";
import { PACT_CONFIG } from "@/lib/site-config";
import {
  PRODUCER_BOXES_COPY,
  PRODUCER_BOXES_PATH,
  PRODUCER_BOXES_PUBLISHED,
  producerBoxesCanonical,
} from "@/lib/producer-boxes/config";
import type { ResolvedProducerBox } from "@/lib/producer-boxes/match";

export function buildProducerBoxesMetadata(locale: AppLocale): Metadata {
  const copy = PRODUCER_BOXES_COPY[locale];
  const canonical = producerBoxesCanonical(locale);
  const robots = PRODUCER_BOXES_PUBLISHED
    ? { index: true, follow: true }
    : { index: false, follow: false };

  return {
    title: copy.title,
    description: copy.meta,
    robots,
    alternates: {
      canonical,
      languages: {
        sv: `${PACT_CONFIG.baseUrl}${PRODUCER_BOXES_PATH.sv}`,
        en: `${PACT_CONFIG.baseUrl}${PRODUCER_BOXES_PATH.en}`,
        "x-default": `${PACT_CONFIG.baseUrl}${PRODUCER_BOXES_PATH.sv}`,
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.meta,
      url: canonical,
      type: "website",
    },
  };
}

export function buildProducerBoxesJsonLd(
  locale: AppLocale,
  boxes: readonly ResolvedProducerBox[],
): { breadcrumb: Record<string, unknown>; collection: Record<string, unknown> } {
  const copy = PRODUCER_BOXES_COPY[locale];
  const pageUrl = producerBoxesCanonical(locale);
  const shopUrl = `${PACT_CONFIG.baseUrl}${locale === "sv" ? "/vin" : "/wine"}`;
  const shopName = locale === "sv" ? "Alla viner" : "All wines";

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: shopName,
        item: shopUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: copy.breadcrumb,
        item: pageUrl,
      },
    ],
  };

  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.h1,
    description: copy.meta,
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      name: copy.h1,
      numberOfItems: boxes.length,
      itemListElement: boxes.map((box, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: box.definition.name[locale],
        url: `${pageUrl}#box-${box.definition.id}`,
      })),
    },
  };

  return { breadcrumb, collection };
}
