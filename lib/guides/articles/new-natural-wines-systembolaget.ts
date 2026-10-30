import type { GuideArticleContent } from "@/lib/guides/guide-types";
import { releaseMonthYear } from "@/lib/guides/systembolaget-release-groups";

/** Title includes the current Stockholm month. Computed when metadata is built. */
export function newNaturalWinesSystembolagetTitle(now: Date): {
  en: string;
  sv: string;
} {
  return {
    sv: `Nya naturviner på Systembolaget: tillfälligt sortiment ${releaseMonthYear(now, "sv")}`,
    en: `New natural wines at Systembolaget: ${releaseMonthYear(now, "en")} releases`,
  };
}

/** Bilingual guide: new and upcoming natural wines at Systembolaget. */
export const newNaturalWinesSystembolagetArticle: GuideArticleContent = {
  published: true,
  updated: "2026-10-30",
  slug: {
    en: "new-natural-wines-systembolaget",
    sv: "nya-naturviner-systembolaget",
  },
  title: {
    en: "New natural wines at Systembolaget",
    sv: "Nya naturviner på Systembolaget",
  },
  meta: {
    en: "Natural wines released in Systembolaget's temporary range and web launches, with dates and our notes.",
    sv: "Naturviner som släpps i Systembolagets tillfälliga sortiment och webblanseringar just nu, med datum och vår kommentar.",
  },
  h1: {
    en: "New natural wines at Systembolaget",
    sv: "Nya naturviner på Systembolaget",
  },
  lede: {
    en: "Here we gather natural wines that have just been released, or will be released soon, in Systembolaget's temporary range and web launches — plus notable order-assortment bottles. Wines leave the temporary-range calendar 60 days after release, or when they have sold out.",
    sv: "Här samlar vi naturviner som nyss släppts eller släpps snart i Systembolagets tillfälliga sortiment och webblanseringar — plus utvalda ordervaror. Viner lämnar kalendern för tillfälligt sortiment 60 dagar efter släppet eller när de tagit slut.",
  },
  breadcrumbShort: {
    en: "New natural wines at Systembolaget",
    sv: "Nya naturviner på Systembolaget",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "New natural wines at Systembolaget",
      sv: "Nya naturviner på Systembolaget",
    },
    description: {
      en: "Natural wines released in Systembolaget's temporary range and web launches, with dates and our notes.",
      sv: "Naturviner som släpps i Systembolagets tillfälliga sortiment och webblanseringar just nu, med datum och vår kommentar.",
    },
  },
  shopCta: null,
  sections: [],
  faqs: [
    {
      question: {
        en: "What is Systembolaget's temporary range?",
        sv: "Vad är Systembolagets tillfälliga sortiment?",
      },
      answer: {
        en: "Wines sold for a limited period and in a limited quantity. When they have sold out they are normally not bought in again.",
        sv: "Viner som säljs under en begränsad period och i begränsad mängd. När de tagit slut köps de normalt inte in igen.",
      },
    },
    {
      question: {
        en: "When does Systembolaget release new wines?",
        sv: "När släpper Systembolaget nya viner?",
      },
      answer: {
        en: "Releases in the temporary range are usually on Fridays. Web launches can only be ordered through Systembolaget's website.",
        sv: "Släppen i tillfälligt sortiment sker i regel på fredagar. Webblanseringar kan bara beställas via Systembolagets webbplats.",
      },
    },
  ],
  internalLinks: [
    {
      label: {
        en: "Natural wine at Systembolaget: the best 2026 →",
        sv: "Naturvin på Systembolaget: de bästa 2026 →",
      },
      href: {
        en: "/guides/best-natural-wines-systembolaget",
        sv: "/guider/basta-naturvinerna-pa-systembolaget",
      },
    },
    {
      label: {
        en: "what is natural wine",
        sv: "vad är naturvin",
      },
      href: {
        en: "/guides/what-is-natural-wine",
        sv: "/guider/vad-ar-naturvin",
      },
    },
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Natural wine",
  },
};
