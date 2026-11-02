import type { GuideArticleContent } from "@/lib/guides/guide-types";

const EMPTY = { en: [] as string[], sv: [] as string[] };

const SLUG = {
  en: "best-pet-nat-systembolaget",
  sv: "basta-pet-nat-systembolaget",
} as const;

const AUTHOR = {
  name: "Axel Samuelson",
  jobTitle: "Grundare av PACT",
  byline: {
    en: "By Axel Samuelson, founder of PACT · Last reviewed: 2026-11-02",
    sv: "Av Axel Samuelson, grundare av PACT · Senast granskad: 2026-11-02",
  },
} as const;

/**
 * Shared slug/meta for the pet-nat Systembolaget guide pair.
 * English URL keeps the live ranked-list renderer; Swedish uses the
 * editorial article below (`bestPetNatWinesSystembolagetSvArticle`).
 */
export const bestPetNatWinesSystembolagetArticle: GuideArticleContent = {
  published: true,
  updated: "2026-11-02",
  slug: SLUG,
  title: {
    en: "Best pet nat at Systembolaget 2026",
    sv: "Bästa pet nat på Systembolaget – vårt urval | PACT",
  },
  meta: {
    en: "An independent list of pet nat at Systembolaget, updated on an ongoing basis against the current assortment.",
    sv: "Bästa pet nat på Systembolaget enligt PACT: pét-nat från Loire, Alsace, Mosel, Chile med flera, med fakta om druva och producent, vad pet nat är och vanliga frågor.",
  },
  h1: {
    en: "Best pet nat at Systembolaget 2026",
    sv: "Bästa pet nat på Systembolaget",
  },
  lede: {
    en: "Pet nat at Systembolaget is sparkling wine whose fermentation finishes in the bottle. This list collects the pet nat we currently consider up to the mark, and it is updated on an ongoing basis against the assortment. The selection is independent: PACT does not sell at Systembolaget and earns nothing from the choice.",
    sv: "Letar du efter pet nat på Systembolaget? Här är vårt urval av pétillant naturel – mousserande vin där jäsningen avslutas i flaskan – från Loire, Alsace, Mosel, Sydtyrolen, Moravien, Chile med flera. Listan följer sortimentet och uppdateras när det ändras.",
  },
  breadcrumbShort: {
    en: "Best pet nat at Systembolaget 2026",
    sv: "Bästa pet nat på Systembolaget",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Best pet nat at Systembolaget 2026",
      sv: "Bästa pet nat på Systembolaget",
    },
    description: {
      en: "An independent list of pet nat at Systembolaget, updated on an ongoing basis against the current assortment.",
      sv: "Vårt urval av pétillant naturel på Systembolaget – från Loire, Alsace, Mosel och Chile. Inga priser.",
    },
  },
  author: AUTHOR,
  shopCta: null,
  sections: [
    {
      heading: {
        en: "What is pet nat?",
        sv: "Vad är pet nat?",
      },
      body: {
        en: [
          "Pet nat is sparkling wine from a single fermentation that starts in tank and finishes in the bottle, usually under a crown cap. It is a method, not an appellation. [What is pet nat?](/guides/what-is-pet-nat) explains how it is made and how it differs from Champagne and Cava.",
        ],
        sv: [
          "Pet nat är mousserande vin där en och samma jäsning börjar i tank och avslutas i flaskan, oftast under kronkork. Det är en metod, inte en ursprungsbeteckning. [Vad är pet nat?](/guider/vad-ar-pet-nat) går igenom hur det görs och hur det skiljer sig från champagne och cava.",
        ],
      },
    },
    {
      heading: {
        en: "How we choose",
        sv: "Så har vi valt",
      },
      body: {
        en: [
          "We list pet nat from producers with organic or biodynamic farming, wild yeasts and minimal intervention, when that can be documented. We have not tasted every wine. The texts rely on the producer's own information, importers, Systembolaget's product pages and independent sources, and where sources disagree or something could not be verified we say so. Availability is read from Systembolaget's assortment, so a wine that disappears drops off the list at the next update.",
        ],
        sv: [
          "Vi listar pet nat från producenter med ekologisk eller biodynamisk odling, vilda jästsvampar och minimal intervention, när det går att belägga. Vi har inte smakat alla viner. Texterna bygger på producentens egna uppgifter, importörer, Systembolagets produktsidor och oberoende källor, och där källorna är oeniga eller något inte gått att verifiera säger vi det. Tillgängligheten hämtas från Systembolagets sortiment, så ett vin som försvinner faller bort ur listan vid nästa uppdatering.",
        ],
      },
    },
    {
      heading: {
        en: "Reading the list",
        sv: "Så läser du listan",
      },
      body: {
        en: [
          "Limited availability means the supplier has flagged the wine as temporarily unavailable, but Systembolaget's product page shows stores with stock. It may be sold out in your own store. The markers New, up and down show what has changed since the last review.",
        ],
        sv: [
          "Begränsad tillgång betyder att leverantören flaggat vinet som tillfälligt ej tillgängligt, men att Systembolagets produktsida visar butiker med lager. Det kan vara slut i just din butik. Markeringarna Ny, uppåt och nedåt visar vad som hänt sedan förra genomgången.",
        ],
      },
    },
    {
      heading: {
        en: "What we do not list",
        sv: "Vad vi inte listar",
      },
      body: {
        en: [
          "Sparkling wine that only has a natural-sounding word on the label, without documented farming and cellar practice. Pet nat is a method. It does not by itself say how the grapes were farmed or what was added. We start from the producer, not from the style name.",
        ],
        sv: [
          "Mousserande vin som bara har ett naturligt klingande ord på etiketten, utan belagd odling och källarpraxis. Pet nat är en metod. Den säger inte i sig hur druvorna odlats eller vad som tillsatts. Vi utgår från producenten, inte från stilnamnet.",
        ],
      },
    },
  ],
  faqs: [
    {
      question: {
        en: "What is the difference between pet nat and Champagne?",
        sv: "Vad är skillnaden mellan pet nat och champagne?",
      },
      answer: {
        en: "Champagne ferments twice: first to still wine, then with added yeast and sugar in the bottle. Pet nat ferments once and is bottled before fermentation finishes.",
        sv: "Champagne jäser två gånger: först till stilla vin, sedan med tillsatt jäst och socker i flaskan. Pet nat jäser bara en gång och buteljeras innan jäsningen är klar.",
      },
    },
    {
      question: {
        en: "Is pet nat the same as natural wine?",
        sv: "Är pet nat samma sak som naturvin?",
      },
      answer: {
        en: "No. Pet nat is a method for sparkling wine. Natural wine is about farming and minimal intervention. Many pet nat bottles are made by natural-wine producers, but far from all.",
        sv: "Nej. Pet nat är en metod för mousserande vin. Naturvin handlar om odling och minimal intervention. Många pet nat görs av naturvinsproducenter, men långt ifrån alla.",
      },
    },
    {
      question: {
        en: "What is the best pet nat at Systembolaget?",
        sv: "Vilket är det bästa pet nat-vinet på Systembolaget?",
      },
      answer: {
        en: "It depends on style. Haggan Pet Nat is in the fixed assortment year-round; Fio and Korab suit anyone who wants producers with clear natural-wine practice.",
        sv: "Det beror på stil. Haggan Pet Nat finns i fast sortiment året runt; Fio och Koráb är för dig som vill ha producenter med tydligt naturvinsarbete.",
      },
    },
  ],
  internalLinks: [
    {
      label: {
        en: "What is pet nat? →",
        sv: "Vad är pet nat? →",
      },
      href: {
        en: "/guides/what-is-pet-nat",
        sv: "/guider/vad-ar-pet-nat",
      },
    },
    {
      label: {
        en: "Best sparkling natural wines at Systembolaget →",
        sv: "Bästa mousserande naturviner på Systembolaget →",
      },
      href: {
        en: "/guides/best-sparkling-natural-wines-systembolaget",
        sv: "/guider/basta-mousserande-naturviner-systembolaget",
      },
    },
    {
      label: {
        en: "Best glou-glou wines at Systembolaget →",
        sv: "Bästa glou-glou-vinerna på Systembolaget →",
      },
      href: {
        en: "/guides/best-glou-glou-wines-systembolaget",
        sv: "/guider/basta-glouglou-viner-systembolaget",
      },
    },
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
        en: "All guides →",
        sv: "Alla guider →",
      },
      href: {
        en: "/guides",
        sv: "/guider",
      },
    },
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Pet nat",
  },
};

