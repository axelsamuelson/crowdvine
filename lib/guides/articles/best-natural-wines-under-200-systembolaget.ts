import type { GuideArticleContent } from "@/lib/guides/guide-types";

/**
 * Systembolaget budget shortlist (< 200 kr).
 * Wine rows render from systembolaget_curated (category: "budget").
 *
 * EN translation: pending — Swedish copy is used in `en` fields as interim
 * so the bilingual GuideArticleContent type and hreflang wiring stay valid.
 * Do not treat EN strings as a finished translation.
 */
export const bestNaturalWinesUnder200SystembolagetArticle: GuideArticleContent =
  {
    slug: {
      en: "best-natural-wines-under-200-systembolaget",
      sv: "basta-naturviner-under-200kr-systembolaget",
    },
    title: {
      en: "Bästa naturvinerna under 200 kr på Systembolaget 2026 | PACT Wines",
      sv: "Bästa naturvinerna under 200 kr på Systembolaget 2026 | PACT Wines",
    },
    meta: {
      en: "En oberoende shortlist av naturvin under 200 kronor på Systembolaget — Burgenland till Swartland.",
      sv: "En oberoende shortlist av naturvin under 200 kronor på Systembolaget — Burgenland till Swartland.",
    },
    h1: {
      en: "Bästa naturvinerna under 200 kr på Systembolaget 2026",
      sv: "Bästa naturvinerna under 200 kr på Systembolaget 2026",
    },
    lede: {
      en: "Naturvin och lågt pris är inte motsatser. De fem vinerna nedan kommer alla från producenter med verklig trovärdighet i naturvinsrörelsen, samtliga under 200 kronor.",
      sv: "Naturvin och lågt pris är inte motsatser. De fem vinerna nedan kommer alla från producenter med verklig trovärdighet i naturvinsrörelsen, samtliga under 200 kronor.",
    },
    breadcrumbShort: {
      en: "Naturvin under 200 kr på Systembolaget",
      sv: "Naturvin under 200 kr på Systembolaget",
    },
    furtherReadingHeading: {
      en: "Vidare läsning",
      sv: "Vidare läsning",
    },
    hubCard: {
      title: {
        en: "Bästa naturvinerna under 200 kr på Systembolaget 2026",
        sv: "Bästa naturvinerna under 200 kr på Systembolaget 2026",
      },
      description: {
        en: "En oberoende shortlist av naturvin under 200 kronor på Systembolaget — Burgenland till Swartland.",
        sv: "En oberoende shortlist av naturvin under 200 kronor på Systembolaget — Burgenland till Swartland.",
      },
    },
    sections: [
      {
        heading: {
          en: "Varför Österrike dominerar",
          sv: "Varför Österrike dominerar",
        },
        body: {
          en: [
            "Fyra av fem viner på listan kommer från Österrike. Det är inget urvalsfel — det speglar var Systembolagets naturvinssortiment faktiskt har djup under 200 kronor. Landets Demeter-rörelse (Heinrich, Meinklang, Preisinger, Jurtschitsch) har byggt lågprissegment med samma metod som deras dyrare flaskor, medan motsvarande producenter i Frankrike, Italien och Spanien sällan syns hos Systembolaget under den prisgränsen.",
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
          en: "Bästa röda naturviner på Systembolaget 2026 →",
          sv: "Bästa röda naturviner på Systembolaget 2026 →",
        },
        href: {
          en: "/guides/best-red-natural-wines-systembolaget",
          sv: "/guider/basta-roda-naturviner-systembolaget",
        },
      },
      {
        label: {
          en: "Bästa orange naturviner på Systembolaget 2026 →",
          sv: "Bästa orange naturviner på Systembolaget 2026 →",
        },
        href: {
          en: "/guides/best-orange-natural-wines-systembolaget",
          sv: "/guider/basta-orange-naturviner-systembolaget",
        },
      },
      {
        label: {
          en: "Vad är naturvin? Den kompletta guiden →",
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
