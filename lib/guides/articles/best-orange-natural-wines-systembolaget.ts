import {
  ARTICLE_GUIDE_EDITORIAL_H2_CLASS,
  ARTICLE_GUIDE_WINE_H3_FIXED_CLASS,
} from "@/lib/guides/article-guide-shell";
import type { GuideArticleContent } from "@/lib/guides/guide-types";

const EMPTY = { en: [] as string[], sv: [] as string[] };

const SLUG = {
  en: "best-orange-natural-wines-systembolaget",
  sv: "basta-orange-naturviner-systembolaget",
} as const;

const AUTHOR = {
  name: "Axel Samuelson",
  jobTitle: "Grundare av PACT",
  byline: {
    en: "By Axel Samuelson, founder of PACT · Last reviewed: 2026-11-01",
    sv: "Av Axel Samuelson, grundare av PACT · Senast granskad: 2026-11-01",
  },
} as const;

/**
 * Shared slug/meta for the orange Systembolaget guide pair.
 * English URL keeps this object on the ranked-list renderer. The Swedish
 * page uses `bestOrangeNaturalWinesSystembolagetSvArticle` on the same renderer.
 */
export const bestOrangeNaturalWinesSystembolagetArticle: GuideArticleContent = {
  updated: "2026-11-01",
  slug: SLUG,
  title: {
    en: "Best orange wines at Systembolaget 2026",
    sv: "Bästa orange vin på Systembolaget – vårt urval | PACT",
  },
  meta: {
    en: "Independent guide to the best orange natural wines at Systembolaget — skin-contact bottles worth buying.",
    sv: "Bästa orange vin på Systembolaget enligt PACT: vårt urval med äkta skalkontakt, fakta om druva och producent samt vanliga frågor.",
  },
  h1: {
    en: "Best orange natural wines at Systembolaget 2026",
    sv: "Bra orange vin på Systembolaget",
  },
  lede: {
    en: "The best orange natural wines you can actually buy at Systembolaget right now. This list is independent — PACT does not sell at Systembolaget and earns nothing from what you choose.",
    sv: "Letar du efter bästa orange vin på Systembolaget? Här är vårt urval av orange viner med äkta skalkontakt – från Friuli, Alsace, Japan, Sicilien, Österrike och Georgien. Vi visar inga priser.",
  },
  breadcrumbShort: {
    en: "Best orange natural wines at Systembolaget",
    sv: "Bra orange vin på Systembolaget",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Best orange natural wines at Systembolaget 2026",
      sv: "Bra orange vin på Systembolaget",
    },
    description: {
      en: "An independent shortlist of orange natural wines at Systembolaget — Radikon, Binner, Faller and more.",
      sv: "Vårt urval av orange viner med äkta skalkontakt på Systembolaget — från Friuli till Georgien. Inga priser.",
    },
  },
  author: AUTHOR,
  shopCta: null,
  sections: [
    {
      heading: {
        en: "How we choose",
        sv: "Så har vi valt",
      },
      body: {
        en: [
          "Most Systembolaget lists of [orange wine](/wine/orange-natural-wine) are written by importers or shops that profit from what you buy. We don't — PACT imports from Languedoc and is not sold at Systembolaget. No affiliate links.",
          "A wine must have organic or biodynamic farming, spontaneous fermentation, meaningful skin contact on white grapes, minimal or no added sulphur (around 30 mg/l added), and a producer with a recognised reputation — not just a certificate. Updated against live assortment data.",
        ],
        sv: [
          "De flesta listor över [orange vin](/vin/orange-naturvin) på Systembolaget görs av importörer eller butiker som tjänar på vad du köper. Vi gör inte det — PACT säljer från Languedoc och finns inte på Systembolaget. Inga provisionslänkar.",
          "Ett vin måste ha ekologisk eller biodynamisk odling, spontanjäsning, meningsfull skalkontakt på gröna druvor, minimal eller ingen tillsatt svavel (runt 30 mg/l tillsatt) och en producent med erkänt rykte — inte bara ett certifikat. Listan filtreras mot live sortimentsdata.",
        ],
      },
    },
    {
      heading: {
        en: "What we don't list",
        sv: "Vad vi inte listar",
      },
      body: {
        en: [
          "Short macerations on industrial white-wine lines, or skin contact without the farming and cellar discipline behind it, do not belong here. Concrete examples we leave out: Nanit Orange, Iconic Wines Petite Orange, Côté Mas Orange and Santa Julia \"Orange Natural\". If the producer lacks a recognised name and a verifiable history, choose one of the wines above instead.",
        ],
        sv: [
          "Korta macerationer på industriella vitvinslinjer, eller skalkontakt utan odlings- och källardisciplin bakom, hör inte hemma här. Konkreta exempel vi lämnar utanför: Nanit Orange, Iconic Wines Petite Orange, Côté Mas Orange och Santa Julia \"Orange Natural\". Saknar producenten ett erkänt namn och verifierbar historia, välj ett av vinerna ovan istället.",
        ],
      },
    },
  ],
  faqs: [
    {
      question: {
        en: "Is everything labelled orange wine at Systembolaget natural wine?",
        sv: "Är orange vin samma sak som naturvin?",
      },
      answer: {
        en: "No. Short industrial macerations and trading-brand \"orange\" lines sit in the same filter as serious skin-contact domaines. We only list producers with a recognised reputation — and we name industrial examples we leave out.",
        sv: "Nej. Orange vin beskriver skalkontakten. Naturvin handlar om odling och minimal intervention. Många orange viner är naturviner, men långt ifrån alla.",
      },
    },
    {
      question: {
        en: "How do you choose the wines on this list?",
        sv: "Vilket är det bästa orange vinet på Systembolaget?",
      },
      answer: {
        en: "Organic or biodynamic farming, spontaneous fermentation, meaningful skin contact on white grapes, minimal or no added sulphur, and a producer with a verifiable history. Checked against live Systembolaget data. PACT does not sell at Systembolaget.",
        sv: "Det beror på stil. Radikon Ribolla är referensen för den klassiska Friuli-stilen; Luc Faller Macerat och Binner Bombisch är mer lättillgängliga.",
      },
    },
    {
      question: {
        en: "Why are many of these bottles order assortment?",
        sv: "Hur länge håller ett öppnat orange vin?",
      },
      answer: {
        en: "The most interesting natural orange wines rarely sit in every store. Order assortment and temporary listings are where domaines like Radikon and Binner usually appear — order online or via your local store.",
        sv: "Ofta längre än vitt vin tack vare skalens tanniner – i kylskåp med kork brukar det hålla några dagar.",
      },
    },
  ],
  internalLinks: [
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
    {
      label: {
        en: "What is orange wine? →",
        sv: "Vad är orange vin? →",
      },
      href: {
        en: "/guides/what-is-orange-wine",
        sv: "/guider/vad-ar-orange-vin",
      },
    },
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
        en: "The world's 100 best orange wines →",
        sv: "Världens 100 bästa orange viner →",
      },
      href: {
        en: "/guides/worlds-best-orange-wines",
        sv: "/guider/varldens-basta-orange-viner",
      },
    },
    {
      label: {
        en: "Radikon →",
        sv: "Radikon →",
      },
      href: {
        en: "/guides/radikon",
        sv: "/guider/radikon",
      },
    },
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Orange wine",
  },
};