/**
 * Swedish editorial rewrite of /guider/basta-pet-nat-systembolaget
 * (draft 2026-11-02). Keeps the same slug/hreflang pair as the English
 * ranked list at /guides/best-pet-nat-systembolaget.
 */
export const bestPetNatWinesSystembolagetSvArticle: GuideArticleContent = {
  published: true,
  updated: "2026-11-02",
  slug: SLUG,
  title: {
    en: "Best pet nat at Systembolaget 2026",
    sv: "Bästa pet nat på Systembolaget – vårt urval | PACT",
  },
  meta: {
    en: "Best pet nat at Systembolaget according to PACT: pet-nat from Loire, Alsace, Mosel, Chile and more, with grape and producer facts, what pet nat is, and FAQs.",
    sv: "Bästa pet nat på Systembolaget enligt PACT: pét-nat från Loire, Alsace, Mosel, Chile med flera, med fakta om druva och producent, vad pét-nat är och vanliga frågor.",
  },
  h1: {
    en: "Best pet nat at Systembolaget",
    sv: "Bästa pet nat på Systembolaget",
  },
  lede: {
    en: "Looking for pet nat at Systembolaget? Here is our selection of petillant naturel — sparkling wine whose fermentation finishes in the bottle — from Loire, Alsace, Mosel, South Tyrol, Moravia, Chile and more. The list follows the assortment and is updated when it changes.",
    sv: "Letar du efter pét-nat på Systembolaget? Här är vårt urval av pétillant naturel – mousserande vin där jäsningen avslutas i flaskan – från Loire, Alsace, Mosel, Sydtyrolen, Moravien, Chile med flera. Listan följer sortimentet och uppdateras när det ändras.",
  },
  breadcrumbShort: {
    en: "Best pet nat at Systembolaget",
    sv: "Bästa pet nat på Systembolaget",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Best pet nat at Systembolaget",
      sv: "Bästa pet nat på Systembolaget",
    },
    description: {
      en: "Our selection of petillant naturel at Systembolaget — from Loire, Alsace, Mosel and Chile. No prices.",
      sv: "Vårt urval av pétillant naturel på Systembolaget – från Loire, Alsace, Mosel och Chile. Inga priser.",
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
                "**Year-round:** [Haggan Pet Nat](#haggan-pet-nat) — Chenin Blanc from Montlouis in Systembolaget's fixed assortment.",
                "**Chenin from the Loire:** [Francois Chidaine Petillant](#chidaine-petillant), [Haggan Pet Nat](#haggan-pet-nat).",
                "**Producers with clear natural-wine practice:** [Fio Piu Piu](#fio-piu-piu), [Petr Korab Orange on Leaves](#korab-orange-on-leaves), [Sandrine Henriot Bubulle](#henriot-bubulle).",
                "**Rose pet-nat:** [Pranzegg MiauMiau](#pranzegg-miaumiau), [Alta Alella Puput Rose](#puput-rose), [Integrale Frizzante Rose](#integrale-rose).",
                "**Outside Europe:** [Pino Roman Pet-Nat Pais](#pino-roman-pais) (Chile).",
              ],
              sv: [
                "**Finns året runt:** [Haggan Pet Nat](#haggan-pet-nat) – Chenin Blanc från Montlouis i Systembolagets fasta sortiment.",
                "**Chenin från Loire:** [François Chidaine Pétillant](#chidaine-petillant), [Haggan Pet Nat](#haggan-pet-nat).",
                "**Producenter med tydligt naturvinsarbete:** [Fio Piu Piu](#fio-piu-piu), [Petr Koráb Orange on Leaves](#korab-orange-on-leaves), [Sandrine Henriot Bubulle](#henriot-bubulle).",
                "**Rosa pét-nat:** [Pranzegg MiauMiau](#pranzegg-miaumiau), [Alta Alella Puput Rosé](#puput-rose), [Integrale Frizzante Rosé](#integrale-rose).",
                "**Utanför Europa:** [Pino Román Pét-Nat País](#pino-roman-pais) (Chile).",
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
                "**The method:** real pet-nat (methode ancestrale) — a single fermentation that finishes in bottle.",
                "**Breadth:** different grapes, colours and regions.",
                "**Availability:** the wine must be in Systembolaget's assortment (fixed, temporary or order assortment).",
              ],
              sv: [
                "**Producenten:** odlare med egen historia, inte handelsvarumärken.",
                "**Metoden:** äkta pét-nat (méthode ancestrale) – en enda jäsning som avslutas på flaska.",
                "**Bredd:** olika druvor, färger och regioner.",
                "**Tillgänglighet:** vinet ska finnas i Systembolagets sortiment (fast, tillfälligt eller beställningsvara).",
              ],
          },
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "Not every wine on the list is documented as natural wine. Where we can document the producer's approach we say so, and we cite the source when the detail comes from an importer.",
            ],
            sv: [
              "Inte alla viner på listan är belagda som naturvin. Där vi kan belägga producentens arbetssätt skriver vi det, och vi anger källan när uppgiften kommer från importör.",
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
          id: "haggan-pet-nat",
          text: {
            en: "Haggan Pet Nat 2022",
            sv: "Haggan Pet Nat 2022",
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
                en: "Xavier Weisskopf (Le Rocher des Violettes), Montlouis, Loire, France",
                sv: "Xavier Weisskopf (Le Rocher des Violettes), Montlouis, Loire, Frankrike",
              },
            },
            {
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Chenin Blanc",
                sv: "Chenin Blanc",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "12.5%",
                sv: "12,5 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
              description: {
                en: "fixed assortment",
                sv: "fast sortiment",
              },
            },
            {
              term: {
                en: "Farming",
                sv: "Odling",
              },
              description: {
                en: "organic (per Systembolaget)",
                sv: "ekologisk (enligt Systembolaget)",
              },
            },
          ],
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "Made with methode ancestrale in a collaboration between Weisskopf and Vinhaggorna AB — a collaboration label, not the domaine's own cuvee. Weisskopf has run Le Rocher des Violettes since 2005, certified organic since 2009. The only wine on the list in the fixed assortment, so it can be found year-round.",
            ],
            sv: [
              "Gjord med méthode ancestrale i samarbete mellan Weisskopf och Vinhaggorna AB – en samarbetsetikett, inte domänens egen cuvée. Weisskopf driver Le Rocher des Violettes sedan 2005, certifierat ekologiskt sedan 2009. Det enda vinet på listan i fast sortiment, så det går att hitta året runt.",
            ],
          },
        },
        {
          type: "heading",
          id: "chidaine-petillant",
          text: {
            en: "Francois Chidaine Petillant 2022",
            sv: "François Chidaine Pétillant 2022",
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
                en: "Francois Chidaine, Loire, France",
                sv: "François Chidaine, Loire, Frankrike",
              },
            },
            {
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Chenin Blanc",
                sv: "Chenin Blanc",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "12%",
                sv: "12 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
              description: {
                en: "order assortment",
                sv: "beställningsvara",
              },
            },
            {
              term: {
                en: "Farming",
                sv: "Odling",
              },
              description: {
                en: "organic (per Systembolaget)",
                sv: "ekologisk (enligt Systembolaget)",
              },
            },
          ],
        },
        {
          type: "heading",
          id: "fio-piu-piu",
          text: {
            en: "Fio Piu Piu Petnat",
            sv: "Fio Piu Piu Petnat",
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
                en: "Fio (the Kettern family and Dirk Niepoort), Mosel, Germany",
                sv: "Fio (familjen Kettern och Dirk Niepoort), Mosel, Tyskland",
              },
            },
            {
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Riesling, from several vintages",
                sv: "Riesling, från flera årgångar",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "11%",
                sv: "11 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
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
              "The wines ferment spontaneously in old fuder casks. According to importers, Piu Piu is bottled without fining, filtration or added sulphur.",
            ],
            sv: [
              "Vinerna jäser spontant i gamla fuderfat. Enligt importörer buteljeras Piu Piu utan klarning, filtrering eller tillsatt svavel.",
            ],
          },
        },
        {
          type: "heading",
          id: "korab-orange-on-leaves",
          text: {
            en: "Petr Korab Orange on Leaves Pet Nat 2025",
            sv: "Petr Koráb Orange on Leaves Pet Nat 2025",
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
                en: "Petr Korab, Boleradice, southern Moravia, Czech Republic",
                sv: "Petr Koráb, Boleradice, södra Moravien, Tjeckien",
              },
            },
            {
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Not stated",
                sv: "Uppgift saknas",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "12%",
                sv: "12 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
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
              "Korab founded the estate in 2006 with his brother and works with old vines, spontaneous fermentation and as few additions as possible. The grapes are macerated on the skins together with dried vine leaves — a pet-nat with skin contact.",
            ],
            sv: [
              "Koráb grundade vingården 2006 med sin bror och arbetar med gamla stockar, spontanjäsning och så få tillsatser som möjligt. Druvorna macereras på skalen tillsammans med torkade vinblad – en pét-nat med skalkontakt.",
            ],
          },
        },
        {
          type: "heading",
          id: "henriot-bubulle",
          text: {
            en: "Sandrine Henriot PetNat Bubulle",
            sv: "Sandrine Henriot PetNat Bubulle",
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
                en: "Sandrine Henriot, Morgon, Beaujolais, France",
                sv: "Sandrine Henriot, Morgon, Beaujolais, Frankrike",
              },
            },
            {
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Gamay",
                sv: "Gamay",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "12.5%",
                sv: "12,5 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
              description: {
                en: "order assortment",
                sv: "beställningsvara",
              },
            },
            {
              term: {
                en: "Farming",
                sv: "Odling",
              },
              description: {
                en: "organic (per Systembolaget)",
                sv: "ekologisk (enligt Systembolaget)",
              },
            },
          ],
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "A small biodynamic farm of about 3.3 hectares where the land is ploughed with a horse.",
            ],
            sv: [
              "En liten biodynamisk gård på cirka 3,3 hektar där marken plöjs med häst.",
            ],
          },
        },
        {
          type: "heading",
          id: "faller-muscat",
          text: {
            en: "Luc Faller Petillant Naturel Muscat 2025",
            sv: "Luc Faller Pétillant Naturel Muscat 2025",
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
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Muscat",
                sv: "Muscat",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "12.5%",
                sv: "12,5 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
              description: {
                en: "order assortment",
                sv: "beställningsvara",
              },
            },
            {
              term: {
                en: "Farming",
                sv: "Odling",
              },
              description: {
                en: "organic (per Systembolaget)",
                sv: "ekologisk (enligt Systembolaget)",
              },
            },
          ],
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "Luc Faller farms biodynamically and works with minimal intervention.",
            ],
            sv: [
              "Luc Faller odlar biodynamiskt och arbetar med minimal intervention.",
            ],
          },
        },
        {
          type: "heading",
          id: "riedlin-spatburgunder",
          text: {
            en: "Riedlin Pet Nat Spatburgunder 2024",
            sv: "Riedlin Pet Nat Spätburgunder 2024",
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
                en: "Weingut Markus Riedlin, Germany",
                sv: "Weingut Markus Riedlin, Tyskland",
              },
            },
            {
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Pinot Noir (Spatburgunder)",
                sv: "Pinot Noir (Spätburgunder)",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "12%",
                sv: "12 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
              description: {
                en: "order assortment",
                sv: "beställningsvara",
              },
            },
            {
              term: {
                en: "Farming",
                sv: "Odling",
              },
              description: {
                en: "organic (per Systembolaget)",
                sv: "ekologisk (enligt Systembolaget)",
              },
            },
          ],
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "White pet-nat from blue grapes — Systembolaget classifies it as dry white sparkling wine. Lighter glass bottle with screw cap.",
            ],
            sv: [
              "Vit pét-nat på blå druvor – Systembolaget klassar den som torrt vitt mousserande vin. Lättare glasflaska med skruvkapsyl.",
            ],
          },
        },
        {
          type: "heading",
          id: "la-colombe-de-facto",
          text: {
            en: "Domaine La Colombe De Facto Pet Nat 2023",
            sv: "Domaine La Colombe De Facto Pet Nat 2023",
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
                en: "Domaine La Colombe, Switzerland",
                sv: "Domaine La Colombe, Schweiz",
              },
            },
            {
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Chasselas",
                sv: "Chasselas",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "11%",
                sv: "11 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
              description: {
                en: "order assortment",
                sv: "beställningsvara",
              },
            },
            {
              term: {
                en: "Farming",
                sv: "Odling",
              },
              description: {
                en: "organic (per Systembolaget)",
                sv: "ekologisk (enligt Systembolaget)",
              },
            },
          ],
        },
        {
          type: "heading",
          id: "pranzegg-miaumiau",
          text: {
            en: "Pranzegg MiauMiau PetNat Rose 2024",
            sv: "Pranzegg MiauMiau PetNat Rosé 2024",
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
                en: "Weingut Pranzegg (Martin Gojer), South Tyrol, Italy",
                sv: "Weingut Pranzegg (Martin Gojer), Sydtyrolen, Italien",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "11.5%",
                sv: "11,5 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
              description: {
                en: "order assortment",
                sv: "beställningsvara",
              },
            },
            {
              term: {
                en: "Farming",
                sv: "Odling",
              },
              description: {
                en: "organic (per Systembolaget)",
                sv: "ekologisk (enligt Systembolaget)",
              },
            },
          ],
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "From steep, volcanic sites.",
            ],
            sv: [
              "Från branta, vulkaniska lägen.",
            ],
          },
        },
        {
          type: "heading",
          id: "puput-rose",
          text: {
            en: "Alta Alella Puput Rose Pet-Nat 2025",
            sv: "Alta Alella Puput Rosé Pét-Nat 2025",
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
                en: "Alta Alella, Tiana, Catalonia, Spain",
                sv: "Alta Alella, Tiana, Katalonien, Spanien",
              },
            },
            {
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Mataro (Monastrell)",
                sv: "Mataro (Monastrell)",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "11%",
                sv: "11 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
              description: {
                en: "temporary range",
                sv: "tillfälligt sortiment",
              },
            },
            {
              term: {
                en: "Farming",
                sv: "Odling",
              },
              description: {
                en: "organic (per Systembolaget)",
                sv: "ekologisk (enligt Systembolaget)",
              },
            },
          ],
        },
        {
          type: "heading",
          id: "integrale-rose",
          text: {
            en: "Integrale Frizzante Pet Nat Rose",
            sv: "Integrale Frizzante Pet Nat Rosé",
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
                en: "Integrale, Veneto, Italy",
                sv: "Integrale, Veneto, Italien",
              },
            },
            {
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Marzemino and Raboso",
                sv: "Marzemino och Raboso",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "10.5%",
                sv: "10,5 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
              description: {
                en: "order assortment",
                sv: "beställningsvara",
              },
            },
            {
              term: {
                en: "Farming",
                sv: "Odling",
              },
              description: {
                en: "organic (per Systembolaget)",
                sv: "ekologisk (enligt Systembolaget)",
              },
            },
          ],
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "Dry and light, with 2.5 grams residual sugar per litre according to Quebec's alcohol monopoly SAQ. We have not found more about the producer, so the wine is included for its style.",
            ],
            sv: [
              "Torr och lätt, med 2,5 gram restsocker per liter enligt Québecs alkoholmonopol SAQ. Vi har inte hittat mer om producenten, så vinet är med för sin stil.",
            ],
          },
        },
        {
          type: "heading",
          id: "pino-roman-pais",
          text: {
            en: "Pino Roman Pet-Nat Pais 2025",
            sv: "Pino Román Pét-Nat País 2025",
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
                en: "Ignacio Pino Roman, Valle del Itata, Chile",
                sv: "Ignacio Pino Román, Valle del Itata, Chile",
              },
            },
            {
              term: {
                en: "Grape",
                sv: "Druva",
              },
              description: {
                en: "Pais",
                sv: "País",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "12.5%",
                sv: "12,5 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
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
              "Same producer as Pipeno. According to importers, Pino Roman works with old bush vines.",
            ],
            sv: [
              "Samma producent som Pipeño. Enligt importörer arbetar Pino Román med gamla buskstockar.",
            ],
          },
        },
        {
          type: "heading",
          id: "pequenos-rebentos",
          text: {
            en: "Pequenos Rebentos Ancestral Pet Nat 2025",
            sv: "Pequenos Rebentos Ancestral Pet Nat 2025",
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
                en: "Marcio Lopes, Vinho Verde, Portugal",
                sv: "Marcio Lopes, Vinho Verde, Portugal",
              },
            },
            {
              term: {
                en: "Alcohol",
                sv: "Alkohol",
              },
              description: {
                en: "12%",
                sv: "12 %",
              },
            },
            {
              term: {
                en: "Assortment",
                sv: "Sortiment",
              },
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
              "Systembolaget lists no grape. Fresh and fruity style according to Systembolaget's description.",
            ],
            sv: [
              "Systembolaget anger ingen druva. Frisk och fruktig stil enligt Systembolagets beskrivning.",
            ],
          },
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "**On additives:** Systembolaget's data does not show additives or sulphite levels. Where an importer states them (Fio Piu Piu) we write that with a source; otherwise we state nothing.",
            ],
            sv: [
              "**Om tillsatser:** Systembolagets data visar inte tillsatser eller sulfithalt. Där en importör uppger det (Fio Piu Piu) skriver vi det med källa; annars anger vi inget.",
            ],
          },
        },
      ],
    },
    {
      heading: {
        en: "What is pet nat?",
        sv: "Vad är pét-nat?",
      },
      body: {
        en: [
          "Pet nat (petillant naturel) is sparkling wine made with the oldest method, methode ancestrale. The wine is bottled before the first fermentation finishes, and the bubbles form in the bottle from the grape's own sugar — without added yeast or sugar. That is why pet nat is often lightly cloudy, with softer bubbles than Champagne, and sometimes with leftover yeast sediment in the bottle. Read more in [What is pet nat?](/guides/what-is-pet-nat) and [What is natural wine?](/guides/what-is-natural-wine).",
          "Not all pet nat is natural wine. The method says how the bubbles arrive, not how the grapes were farmed or what was added.",
        ],
        sv: [
          "Pét-nat (pétillant naturel) är mousserande vin gjort med den äldsta metoden, méthode ancestrale. Vinet buteljeras innan första jäsningen är klar, och kolsyran bildas i flaskan av druvans eget socker – utan tillsatt jäst eller socker. Därför är pét-nat ofta lätt grumligt, med mjukare bubblor än champagne, och ibland med kvarvarande jästfällning i flaskan. Läs mer i [Vad är pét-nat?](/guider/vad-ar-pet-nat) och [Vad är naturvin?](/guider/vad-ar-naturvin).",
          "Allt pét-nat är inte naturvin. Metoden säger hur bubblorna kommer till, inte hur druvorna odlats eller vad som tillsatts.",
        ],
      },
    },
    {
      heading: {
        en: "Pet nat and food",
        sv: "Pét-nat och mat",
      },
      body: EMPTY,
      blocks: [
        {
          type: "paragraphs",
          body: {
            en: [
              "Pet nat has acidity and light bubbles and works with:",
            ],
            sv: [
              "Pét-nat har syra och lätta bubblor och fungerar till:",
            ],
          },
        },
        {
          type: "list",
          items: {
              en: [
                "fried and salty food, for example tempura or fries",
                "shellfish and raw fish",
                "fresh cheese and goat cheese",
                "salads and vegetable dishes with herbs",
              ],
              sv: [
                "friterat och salt, till exempel tempura eller pommes",
                "skaldjur och rå fisk",
                "färskost och getost",
                "sallader och grönsaksrätter med örter",
              ],
          },
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "Serve well chilled (around 6–8 °C). Open carefully — some pet nat have a crown cap and can foam.",
            ],
            sv: [
              "Servera väl kylt (cirka 6–8 °C). Öppna försiktigt – vissa pét-nat har kronkork och kan skumma.",
            ],
          },
        },
      ],
    },
  ],
  faqs: [
    {
      question: {
        en: "What is the difference between pet nat and Champagne?",
        sv: "Vad är skillnaden mellan pét-nat och champagne?",
      },
      answer: {
        en: "Champagne ferments twice: first to still wine, then with added yeast and sugar in the bottle. Pet nat ferments once and is bottled before fermentation finishes.",
        sv: "Champagne jäser två gånger: först till stilla vin, sedan med tillsatt jäst och socker i flaskan. Pét-nat jäser bara en gång och buteljeras innan jäsningen är klar.",
      },
    },
    {
      question: {
        en: "Is pet nat the same as natural wine?",
        sv: "Är pét-nat samma sak som naturvin?",
      },
      answer: {
        en: "No. Pet nat is a method for sparkling wine. Natural wine is about farming and minimal intervention. Many pet nat bottles are made by natural-wine producers, but far from all.",
        sv: "Nej. Pét-nat är en metod för mousserande vin. Naturvin handlar om odling och minimal intervention. Många pét-nat görs av naturvinsproducenter, men långt ifrån alla.",
      },
    },
    {
      question: {
        en: "What is the best pet nat at Systembolaget?",
        sv: "Vilket är det bästa pét-nat-vinet på Systembolaget?",
      },
      answer: {
        en: "It depends on style. Haggan Pet Nat is in the fixed assortment year-round; Fio and Korab suit anyone who wants producers with clear natural-wine practice.",
        sv: "Det beror på stil. Haggan Pet Nat finns i fast sortiment året runt; Fio och Koráb är för dig som vill ha producenter med tydligt naturvinsarbete.",
      },
    },
    {
      question: {
        en: "Why is pet nat cloudy?",
        sv: "Varför är pét-nat grumligt?",
      },
      answer: {
        en: "Often the yeast sediment stays in the bottle because the wine is not disgorged. It is harmless and part of the style.",
        sv: "Ofta är jästfällningen kvar i flaskan eftersom vinet inte degorgeras. Det är ofarligt och en del av stilen.",
      },
    },
    {
      question: {
        en: "How long does an opened pet nat keep?",
        sv: "Hur länge håller en öppnad pét-nat?",
      },
      answer: {
        en: "The bubbles fade faster than in Champagne. With a sparkling stopper in the fridge it usually keeps one to two days.",
        sv: "Bubblorna avtar snabbare än i champagne. Med en mousserande-propp i kylskåp brukar den hålla en till två dagar.",
      },
    },
    {
      question: {
        en: "Is there rose pet nat?",
        sv: "Finns det rosa pét-nat?",
      },
      answer: {
        en: "Yes. On the list there are three: MiauMiau from Pranzegg, Puput Rose from Alta Alella and Integrale Frizzante Rose.",
        sv: "Ja. På listan finns tre: MiauMiau från Pranzegg, Puput Rosé från Alta Alella och Integrale Frizzante Rosé.",
      },
    },
  ],
  internalLinks: [
    {
      label: {
        en: "What is pet nat? →",
        sv: "Vad är pet nat? →",
      },
      href: {
        en: "/guides/what-is-pet-nat",
        sv: "/guider/vad-ar-pet-nat",
      },
    },
    {
      label: {
        en: "What is natural wine? →",
        sv: "Vad är naturvin? →",
      },
      href: {
        en: "/guides/what-is-natural-wine",
        sv: "/guider/vad-ar-naturvin",
      },
    },
    {
      label: {
        en: "Best pet nat at Systembolaget →",
        sv: "Engelsk version: Best pet nat at Systembolaget →",
      },
      href: {
        en: "/guides/best-pet-nat-systembolaget",
        sv: "/guides/best-pet-nat-systembolaget",
      },
    },
    {
      label: {
        en: "Best sparkling natural wines at Systembolaget →",
        sv: "Bästa mousserande naturviner på Systembolaget →",
      },
      href: {
        en: "/guides/best-sparkling-natural-wines-systembolaget",
        sv: "/guider/basta-mousserande-naturviner-systembolaget",
      },
    },
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Pet nat",
  },
};
