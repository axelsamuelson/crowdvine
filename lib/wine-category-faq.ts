import type { AppLocale } from "@/lib/i18n/locale";
import type { WineCategoryFaqItem } from "@/lib/wine-category-types";

export function categoryFaqHeading(h1: string, locale: AppLocale): string {
  if (locale === "sv") {
    return `Vanliga frågor om ${h1.toLowerCase()}`;
  }
  return `Frequently asked questions about ${h1}`;
}

export function buildFaqPageJsonLd(faq: WineCategoryFaqItem[]) {
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