/**
 * Swedish editorial rewrite of /guider/basta-orange-naturviner-systembolaget
 * (draft 2026-11-01). Keeps the same slug/hreflang pair as the English
 * ranked list at /guides/best-orange-natural-wines-systembolaget.
 */
export const bestOrangeNaturalWinesSystembolagetSvArticle: GuideArticleContent =
  {
    updated: "2026-11-01",
    slug: SLUG,
    title: {
      en: "Best orange wines at Systembolaget 2026",
      sv: "Bästa orange vin på Systembolaget – vårt urval | PACT",
    },
    meta: {
      en: "Independent guide to the best orange natural wines at Systembolaget — skin-contact bottles worth buying.",
      sv: "Bästa orange vin på Systembolaget enligt PACT: vårt urval med äkta skalkontakt, fakta om druva och producent samt vanliga frågor.",
    },
    h1: {
      en: "Best orange natural wines at Systembolaget 2026",
      sv: "Bästa orange vin på Systembolaget 2026",
    },
    lede: {
      en: "Looking for the best orange wine at Systembolaget? Here is our selection of skin-contact bottles — from Friuli, Alsace, Japan, Sicily, Austria and Georgia.",
      sv: "Letar du efter bästa orange vin på Systembolaget? Här är vårt urval av orange viner med äkta skalkontakt – från Friuli, Alsace, Japan, Sicilien, Österrike och Georgien. Listan är oberoende. PACT säljer inte på Systembolaget och tjänar ingenting på vad du väljer.",
    },
    breadcrumbShort: {
      en: "Best orange natural wines at Systembolaget",
      sv: "Bra orange vin på Systembolaget",
    },
    furtherReadingHeading: {
      en: "Further reading",
      sv: "Vidare läsning",
    },
    hubCard: {
      title: {
        en: "Best orange natural wines at Systembolaget 2026",
        sv: "Bra orange vin på Systembolaget",
      },
      description: {
        en: "An independent shortlist of orange wines with real skin contact at Systembolaget.",
        sv: "Vårt urval av orange viner med äkta skalkontakt på Systembolaget — från Friuli till Georgien.",
      },
    },
    author: AUTHOR,
    shopCta: null,
    showRankedWineFacts: true,
    shellHeadingClasses: {
      sectionHeadingClassName: ARTICLE_GUIDE_EDITORIAL_H2_CLASS,
      wineHeadingClassName: ARTICLE_GUIDE_WINE_H3_FIXED_CLASS,
    },
    sections: [
      {
        heading: {
          en: "Our shortlist",
          sv: "Vårt urval i korthet",
        },
        body: EMPTY,
        blocks: [
          {
            type: "list",
            items: {
              en: [
                "**Classic Friuli style:** Radikon Ribolla — the reference bottle, unfiltered.",
                "**Approachable and textured:** Luc Faller Macerat, Binner Bombisch, Arndorfer Orange.",
                "**Outside Europe and in qvevri:** Grape Republic Bianco Macerato (Japan), Qvevris MZE Kisi (Georgia).",
                "**Southern and aromatic:** Abbazia San Giorgio Orange Zibibbo (Pantelleria).",
              ],
              sv: [
                "**Klassisk Friuli-stil:** Radikon Ribolla – referensflaskan, ofiltrerad.",
                "**Lättillgängligt och texturerat:** Luc Faller Macerat, Binner Bombisch, Arndorfer Orange.",
                "**Utanför Europa och i qvevri:** Grape Republic Bianco Macerato (Japan), Qvevris MZE Kisi (Georgien).",
                "**Sydlig och aromatisk:** Abbazia San Giorgio Orange Zibibbo (Pantelleria).",
              ],
            },
          },
        ],
      },
      {
        heading: {
          en: "How we choose",
          sv: "Så har vi valt",
        },
        body: EMPTY,
        blocks: [
          {
            type: "list",
            items: {
              en: [
                "**The producer:** growers with their own story, not trading brands.",
                "**The method:** real skin contact as part of the wine's identity, not just a colour on the label.",
                "**Breadth:** different styles and regions.",
                "**Availability:** the wine must be in Systembolaget's assortment (temporary range or order assortment).",
              ],
              sv: [
                "**Producenten:** odlare med egen historia, inte handelsvarumärken.",
                "**Metoden:** äkta skalkontakt som en del av vinets identitet, inte bara en färg på etiketten.",
                "**Bredd:** olika stilar och regioner.",
                "**Tillgänglighet:** vinet ska finnas i Systembolagets sortiment (tillfälligt sortiment eller beställningsvara).",
              ],
            },
          },
          {
            type: "paragraphs",
            body: {
              en: [
                "The list is updated when the assortment changes. Not every wine here is natural wine — where we can document the producer's approach, we say so.",
              ],
              sv: [
                "Listan uppdateras när sortimentet ändras. Inte alla viner på listan är naturvin – där vi kan belägga producentens arbetssätt skriver vi det.",
              ],
            },
          },
        ],
      },
      {
        heading: {
          en: "What we don't list",
          sv: "Vad vi inte listar",
        },
        body: {
          en: [
            "Short macerations on industrial white-wine lines, or skin contact without the farming and cellar discipline behind it, do not belong here. Concrete examples we leave out: Nanit Orange, Iconic Wines Petite Orange, Côté Mas Orange and Santa Julia \"Orange Natural\". If the producer lacks a recognised name and a verifiable history, choose one of the wines above instead.",
          ],
          sv: [
            "Korta macerationer på industriella vitvinslinjer, eller skalkontakt utan odlings- och källardisciplin bakom, hör inte hemma här. Konkreta exempel vi lämnar utanför: Nanit Orange, Iconic Wines Petite Orange, Côté Mas Orange och Santa Julia \"Orange Natural\". Saknar producenten ett erkänt namn och verifierbar historia, välj ett av vinerna ovan istället.",
          ],
        },
      },
      {
        heading: {
          en: "What is orange wine?",
          sv: "Vad är orange vin?",
        },
        body: {
          en: [
            "Orange wine is white wine made like red: the skins of green grapes stay in the must during fermentation. Skin contact (maceration) gives colour from golden to amber, more texture and a light astringency. The technique is very old — in Georgia wine has been made this way in clay vessels (qvevri) for millennia. Read more in [What is orange wine?](/guides/what-is-orange-wine) and [What is natural wine?](/guides/what-is-natural-wine).",
            "Not all orange wine is natural wine. Skin contact says something about the method in the cellar, not about how the grapes were farmed or what was added.",
          ],
          sv: [
            "Orange vin är vitt vin som görs som ett rött: de gröna druvornas skal får ligga kvar i musten under jäsningen. Skalkontakten (maceration) ger färg från gyllene till bärnstensfärgad, mer textur och en lätt strävhet. Tekniken är mycket gammal – i Georgien har man gjort vin så i lerkärl (qvevri) i årtusenden. Läs mer i [Vad är orange vin?](/guider/vad-ar-orange-vin) och [Vad är naturvin?](/guider/vad-ar-naturvin).",
            "Allt orange vin är inte naturvin. Skalkontakt säger något om metoden i källaren, inte om hur druvorna odlats eller vad som tillsatts.",
          ],
        },
      },
      {
        heading: {
          en: "Orange wine and food",
          sv: "Orange vin och mat",
        },
        body: EMPTY,
        blocks: [
          {
            type: "paragraphs",
            body: {
              en: [
                "Orange wine has more structure than white wine and pairs with dishes that are otherwise hard to match:",
              ],
              sv: [
                "Orange vin har mer struktur än vitt vin och passar till rätter som annars är svåra att matcha:",
              ],
            },
          },
          {
            type: "list",
            items: {
              en: [
                "spicy Asian food, for example green curry with lemongrass",
                "seafood, ceviche and sushi",
                "aged hard cheeses such as manchego",
                "grilled vegetables, cauliflower and hummus",
              ],
              sv: [
                "kryddig asiatisk mat, till exempel grön curry med citrongräs",
                "skaldjur, ceviche och sushi",
                "lagrade hårdostar som manchego",
                "grillade grönsaker, blomkål och hummus",
              ],
            },
          },
          {
            type: "paragraphs",
            body: {
              en: [
                "Serve cool (around 12–14 °C) rather than fridge-cold, so the texture comes through.",
              ],
              sv: [
                "Servera hellre svalt (cirka 12–14 °C) än kylskåpskallt, så kommer texturen fram.",
              ],
            },
          },
        ],
      },
    ],
    faqs: [
      {
        question: {
          en: "What is the difference between orange wine and white wine?",
          sv: "Vad är skillnaden mellan orange vin och vitt vin?",
        },
        answer: {
          en: "Both are made from green grapes. In orange wine the skins stay during fermentation, which gives colour, texture and astringency.",
          sv: "Båda görs på gröna druvor. I orange vin ligger skalen kvar under jäsningen, vilket ger färg, textur och strävhet.",
        },
      },
      {
        question: {
          en: "Is orange wine the same as natural wine?",
          sv: "Är orange vin samma sak som naturvin?",
        },
        answer: {
          en: "No. Orange wine describes the skin contact. Natural wine is about farming and minimal intervention. Many orange wines are natural wines, but far from all.",
          sv: "Nej. Orange vin beskriver skalkontakten. Naturvin handlar om odling och minimal intervention. Många orange viner är naturviner, men långt ifrån alla.",
        },
      },
      {
        question: {
          en: "What is the best orange wine at Systembolaget?",
          sv: "Vilket är det bästa orange vinet på Systembolaget?",
        },
        answer: {
          en: "It depends on style. Radikon Ribolla is the reference for classic Friuli; Luc Faller Macerat and Binner Bombisch are more approachable.",
          sv: "Det beror på stil. Radikon Ribolla är referensen för den klassiska Friuli-stilen; Luc Faller Macerat och Binner Bombisch är mer lättillgängliga.",
        },
      },
      {
        question: {
          en: 'Is there an orange wine "best in test"?',
          sv: 'Finns det orange vin "bäst i test"?',
        },
        answer: {
          en: "We do not run scored tests. The list is our editorial judgement based on producer, method and breadth.",
          sv: "Vi gör inga tester med poäng. Listan är vår redaktionella bedömning utifrån producent, metod och bredd.",
        },
      },
      {
        question: {
          en: "How long does an opened orange wine keep?",
          sv: "Hur länge håller ett öppnat orange vin?",
        },
        answer: {
          en: "Often longer than white wine thanks to skin tannins — in the fridge with a cork it usually keeps a few days.",
          sv: "Ofta längre än vitt vin tack vare skalens tanniner – i kylskåp med kork brukar det hålla några dagar.",
        },
      },
      {
        question: {
          en: "Are skin-contact wine and orange wine the same thing?",
          sv: "Är skin contact-vin och orange vin samma sak?",
        },
        answer: {
          en: 'Yes. "Skin contact" is the English name for the same method: white grapes fermenting with their skins.',
          sv: 'Ja. "Skin contact" är det engelska namnet på samma metod: vita druvor som jäser med skalen.',
        },
      },
    ],
    internalLinks: [
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
      {
        label: {
          en: "What is orange wine? →",
          sv: "Vad är orange vin? →",
        },
        href: {
          en: "/guides/what-is-orange-wine",
          sv: "/guider/vad-ar-orange-vin",
        },
      },
      {
        label: {
          en: "Best orange natural wines at Systembolaget →",
          sv: "Engelsk version: Best orange natural wines at Systembolaget →",
        },
        href: {
          en: "/guides/best-orange-natural-wines-systembolaget",
          sv: "/guides/best-orange-natural-wines-systembolaget",
        },
      },
      {
        label: {
          en: "The world's best natural wine producers →",
          sv: "Världens bästa naturvinsproducenter →",
        },
        href: {
          en: "/guides/worlds-best-natural-wine-producers",
          sv: "/guider/varldens-basta-naturvinsproducenter",
        },
      },
      {
        label: {
          en: "Radikon →",
          sv: "Radikon →",
        },
        href: {
          en: "/guides/radikon",
          sv: "/guider/radikon",
        },
      },
    ],
    jsonLdAbout: {
      type: "Thing",
      name: "Orange wine",
    },
  };
