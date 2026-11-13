import {
  ARTICLE_GUIDE_EDITORIAL_H2_CLASS,
  ARTICLE_GUIDE_WINE_H3_FIXED_CLASS,
} from "@/lib/guides/article-guide-shell";
import type { GuideArticleContent } from "@/lib/guides/guide-types";

const EMPTY = { en: [] as string[], sv: [] as string[] };

const SLUG = {
  en: "best-red-natural-wines-systembolaget",
  sv: "basta-roda-naturviner-systembolaget",
} as const;

const AUTHOR = {
  name: "Axel Samuelson",
  jobTitle: "Grundare av PACT",
  byline: {
    en: "By Axel Samuelson, founder of PACT · Last reviewed: 2026-11-09",
    sv: "Av Axel Samuelson, grundare av PACT · Senast granskad: 2026-11-09",
  },
} as const;

/**
 * English editorial rewrite of /guides/best-red-natural-wines-systembolaget
 * (handoff red-guide-en.md, 2026-11-13). Same template as the Swedish page.
 * Swedish URL uses `bestRedNaturalWinesSystembolagetSvArticle`.
 */
export const bestRedNaturalWinesSystembolagetArticle: GuideArticleContent = {
  updated: "2026-11-09",
  slug: SLUG,
  title: {
    en: "Red natural wine at Systembolaget 2026: our selection | PACT Wines",
    sv: "Rött naturvin på Systembolaget 2026: vårt urval | PACT Wines",
  },
  meta: {
    en: "Red natural wine at Systembolaget according to PACT: light, chillable reds, classics from the Loire and Beaujolais, Sicily, Austria and Chile, with facts on producer and grape and common questions.",
    sv: "Rött naturvin på Systembolaget enligt PACT: lätta och kylbara röda, klassiker från Loire och Beaujolais, Sicilien, Österrike och Chile, med fakta om producent och druva och vanliga frågor.",
  },
  h1: {
    en: "Red natural wine at Systembolaget",
    sv: "Rött naturvin på Systembolaget",
  },
  lede: {
    en: "Looking for red natural wine at Systembolaget? Here is our selection of red wines from growers who work organically or biodynamically and with low intervention in the cellar, from the Loire, Beaujolais, Sicily, Austria, Spain and Chile. The list follows Systembolaget's range and is updated when it changes. The prices on the cards are Systembolaget's own.",
    sv: "Letar du efter rött naturvin på Systembolaget? Här är vårt urval av röda viner från odlare som arbetar ekologiskt eller biodynamiskt och med låg intervention i källaren, från Loire, Beaujolais, Sicilien, Österrike, Spanien och Chile. Listan följer Systembolagets sortiment och uppdateras när det ändras. Priserna på korten är Systembolagets egna.",
  },
  breadcrumbShort: {
    en: "Red natural wine at Systembolaget",
    sv: "Rött naturvin på Systembolaget",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Red natural wine at Systembolaget",
      sv: "Rött naturvin på Systembolaget",
    },
    description: {
      en: "Our selection of red natural wines at Systembolaget — light chillable reds, Loire, Beaujolais, Sicily and Austria.",
      sv: "Vårt urval av röda naturviner på Systembolaget — lätta kylbara röda, Loire, Beaujolais, Sicilien och Österrike.",
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
        en: "Our selection at a glance",
        sv: "Vårt urval i korthet",
      },
      body: EMPTY,
      blocks: [
        {
          type: "list",
          items: {
            en: [
              "**Light reds to serve chilled:** Lamoresca Nerocapitano (Frappato, Sicily), Martin Gojer Campill (Vernatsch, South Tyrol), Pino Román Tinto País (Chile).",
              "**Classics of the natural wine movement:** Catherine & Pierre Breton Trinch (Bourgueil), Sandrine Henriot Morgon Vagabond (Beaujolais), Éric Texier Chat Fou (Rhône).",
              "**Sicily:** Arianna Occhipinti Siccagno and Frappato, Frank Cornelissen Susucaru Rosso (Etna).",
              "**Austria:** Gut Oggau Josephine, Rennersistas Superglitzer, Heinrich Pinot Noir.",
              "**In the permanent range:** Werner Michlits's family domaine in Burgenland.",
            ],
            sv: [
              "**Lätta röda att servera svala:** Lamoresca Nerocapitano (Frappato, Sicilien), Martin Gojer Campill (Vernatsch, Sydtyrolen), Pino Román Tinto País (Chile).",
              "**Klassiker från naturvinsrörelsen:** Catherine & Pierre Breton Trinch (Bourgueil), Sandrine Henriot Morgon Vagabond (Beaujolais), Éric Texier Chat Fou (Rhône).",
              "**Sicilien:** Arianna Occhipinti Siccagno och Frappato, Frank Cornelissen Susucaru Rosso (Etna).",
              "**Österrike:** Gut Oggau Josephine, Rennersistas Superglitzer, Heinrich Pinot Noir.",
              "**Finns i fasta sortimentet:** Werner Michlits familjedomän i Burgenland.",
            ],
          },
        },
      ],
    },
    {
      heading: {
        en: "How we chose",
        sv: "Så har vi valt",
      },
      body: EMPTY,
      blocks: [
        {
          type: "list",
          items: {
            en: [
              "**The producer:** growers with a history of their own, not trading brands. Several appear on our list of [the world's best natural wine producers](/guides/worlds-best-natural-wine-producers).",
              "**Farming and cellar:** organic or biodynamic farming, wild fermentation and little or no added sulphur where we can substantiate it.",
              "**Range:** light, chillable reds as well as more structured wines for food.",
              "**Availability:** the wine should be in Systembolaget's range (permanent, temporary or special-order).",
            ],
            sv: [
              "**Producenten:** odlare med egen historia, inte handelsvarumärken. Flera finns på vår lista över [världens bästa naturvinsproducenter](/guider/varldens-basta-naturvinsproducenter).",
              "**Odlingen och källaren:** ekologisk eller biodynamisk odling, spontanjäsning och lite eller inget tillsatt svavel där vi kan belägga det.",
              "**Bredd:** lätta och kylbara röda såväl som mer strukturerade viner till mat.",
              "**Tillgänglighet:** vinet ska finnas i Systembolagets sortiment (fast, tillfälligt eller beställningsvara).",
            ],
          },
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "Not every wine on the list is documented as natural wine. Where we can substantiate the producer's methods we say so, and where a fact comes from an importer or Systembolaget we say so.",
            ],
            sv: [
              "Inte alla viner på listan är belagda som naturvin. Där vi kan belägga producentens arbetssätt skriver vi det, och där en uppgift kommer från importör eller Systembolaget anger vi det.",
            ],
          },
        },
      ],
    },
    {
      heading: {
        en: "What is red natural wine?",
        sv: "Vad är rött naturvin?",
      },
      body: {
        en: [
          "Red natural wine is red wine made with low intervention. The grapes are typically grown organically or biodynamically, fermentation uses the grapes' own yeast, and little or no sulphur is added in the cellar. There is no shared legal definition of natural wine in Sweden or the EU, so the word says more about the producer's methods than about a certification. Read more in [What is natural wine?](/guides/what-is-natural-wine)",
          "Many red natural wines are lighter in style than classic reds, with grapes such as gamay, frappato, país, vernatsch and pinot noir. Several benefit from being served a little cooler than room temperature. But there are also more structured wines, for example cabernet franc from the Loire or blaufränkisch from Burgenland.",
        ],
        sv: [
          "Rött naturvin är rött vin gjort med låg intervention. Druvorna odlas typiskt ekologiskt eller biodynamiskt, jäsningen sker med druvornas egen jäst och i källaren tillsätts lite eller inget svavel. Det finns ingen gemensam lagdefinition av naturvin i Sverige eller EU, så ordet säger mer om producentens arbetssätt än om en certifiering. Läs mer i [Vad är naturvin?](/guider/vad-ar-naturvin)",
          "Många röda naturviner är lättare i stilen än klassiska rödviner, med druvor som gamay, frappato, país, vernatsch och pinot noir. Flera gynnas av att serveras något svalare än rumstemperatur. Men det finns också mer strukturerade viner, till exempel cabernet franc från Loire eller blaufränkisch från Burgenland.",
        ],
      },
    },
    {
      heading: {
        en: "Red natural wine and food",
        sv: "Rött naturvin och mat",
      },
      body: EMPTY,
      blocks: [
        {
          type: "list",
          items: {
            en: [
              "**Light, chilled reds** (gamay, frappato, país): charcuterie, chicken, grilled vegetables and mushrooms.",
              "**More structured reds** (cabernet franc, blaufränkisch, nero d'avola): stews, lamb and dishes with herbs and pepper.",
              "**Litre bottles and lighter cuvées** are made to be drunk young, not for ageing.",
            ],
            sv: [
              "**Lätta, svala röda** (gamay, frappato, país): charkuterier, kyckling, grillade grönsaker och svamp.",
              "**Mer strukturerade röda** (cabernet franc, blaufränkisch, nero d'avola): grytor, lamm och rätter med örter och peppar.",
              "**Literflaskor och lättare cuvéer** är gjorda för att drickas unga, inte för att lagras.",
            ],
          },
        },
      ],
    },
  ],
  faqs: [
    {
      question: {
        en: "What is the best red natural wine at Systembolaget?",
        sv: "Vilket är det bästa röda naturvinet på Systembolaget?",
      },
      answer: {
        en: "It depends on style. Breton Trinch and Henriot Morgon Vagabond are classics from the Loire and Beaujolais. Occhipinti and Cornelissen show what Sicily can do. If you want something light and chilled, Lamoresca Nerocapitano is a good choice.",
        sv: "Det beror på stil. Breton Trinch och Henriot Morgon Vagabond är klassiker från Loire och Beaujolais. Occhipinti och Cornelissen visar vad Sicilien kan. Vill du ha något lätt och svalt är Lamoresca Nerocapitano ett bra val.",
      },
    },
    {
      question: {
        en: "Is organic red wine the same as natural wine?",
        sv: "Är ekologiskt rött vin samma sak som naturvin?",
      },
      answer: {
        en: "No. Organic refers to the farming. Natural wine is also about how the wine is made in the cellar: wild fermentation, few or no additives, and little or no sulphur. An organic wine can be made entirely conventionally.",
        sv: "Nej. Ekologiskt gäller odlingen. Naturvin handlar också om hur vinet görs i källaren: spontanjäsning, få eller inga tillsatser och lite eller inget svavel. Ett ekologiskt vin kan vara gjort helt konventionellt.",
      },
    },
    {
      question: {
        en: "Should red natural wine be served chilled?",
        sv: "Ska rött naturvin serveras kylt?",
      },
      answer: {
        en: "Many light red natural wines taste best a little cooler than room temperature. Systembolaget, for example, recommends around 16°C for Pino Román Tinto País.",
        sv: "Många lätta röda naturviner smakar bäst lite svalare än rumstemperatur. Systembolaget rekommenderar till exempel cirka 16 grader för Pino Román Tinto País.",
      },
    },
    {
      question: {
        en: "Is there red natural wine in Systembolaget's permanent range?",
        sv: "Finns rött naturvin i Systembolagets fasta sortiment?",
      },
      answer: {
        en: "Yes, but most wines on the list are temporary or special-order items. Werner Michlits's family domaine in Burgenland is in the permanent range.",
        sv: "Ja, men de flesta viner på listan är tillfälligt sortiment eller beställningsvaror. Werner Michlits familjedomän i Burgenland finns i det fasta sortimentet.",
      },
    },
    {
      question: {
        en: 'Do you run scored tastings or "best in test" reviews?',
        sv: 'Gör ni tester med poäng, "bäst i test"?',
      },
      answer: {
        en: "No. The list is our editorial judgement based on producer, method and range.",
        sv: "Nej. Listan är vår redaktionella bedömning utifrån producent, metod och bredd.",
      },
    },
    {
      question: {
        en: "How long does an opened red natural wine last?",
        sv: "Hur länge håller ett öppnat rött naturvin?",
      },
      answer: {
        en: "It varies. With a cork in the fridge, most last a few days. Wine with little sulphur can change more quickly.",
        sv: "Det varierar. Med kork i kylskåp brukar de flesta hålla några dagar. Vin med lite svavel kan förändras snabbare.",
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
        en: "Best orange natural wines at Systembolaget →",
        sv: "Bästa orange naturviner på Systembolaget →",
      },
      href: {
        en: "/guides/best-orange-natural-wines-systembolaget",
        sv: "/guider/basta-orange-naturviner-systembolaget",
      },
    },
    {
      label: {
        en: "Swedish version: Rött naturvin på Systembolaget →",
        sv: "Engelsk version: Red natural wine at Systembolaget →",
      },
      href: {
        en: "/guider/basta-roda-naturviner-systembolaget",
        sv: "/guides/best-red-natural-wines-systembolaget",
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
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Natural wine",
  },
};

/**
 * Swedish editorial rewrite of /guider/basta-roda-naturviner-systembolaget
 * (draft 2026-11-09). Keeps the same slug/hreflang pair as the English
 * ranked list at /guides/best-red-natural-wines-systembolaget.
 */
export const bestRedNaturalWinesSystembolagetSvArticle: GuideArticleContent = {
  updated: "2026-11-09",
  slug: SLUG,
  title: {
    en: "Red natural wine at Systembolaget 2026: our selection | PACT Wines",
    sv: "Rött naturvin på Systembolaget 2026: vårt urval | PACT Wines",
  },
  meta: {
    en: "Red natural wine at Systembolaget according to PACT: light, chillable reds, classics from the Loire and Beaujolais, Sicily, Austria and Chile, with facts on producer and grape and common questions.",
    sv: "Rött naturvin på Systembolaget enligt PACT: lätta och kylbara röda, klassiker från Loire och Beaujolais, Sicilien, Österrike och Chile, med fakta om producent och druva och vanliga frågor.",
  },
  h1: {
    en: "Red natural wine at Systembolaget",
    sv: "Rött naturvin på Systembolaget",
  },
  lede: {
    en: "Looking for red natural wine at Systembolaget? Here is our selection of red wines from growers who work organically or biodynamically and with low intervention in the cellar, from the Loire, Beaujolais, Sicily, Austria, Spain and Chile. The list follows Systembolaget's range and is updated when it changes. The prices on the cards are Systembolaget's own.",
    sv: "Letar du efter rött naturvin på Systembolaget? Här är vårt urval av röda viner från odlare som arbetar ekologiskt eller biodynamiskt och med låg intervention i källaren, från Loire, Beaujolais, Sicilien, Österrike, Spanien och Chile. Listan följer Systembolagets sortiment och uppdateras när det ändras. Priserna på korten är Systembolagets egna.",
  },
  breadcrumbShort: {
    en: "Red natural wine at Systembolaget",
    sv: "Rött naturvin på Systembolaget",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Red natural wine at Systembolaget",
      sv: "Rött naturvin på Systembolaget",
    },
    description: {
      en: "Our selection of red natural wines at Systembolaget — light chillable reds, Loire, Beaujolais, Sicily and Austria.",
      sv: "Vårt urval av röda naturviner på Systembolaget — lätta kylbara röda, Loire, Beaujolais, Sicilien och Österrike.",
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
        en: "Our selection at a glance",
        sv: "Vårt urval i korthet",
      },
      body: EMPTY,
      blocks: [
        {
          type: "list",
          items: {
            en: [
              "**Light reds to serve chilled:** Lamoresca Nerocapitano (Frappato, Sicily), Martin Gojer Campill (Vernatsch, South Tyrol), Pino Román Tinto País (Chile).",
              "**Classics of the natural wine movement:** Catherine & Pierre Breton Trinch (Bourgueil), Sandrine Henriot Morgon Vagabond (Beaujolais), Éric Texier Chat Fou (Rhône).",
              "**Sicily:** Arianna Occhipinti Siccagno and Frappato, Frank Cornelissen Susucaru Rosso (Etna).",
              "**Austria:** Gut Oggau Josephine, Rennersistas Superglitzer, Heinrich Pinot Noir.",
              "**In the permanent range:** Werner Michlits's family domaine in Burgenland.",
            ],
            sv: [
              "**Lätta röda att servera svala:** Lamoresca Nerocapitano (Frappato, Sicilien), Martin Gojer Campill (Vernatsch, Sydtyrolen), Pino Román Tinto País (Chile).",
              "**Klassiker från naturvinsrörelsen:** Catherine & Pierre Breton Trinch (Bourgueil), Sandrine Henriot Morgon Vagabond (Beaujolais), Éric Texier Chat Fou (Rhône).",
              "**Sicilien:** Arianna Occhipinti Siccagno och Frappato, Frank Cornelissen Susucaru Rosso (Etna).",
              "**Österrike:** Gut Oggau Josephine, Rennersistas Superglitzer, Heinrich Pinot Noir.",
              "**Finns i fasta sortimentet:** Werner Michlits familjedomän i Burgenland.",
            ],
          },
        },
      ],
    },
    {
      heading: {
        en: "How we chose",
        sv: "Så har vi valt",
      },
      body: EMPTY,
      blocks: [
        {
          type: "list",
          items: {
            en: [
              "**The producer:** growers with a history of their own, not trading brands. Several appear on our list of [the world's best natural wine producers](/guides/worlds-best-natural-wine-producers).",
              "**Farming and cellar:** organic or biodynamic farming, wild fermentation and little or no added sulphur where we can substantiate it.",
              "**Range:** light, chillable reds as well as more structured wines for food.",
              "**Availability:** the wine should be in Systembolaget's range (permanent, temporary or special-order).",
            ],
            sv: [
              "**Producenten:** odlare med egen historia, inte handelsvarumärken. Flera finns på vår lista över [världens bästa naturvinsproducenter](/guider/varldens-basta-naturvinsproducenter).",
              "**Odlingen och källaren:** ekologisk eller biodynamisk odling, spontanjäsning och lite eller inget tillsatt svavel där vi kan belägga det.",
              "**Bredd:** lätta och kylbara röda såväl som mer strukturerade viner till mat.",
              "**Tillgänglighet:** vinet ska finnas i Systembolagets sortiment (fast, tillfälligt eller beställningsvara).",
            ],
          },
        },
        {
          type: "paragraphs",
          body: {
            en: [
              "Not every wine on the list is documented as natural wine. Where we can substantiate the producer's methods we say so, and where a fact comes from an importer or Systembolaget we say so.",
            ],
            sv: [
              "Inte alla viner på listan är belagda som naturvin. Där vi kan belägga producentens arbetssätt skriver vi det, och där en uppgift kommer från importör eller Systembolaget anger vi det.",
            ],
          },
        },
      ],
    },
    {
      heading: {
        en: "What is red natural wine?",
        sv: "Vad är rött naturvin?",
      },
      body: {
        en: [
          "Red natural wine is red wine made with low intervention. The grapes are typically grown organically or biodynamically, fermentation uses the grapes' own yeast, and little or no sulphur is added in the cellar. There is no shared legal definition of natural wine in Sweden or the EU, so the word says more about the producer's methods than about a certification. Read more in [What is natural wine?](/guides/what-is-natural-wine)",
          "Many red natural wines are lighter in style than classic reds, with grapes such as gamay, frappato, país, vernatsch and pinot noir. Several benefit from being served a little cooler than room temperature. But there are also more structured wines, for example cabernet franc from the Loire or blaufränkisch from Burgenland.",
        ],
        sv: [
          "Rött naturvin är rött vin gjort med låg intervention. Druvorna odlas typiskt ekologiskt eller biodynamiskt, jäsningen sker med druvornas egen jäst och i källaren tillsätts lite eller inget svavel. Det finns ingen gemensam lagdefinition av naturvin i Sverige eller EU, så ordet säger mer om producentens arbetssätt än om en certifiering. Läs mer i [Vad är naturvin?](/guider/vad-ar-naturvin)",
          "Många röda naturviner är lättare i stilen än klassiska rödviner, med druvor som gamay, frappato, país, vernatsch och pinot noir. Flera gynnas av att serveras något svalare än rumstemperatur. Men det finns också mer strukturerade viner, till exempel cabernet franc från Loire eller blaufränkisch från Burgenland.",
        ],
      },
    },
    {
      heading: {
        en: "Red natural wine and food",
        sv: "Rött naturvin och mat",
      },
      body: EMPTY,
      blocks: [
        {
          type: "list",
          items: {
            en: [
              "**Light, chilled reds** (gamay, frappato, país): charcuterie, chicken, grilled vegetables and mushrooms.",
              "**More structured reds** (cabernet franc, blaufränkisch, nero d'avola): stews, lamb and dishes with herbs and pepper.",
              "**Litre bottles and lighter cuvées** are made to be drunk young, not for ageing.",
            ],
            sv: [
              "**Lätta, svala röda** (gamay, frappato, país): charkuterier, kyckling, grillade grönsaker och svamp.",
              "**Mer strukturerade röda** (cabernet franc, blaufränkisch, nero d'avola): grytor, lamm och rätter med örter och peppar.",
              "**Literflaskor och lättare cuvéer** är gjorda för att drickas unga, inte för att lagras.",
            ],
          },
        },
      ],
    },
  ],
  faqs: [
    {
      question: {
        en: "What is the best red natural wine at Systembolaget?",
        sv: "Vilket är det bästa röda naturvinet på Systembolaget?",
      },
      answer: {
        en: "It depends on style. Breton Trinch and Henriot Morgon Vagabond are classics from the Loire and Beaujolais. Occhipinti and Cornelissen show what Sicily can do. If you want something light and chilled, Lamoresca Nerocapitano is a good choice.",
        sv: "Det beror på stil. Breton Trinch och Henriot Morgon Vagabond är klassiker från Loire och Beaujolais. Occhipinti och Cornelissen visar vad Sicilien kan. Vill du ha något lätt och svalt är Lamoresca Nerocapitano ett bra val.",
      },
    },
    {
      question: {
        en: "Is organic red wine the same as natural wine?",
        sv: "Är ekologiskt rött vin samma sak som naturvin?",
      },
      answer: {
        en: "No. Organic refers to the farming. Natural wine is also about how the wine is made in the cellar: wild fermentation, few or no additives, and little or no sulphur. An organic wine can be made entirely conventionally.",
        sv: "Nej. Ekologiskt gäller odlingen. Naturvin handlar också om hur vinet görs i källaren: spontanjäsning, få eller inga tillsatser och lite eller inget svavel. Ett ekologiskt vin kan vara gjort helt konventionellt.",
      },
    },
    {
      question: {
        en: "Should red natural wine be served chilled?",
        sv: "Ska rött naturvin serveras kylt?",
      },
      answer: {
        en: "Many light red natural wines taste best a little cooler than room temperature. Systembolaget, for example, recommends around 16°C for Pino Román Tinto País.",
        sv: "Många lätta röda naturviner smakar bäst lite svalare än rumstemperatur. Systembolaget rekommenderar till exempel cirka 16 grader för Pino Román Tinto País.",
      },
    },
    {
      question: {
        en: "Is there red natural wine in Systembolaget's permanent range?",
        sv: "Finns rött naturvin i Systembolagets fasta sortiment?",
      },
      answer: {
        en: "Yes, but most wines on the list are temporary or special-order items. Werner Michlits's family domaine in Burgenland is in the permanent range.",
        sv: "Ja, men de flesta viner på listan är tillfälligt sortiment eller beställningsvaror. Werner Michlits familjedomän i Burgenland finns i det fasta sortimentet.",
      },
    },
    {
      question: {
        en: 'Do you run scored tastings or "best in test" reviews?',
        sv: 'Gör ni tester med poäng, "bäst i test"?',
      },
      answer: {
        en: "No. The list is our editorial judgement based on producer, method and range.",
        sv: "Nej. Listan är vår redaktionella bedömning utifrån producent, metod och bredd.",
      },
    },
    {
      question: {
        en: "How long does an opened red natural wine last?",
        sv: "Hur länge håller ett öppnat rött naturvin?",
      },
      answer: {
        en: "It varies. With a cork in the fridge, most last a few days. Wine with little sulphur can change more quickly.",
        sv: "Det varierar. Med kork i kylskåp brukar de flesta hålla några dagar. Vin med lite svavel kan förändras snabbare.",
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
        en: "Best orange natural wines at Systembolaget →",
        sv: "Bästa orange naturviner på Systembolaget →",
      },
      href: {
        en: "/guides/best-orange-natural-wines-systembolaget",
        sv: "/guider/basta-orange-naturviner-systembolaget",
      },
    },
    {
      label: {
        en: "Swedish version: Rött naturvin på Systembolaget →",
        sv: "Engelsk version: Red natural wine at Systembolaget →",
      },
      href: {
        en: "/guider/basta-roda-naturviner-systembolaget",
        sv: "/guides/best-red-natural-wines-systembolaget",
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
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Natural wine",
  },
};
