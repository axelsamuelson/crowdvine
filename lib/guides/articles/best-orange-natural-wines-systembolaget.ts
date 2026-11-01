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
 * English URL keeps the live ranked-list renderer; Swedish uses the
 * editorial article below (`bestOrangeNaturalWinesSystembolagetSvArticle`).
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
      sv: "Bra orange vin på Systembolaget",
    },
    lede: {
      en: "Looking for the best orange wine at Systembolaget? Here is our selection of skin-contact bottles — from Friuli, Alsace, Japan, Sicily, Austria and Georgia. We show no prices.",
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
        en: "An independent shortlist of orange wines with real skin contact at Systembolaget.",
        sv: "Vårt urval av orange viner med äkta skalkontakt på Systembolaget — från Friuli till Georgien. Inga priser.",
      },
    },
    author: AUTHOR,
    shopCta: null,
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
                "**Classic Friuli style:** [Radikon Ribolla](#radikon-ribolla) — the reference bottle, unfiltered.",
                "**Approachable and textured:** [Luc Faller Macerat](#luc-faller-macerat), [Binner Bombisch](#binner-bombisch), [Arndorfer Orange](#arndorfer-orange).",
                "**Outside Europe and in qvevri:** [Grape Republic Bianco Macerato](#grape-republic-bianco-macerato) (Japan), [Qvevris MZE Kisi](#qvevris-mze-kisi) (Georgia).",
                "**Southern and aromatic:** [Abbazia San Giorgio Orange Zibibbo](#abbazia-san-giorgio-orange-zibibbo) (Pantelleria).",
              ],
              sv: [
                "**Klassisk Friuli-stil:** [Radikon Ribolla](#radikon-ribolla) – referensflaskan, ofiltrerad.",
                "**Lättillgängligt och texturerat:** [Luc Faller Macerat](#luc-faller-macerat), [Binner Bombisch](#binner-bombisch), [Arndorfer Orange](#arndorfer-orange).",
                "**Utanför Europa och i qvevri:** [Grape Republic Bianco Macerato](#grape-republic-bianco-macerato) (Japan), [Qvevris MZE Kisi](#qvevris-mze-kisi) (Georgien).",
                "**Sydlig och aromatisk:** [Abbazia San Giorgio Orange Zibibbo](#abbazia-san-giorgio-orange-zibibbo) (Pantelleria).",
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
          en: "The list",
          sv: "Listan",
        },
        body: EMPTY,
        blocks: [
          {
            type: "heading",
            id: "radikon-ribolla",
            text: {
              en: "1. Radikon Ribolla 2019",
              sv: "1. Radikon Ribolla 2019",
            },
          },
          {
            type: "definitions",
            items: [
              {
                term: {
                  en: "Producer and region",
                  sv: "Producent och region",
                },
                description: {
                  en: "Radikon, Friuli-Venezia-Giulia, Italy",
                  sv: "Radikon, Friuli-Venezia-Giulia, Italien",
                },
              },
              {
                term: { en: "Grape", sv: "Druva" },
                description: {
                  en: "Ribolla Gialla",
                  sv: "Ribolla Gialla",
                },
              },
              {
                term: { en: "Skin contact", sv: "Skalkontakt" },
                description: { en: "long", sv: "lång" },
              },
              {
                term: { en: "Alcohol", sv: "Alkohol" },
                description: {
                  en: "12% (50 cl)",
                  sv: "12 % (50 cl)",
                },
              },
              {
                term: { en: "Assortment", sv: "Sortiment" },
                description: {
                  en: "order assortment",
                  sv: "beställningsvara",
                },
              },
            ],
          },
          {
            type: "paragraphs",
            body: {
              en: [
                "Pure Ribolla Gialla without filtration — the reference bottle for the Friuli style. Radikon is also on our list of [the world's best natural wine producers](/guides/worlds-best-natural-wine-producers).",
              ],
              sv: [
                "Ren Ribolla Gialla utan filtrering – referensflaskan för Friuli-stilen. Radikon finns med på vår lista över [världens bästa naturvinsproducenter](/guider/varldens-basta-naturvinsproducenter).",
              ],
            },
          },
          {
            type: "list",
            label: {
              en: "More from Radikon (all order assortment, long skin contact):",
              sv: "Fler från Radikon (alla beställningsvaror, lång skalkontakt):",
            },
            items: {
              en: [
                "**Oslavje 2019** — Chardonnay, Sauvignon and Pinot Grigio, 14%. Broader and more complex than Ribolla.",
                "**Jakot 2019** — Friulano, 13.5%. The name is Tokaj backwards, a protest against the EU ban on calling the grape Tocai Friulano.",
                "**Slatnik 2022** (13%) and **Sivi Pinot Grigio 2022** (Pinot Grigio, 13.5%).",
              ],
              sv: [
                "**Oslavje 2019** – Chardonnay, Sauvignon och Pinot Grigio, 14 %. Bredare och mer komplex än Ribolla.",
                "**Jakot 2019** – Friulano, 13,5 %. Namnet är Tokaj baklänges, en protest mot EU-förbudet att kalla druvan Tocai Friulano.",
                "**Slatnik 2022** (13 %) och **Sivi Pinot Grigio 2022** (Pinot Grigio, 13,5 %).",
              ],
            },
          },
          {
            type: "heading",
            id: "luc-faller-macerat",
            text: {
              en: "2. Luc Faller Macerat Pinot Gris 2020",
              sv: "2. Luc Faller Macerat Pinot Gris 2020",
            },
          },
          {
            type: "definitions",
            items: [
              {
                term: {
                  en: "Producer and region",
                  sv: "Producent och region",
                },
                description: {
                  en: "Faller Henri et Luc, Alsace, France",
                  sv: "Faller Henri et Luc, Alsace, Frankrike",
                },
              },
              {
                term: { en: "Grape", sv: "Druva" },
                description: { en: "Pinot Gris", sv: "Pinot Gris" },
              },
              {
                term: { en: "Skin contact", sv: "Skalkontakt" },
                description: { en: "yes", sv: "ja" },
              },
              {
                term: { en: "Alcohol", sv: "Alkohol" },
                description: { en: "13.5%", sv: "13,5 %" },
              },
              {
                term: { en: "Assortment", sv: "Sortiment" },
                description: {
                  en: "order assortment (organic per Systembolaget)",
                  sv: "beställningsvara (ekologiskt enligt Systembolaget)",
                },
              },
            ],
          },
          {
            type: "paragraphs",
            body: {
              en: [
                "The producer farms biodynamically and works with minimal intervention; the wine is copper-pink, textured and one of the more approachable bottles in the assortment.",
              ],
              sv: [
                "Producenten odlar biodynamiskt och arbetar med minimal intervention; vinet är kopparrosa, texturerat och ett av de mer lättillgängliga i sortimentet.",
              ],
            },
          },
          {
            type: "heading",
            id: "binner-bombisch",
            text: {
              en: "3. Binner Bombisch 2023",
              sv: "3. Binner Bombisch 2023",
            },
          },
          {
            type: "definitions",
            items: [
              {
                term: {
                  en: "Producer and region",
                  sv: "Producent och region",
                },
                description: {
                  en: "Domaine Christian Binner, Alsace, France",
                  sv: "Domaine Christian Binner, Alsace, Frankrike",
                },
              },
              {
                term: { en: "Grape", sv: "Druva" },
                description: { en: "Riesling", sv: "Riesling" },
              },
              {
                term: { en: "Skin contact", sv: "Skalkontakt" },
                description: { en: "yes", sv: "ja" },
              },
              {
                term: { en: "Alcohol", sv: "Alkohol" },
                description: { en: "12%", sv: "12 %" },
              },
              {
                term: { en: "Assortment", sv: "Sortiment" },
                description: {
                  en: "order assortment",
                  sv: "beställningsvara",
                },
              },
            ],
          },
          {
            type: "paragraphs",
            body: {
              en: [
                "Binner is one of few producers with Vin Méthode Nature certification, and Bombisch is a direct, drinkable orange wine from Alsace.",
              ],
              sv: [
                "Binner är en av få producenter med Vin Méthode Nature-certifiering, och Bombisch är ett direkt och drickbart orange vin från Alsace.",
              ],
            },
          },
          {
            type: "heading",
            id: "grape-republic-bianco-macerato",
            text: {
              en: "4. Grape Republic Bianco Macerato 2024",
              sv: "4. Grape Republic Bianco Macerato 2024",
            },
          },
          {
            type: "definitions",
            items: [
              {
                term: {
                  en: "Producer and region",
                  sv: "Producent och region",
                },
                description: {
                  en: "Grape Republic, Yamagata, Japan",
                  sv: "Grape Republic, Yamagata, Japan",
                },
              },
              {
                term: { en: "Skin contact", sv: "Skalkontakt" },
                description: { en: "yes", sv: "ja" },
              },
              {
                term: { en: "Alcohol", sv: "Alkohol" },
                description: { en: "9%", sv: "9 %" },
              },
              {
                term: { en: "Assortment", sv: "Sortiment" },
                description: {
                  en: "temporary range",
                  sv: "tillfälligt sortiment",
                },
              },
            ],
          },
          {
            type: "paragraphs",
            body: {
              en: [
                "Grape Republic is Japan's best-known natural wine producer, and Bianco Macerato shows that skin contact works just as naturally outside Europe.",
              ],
              sv: [
                "Grape Republic är Japans mest kända naturvinsproducent, och Bianco Macerato visar att skalkontakt fungerar lika självklart utanför Europa.",
              ],
            },
          },
          {
            type: "heading",
            id: "abbazia-san-giorgio-orange-zibibbo",
            text: {
              en: "5. Abbazia San Giorgio Orange Zibibbo 2021",
              sv: "5. Abbazia San Giorgio Orange Zibibbo 2021",
            },
          },
          {
            type: "definitions",
            items: [
              {
                term: {
                  en: "Producer and region",
                  sv: "Producent och region",
                },
                description: {
                  en: "Abbazia San Giorgio, Pantelleria, Sicily, Italy",
                  sv: "Abbazia San Giorgio, Pantelleria, Sicilien, Italien",
                },
              },
              {
                term: { en: "Grape", sv: "Druva" },
                description: { en: "Zibibbo", sv: "Zibibbo" },
              },
              {
                term: { en: "Skin contact", sv: "Skalkontakt" },
                description: { en: "yes", sv: "ja" },
              },
              {
                term: { en: "Alcohol", sv: "Alkohol" },
                description: { en: "12%", sv: "12 %" },
              },
              {
                term: { en: "Assortment", sv: "Sortiment" },
                description: {
                  en: "order assortment",
                  sv: "beställningsvara",
                },
              },
            ],
          },
          {
            type: "paragraphs",
            body: {
              en: [
                "Sunny and aromatic — a southern counterweight to the Friuli style.",
              ],
              sv: [
                "Soligt och aromatiskt – en sydlig motvikt till Friuli-stilen.",
              ],
            },
          },
          {
            type: "heading",
            id: "arndorfer-orange",
            text: {
              en: "6. Arndorfer Orange",
              sv: "6. Arndorfer Orange",
            },
          },
          {
            type: "definitions",
            items: [
              {
                term: {
                  en: "Producer and region",
                  sv: "Producent och region",
                },
                description: {
                  en: "Weingut Arndorfer, Kamptal, Austria",
                  sv: "Weingut Arndorfer, Kamptal, Österrike",
                },
              },
              {
                term: { en: "Skin contact", sv: "Skalkontakt" },
                description: { en: "yes", sv: "ja" },
              },
              {
                term: { en: "Alcohol", sv: "Alkohol" },
                description: {
                  en: "12% (litre bottle)",
                  sv: "12 % (literflaska)",
                },
              },
              {
                term: { en: "Assortment", sv: "Sortiment" },
                description: {
                  en: "order assortment",
                  sv: "beställningsvara",
                },
              },
            ],
          },
          {
            type: "paragraphs",
            body: {
              en: [
                "Martin and Anna Arndorfer run a small estate in Kamptal and belong to the generation of Austrian producers who made orange wine everyday wine without industrialising it.",
              ],
              sv: [
                "Martin och Anna Arndorfer driver en liten gård i Kamptal och hör till den generation österrikiska producenter som gjort orange vin till vardagsvin utan att industrialisera det.",
              ],
            },
          },
          {
            type: "heading",
            id: "qvevris-mze-kisi",
            text: {
              en: "7. Qvevris MZE Kisi 2018",
              sv: "7. Qvevris MZE Kisi 2018",
            },
          },
          {
            type: "definitions",
            items: [
              {
                term: {
                  en: "Producer and region",
                  sv: "Producent och region",
                },
                description: {
                  en: "Twins Wine House, Napareuli, Kakheti, Georgia",
                  sv: "Twins Wine House, Napareuli, Kakheti, Georgien",
                },
              },
              {
                term: { en: "Grape", sv: "Druva" },
                description: { en: "Kisi", sv: "Kisi" },
              },
              {
                term: { en: "Skin contact", sv: "Skalkontakt" },
                description: {
                  en: "yes, in qvevri",
                  sv: "ja, i qvevri",
                },
              },
              {
                term: { en: "Alcohol", sv: "Alkohol" },
                description: { en: "12%", sv: "12 %" },
              },
              {
                term: { en: "Assortment", sv: "Sortiment" },
                description: {
                  en: "order assortment",
                  sv: "beställningsvara",
                },
              },
            ],
          },
          {
            type: "paragraphs",
            body: {
              en: [
                "Kisi made in qvevri the way Georgia has worked for millennia — a clear entry to Georgian orange wine.",
              ],
              sv: [
                "Kisi gjort i qvevri på det sätt Georgien arbetat i årtusenden – en tydlig ingång till georgiskt orange vin.",
              ],
            },
          },
          {
            type: "heading",
            text: {
              en: "Also worth knowing",
              sv: "Också värt att känna till",
            },
          },
          {
            type: "list",
            items: {
              en: [
                "**Ignacio Pino Román Naranjo 2025** (Itata, Chile) — Muscat d'Alexandrie from ungrafted bush vines, 13%. Temporary range.",
              ],
              sv: [
                "**Ignacio Pino Román Naranjo 2025** (Itata, Chile) – Muscat d'Alexandrie från ogympade buskstockar, 13 %. Tillfälligt sortiment.",
              ],
            },
          },
          {
            type: "paragraphs",
            body: {
              en: [
                "**On additives:** Systembolaget's data does not show additives or sulphite levels for these wines, so we do not state them.",
              ],
              sv: [
                "**Om tillsatser:** Systembolagets data visar inte tillsatser eller sulfithalt för dessa viner, så vi anger dem inte.",
              ],
            },
          },
        ],
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
