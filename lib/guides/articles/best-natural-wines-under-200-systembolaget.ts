import type { GuideArticleContent } from "@/lib/guides/guide-types";

/**
 * Systembolaget budget shortlist (< 200 kr).
 * Wine rows render from systembolaget_curated (category: "budget").
 * Title keeps "under 200" (URL-aligned); body prices stay in kronor.
 */
export const bestNaturalWinesUnder200SystembolagetArticle: GuideArticleContent =
  {
    slug: {
      en: "best-natural-wines-under-200-systembolaget",
      sv: "basta-naturviner-under-200kr-systembolaget",
    },
    title: {
      en: "Best natural wines under 200 at Systembolaget",
      sv: "Bästa naturvinerna under 200 kr Systembolaget",
    },
    meta: {
      en: "An independent shortlist of natural wines under 200 kronor at Systembolaget — Burgenland to Swartland.",
      sv: "En oberoende shortlist av naturvin under 200 kronor på Systembolaget — Burgenland till Swartland.",
    },
    h1: {
      en: "Best natural wines under 200 at Systembolaget 2026",
      sv: "Bästa naturvinerna under 200 kr på Systembolaget 2026",
    },
    lede: {
      en: "Natural wine and a low price are not opposites. The five wines below all come from producers with real credibility in the natural wine movement, all under 200 kronor.",
      sv: "Naturvin och lågt pris är inte motsatser. De fem vinerna nedan kommer alla från producenter med verklig trovärdighet i naturvinsrörelsen, samtliga under 200 kronor.",
    },
    breadcrumbShort: {
      en: "Natural wines under 200 at Systembolaget",
      sv: "Naturvin under 200 kr på Systembolaget",
    },
    furtherReadingHeading: {
      en: "Further reading",
      sv: "Vidare läsning",
    },
    hubCard: {
      title: {
        en: "Best natural wines under 200 at Systembolaget 2026",
        sv: "Bästa naturvinerna under 200 kr på Systembolaget 2026",
      },
      description: {
        en: "An independent shortlist of natural wines under 200 kronor at Systembolaget — Burgenland to Swartland.",
        sv: "En oberoende shortlist av naturvin under 200 kronor på Systembolaget — Burgenland till Swartland.",
      },
    },
    sections: [
      {
        heading: {
          en: "Why Austria dominates",
          sv: "Varför Österrike dominerar",
        },
        body: {
          en: [
            "Four of the five wines on the list come from Austria. That is not a selection error — it reflects where Systembolaget's natural wine assortment actually has depth under 200 kronor. The country's Demeter movement (Heinrich, Meinklang, Preisinger, Jurtschitsch) has built a low-price segment with the same method as their more expensive bottles, while equivalent producers in France, Italy and Spain rarely appear at Systembolaget under that price threshold.",
          ],
          sv: [
            "Fyra av fem viner på listan kommer från Österrike. Det är inget urvalsfel — det speglar var Systembolagets naturvinssortiment faktiskt har djup under 200 kronor. Landets Demeter-rörelse (Heinrich, Meinklang, Preisinger, Jurtschitsch) har byggt lågprissegment med samma metod som deras dyrare flaskor, medan motsvarande producenter i Frankrike, Italien och Spanien sällan syns hos Systembolaget under den prisgränsen.",
          ],
        },
      },
    ],
    internalLinks: [
      {
        label: {
          en: "Best red natural wines at Systembolaget 2026 →",
          sv: "Bästa röda naturviner på Systembolaget 2026 →",
        },
        href: {
          en: "/guides/best-red-natural-wines-systembolaget",
          sv: "/guider/basta-roda-naturviner-systembolaget",
        },
      },
      {
        label: {
          en: "Best orange natural wines at Systembolaget 2026 →",
          sv: "Bästa orange naturviner på Systembolaget 2026 →",
        },
        href: {
          en: "/guides/best-orange-natural-wines-systembolaget",
          sv: "/guider/basta-orange-naturviner-systembolaget",
        },
      },
      {
        label: {
          en: "What is natural wine? The complete guide →",
          sv: "Vad är naturvin? Den kompletta guiden →",
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
