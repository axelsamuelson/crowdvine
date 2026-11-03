/**
 * Factual FAQ for wine region landing pages — built from catalog facts
 * and region config. No purchase CTAs, rankings, Systembolaget, or EN delivery.
 */

import type { AppLocale } from "@/lib/i18n/locale";
import type { WineRegion } from "@/lib/wine-regions";
import { wineRegionEnWithArticle } from "@/lib/wine-regions";

export type WineRegionFaqItem = {
  question: string;
  answer: string;
};

export type WineRegionFaqFacts = {
  wineCount: number;
  producerCount: number;
  producerNames: string[];
  grapeLabels: string[];
  styleLabels: string[];
};

function joinList(items: string[], locale: AppLocale): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  const head = items.slice(0, -1).join(", ");
  const tail = items[items.length - 1]!;
  return locale === "sv" ? `${head} och ${tail}` : `${head} and ${tail}`;
}

function regionPhrase(region: WineRegion, locale: AppLocale): string {
  if (locale === "sv") return region.labelSv;
  return wineRegionEnWithArticle(region);
}

/**
 * Build 3–4 factual Q&As from catalog data + region label.
 * Customer-facing wording only (no internal “live” jargon).
 */
export function buildWineRegionFaq(
  region: WineRegion,
  locale: AppLocale,
  facts: WineRegionFaqFacts,
): WineRegionFaqItem[] {
  const label = regionPhrase(region, locale);
  const items: WineRegionFaqItem[] = [];

  if (locale === "sv") {
    items.push({
      question: `Hur många naturviner från ${region.labelSv} finns hos PACT?`,
      answer: `Just nu finns ${facts.wineCount} ${
        facts.wineCount === 1 ? "vin" : "viner"
      } från ${facts.producerCount} ${
        facts.producerCount === 1 ? "producent" : "producenter"
      } hos PACT.`,
    });
    items.push({
      question: `Vilka producenter från ${region.labelSv} finns i urvalet?`,
      answer:
        facts.producerCount === 0
          ? `Inga producenter från ${region.labelSv} just nu.`
          : facts.producerNames.length <= 8
            ? `${facts.producerCount} ${
                facts.producerCount === 1 ? "producent" : "producenter"
              }: ${joinList(facts.producerNames, "sv")}.`
            : `${facts.producerCount} producenter, bland andra ${joinList(
                facts.producerNames.slice(0, 6),
                "sv",
              )}.`,
    });
    if (facts.grapeLabels.length > 0) {
      items.push({
        question: `Vilka druvor syns i naturvin från ${region.labelSv}?`,
        answer: `I urvalet syns bland annat ${joinList(
          facts.grapeLabels.slice(0, 8),
          "sv",
        )}.`,
      });
    }
    if (facts.styleLabels.length > 0) {
      items.push({
        question: `Vilka stilar finns från ${region.labelSv}?`,
        answer: `Stilarna i urvalet är ${joinList(facts.styleLabels, "sv")}.`,
      });
    }
  } else {
    items.push({
      question: `How many natural wines from ${label} are at PACT?`,
      answer: `PACT currently has ${facts.wineCount} ${
        facts.wineCount === 1 ? "wine" : "wines"
      } from ${facts.producerCount} ${
        facts.producerCount === 1 ? "producer" : "producers"
      }.`,
    });
    items.push({
      question: `Which producers from ${label} are in the selection?`,
      answer:
        facts.producerCount === 0
          ? `There are no producers from ${label} right now.`
          : facts.producerNames.length <= 8
            ? `${facts.producerCount} ${
                facts.producerCount === 1 ? "producer" : "producers"
              }: ${joinList(facts.producerNames, "en")}.`
            : `${facts.producerCount} producers, including ${joinList(
                facts.producerNames.slice(0, 6),
                "en",
              )}.`,
    });
    if (facts.grapeLabels.length > 0) {
      items.push({
        question: `Which grapes appear in natural wine from ${label}?`,
        answer: `In the selection you will see grapes such as ${joinList(
          facts.grapeLabels.slice(0, 8),
          "en",
        )}.`,
      });
    }
    if (facts.styleLabels.length > 0) {
      items.push({
        question: `Which styles are available from ${label}?`,
        answer: `The styles in the selection are ${joinList(
          facts.styleLabels,
          "en",
        )}.`,
      });
    }
  }

  return items.slice(0, 4);
}

export function buildWineRegionFaqPageJsonLd(faq: WineRegionFaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
