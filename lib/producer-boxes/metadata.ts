import type { Metadata } from "next";
import type { AppLocale } from "@/lib/i18n/locale";
import { PACT_CONFIG } from "@/lib/site-config";
import { producerBoxContentsLine } from "@/lib/producer-boxes/contents-line";
import {
  PRODUCER_BOXES_COPY,
  PRODUCER_BOXES_FAQ,
  PRODUCER_BOXES_PATH,
  PRODUCER_BOXES_PUBLISHED,
  producerBoxesCanonical,
  type ProducerBoxFaqItem,
} from "@/lib/producer-boxes/config";
import type { ResolvedProducerBox } from "@/lib/producer-boxes/match";

const IN_STOCK = "https://schema.org/InStock";
const OUT_OF_STOCK = "https://schema.org/OutOfStock";

function schemaPrice(cents: number): string {
  const kronor = cents / 100;
  return Number.isInteger(kronor) ? String(kronor) : kronor.toFixed(2);
}

function faqAnswerText(item: ProducerBoxFaqItem): string {
  if (!item.link) return item.answer;
  return `${item.answer} ${PACT_CONFIG.baseUrl}${item.link.href}`;
}

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
        "x-default": `${PACT_CONFIG.baseUrl}${PRODUCER_BOXES_PATH.en}`,
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
): {
  breadcrumb: Record<string, unknown>;
  collection: Record<string, unknown>;
  faq: Record<string, unknown>;
} {
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
      name: copy.boxesHeading,
      numberOfItems: boxes.length,
      itemListElement: boxes.map((box, index) => {
        const url = `${pageUrl}#box-${box.definition.id}`;
        const offer: Record<string, unknown> = {
          "@type": "Offer",
          priceCurrency: "SEK",
          availability: box.purchasable ? IN_STOCK : OUT_OF_STOCK,
          url,
        };
        if (box.totalCents != null) {
          offer.price = schemaPrice(box.totalCents);
        }
        const description = producerBoxContentsLine(box.slots, locale);
        const product: Record<string, unknown> = {
          "@type": "Product",
          name: box.definition.name[locale],
          url,
          offers: offer,
        };
        if (description) product.description = description;
        return {
          "@type": "ListItem",
          position: index + 1,
          name: box.definition.name[locale],
          url,
          item: product,
        };
      }),
    },
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PRODUCER_BOXES_FAQ[locale].map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faqAnswerText(item),
      },
    })),
  };

  return { breadcrumb, collection, faq };
}
