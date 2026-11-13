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
 * Shared slug/meta for the red Systembolaget guide pair.
 * English URL keeps this object on the ranked-list renderer. The Swedish
 * page uses `bestRedNaturalWinesSystembolagetSvArticle` on the same renderer.
 */
export const bestRedNaturalWinesSystembolagetArticle: GuideArticleContent = {
  updated: "2026-11-09",
  slug: SLUG,
  title: {
    en: "Red natural wine at Systembolaget 2026: the best",
    sv: "Rött naturvin på Systembolaget 2026: vårt urval | PACT Wines",
  },
  meta: {
    en: "Independent guide to red natural wine at Systembolaget. Only producers with real low-intervention credibility.",
    sv: "Rött naturvin på Systembolaget enligt PACT: lätta och kylbara röda, klassiker från Loire och Beaujolais, Sicilien, Österrike och Chile, med fakta om producent och druva och vanliga frågor.",
  },
  h1: {
    en: "Best red natural wines at Systembolaget 2026",
    sv: "Rött naturvin på Systembolaget",
  },
  lede: {
    en: "Here is red natural wine at Systembolaget in one list: red natural wines you can actually buy right now. The list is independent: PACT does not sell at Systembolaget and earns nothing from what you choose.",
    sv: "Letar du efter rött naturvin på Systembolaget? Här är vårt urval av röda viner från odlare som arbetar ekologiskt eller biodynamiskt och med låg intervention i källaren, från Loire, Beaujolais, Sicilien, Österrike, Spanien och Chile. Listan följer Systembolagets sortiment och uppdateras när det ändras. Vi visar inga priser i vår text.",
  },
  breadcrumbShort: {
    en: "Best red natural wines at Systembolaget 2026",
    sv: "Rött naturvin på Systembolaget",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Best red natural wines at Systembolaget 2026",
      sv: "Rött naturvin på Systembolaget",
    },
    description: {
      en: "An independent shortlist of red natural wines at Systembolaget — Loire to Etna, Gredos to Burgenland.",
      sv: "Vårt urval av röda naturviner på Systembolaget — lätta kylbara röda, Loire, Beaujolais, Sicilien och Österrike.",
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
          "Most Systembolaget natural-wine lists are written by importers or shops that profit from what you buy. We don't — PACT imports from Languedoc and is not sold at Systembolaget. No affiliate links.",
          "A wine must have organic or biodynamic farming, spontaneous fermentation, minimal or no added sulphur (around 30 mg/l added), and a producer with a recognised reputation in the natural wine world — not just a certificate. Large anonymous producers launching a \"natural wine\" line are out. Updated against live assortment data.",
        ],
        sv: [
          "De flesta listor över naturvin på Systembolaget görs av importörer eller butiker som tjänar på vad du köper. Vi gör inte det — PACT säljer från Languedoc och finns inte på Systembolaget. Inga provisionslänkar.",
          "Ett vin måste ha ekologisk eller biodynamisk odling, spontanjäsning, minimal eller ingen tillsatt svavel (runt 30 mg/l tillsatt) och en producent med erkänt rykte i naturvinsvärlden — inte bara ett certifikat. Stora anonyma producenter med ett \"naturvin\"-segment diskas. Listan filtreras mot live sortimentsdata.",
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
          "Systembolaget's natural wine filter also includes wines we cannot recommend with the same conviction — especially large industrial producers launching a \"natural\" or organic line. Concrete examples we leave out: Jacob's Creek Organic Shiraz Cabernet, Santa Julia \"Natural\" Clarete, and Hands Off Garnatxa. Organic farming alone is not enough; if the producer lacks a recognised name and a verifiable history in natural wine, choose one of the wines above instead.",
        ],
        sv: [
          "Systembolagets naturvinsfilter inkluderar också viner vi inte kan rekommendera med samma övertygelse — särskilt stora industriella producenter som lanserar en \"naturvin\"- eller ekolinje. Konkreta exempel vi lämnar utanför: Jacob's Creek Organic Shiraz Cabernet, Santa Julia \"Natural\" Clarete och Hands Off Garnatxa. Ekologisk odling räcker inte; saknar producenten ett erkänt namn och verifierbar historia i naturvinsvärlden, välj ett av vinerna ovan istället.",
        ],
      },
    },
  ],
  faqs: [
    {
      question: {
        en: "Is everything in Systembolaget's natural wine filter worth buying?",
        sv: "Är allt i Systembolagets naturvinsfilter värt att köpa?",
      },
      answer: {
        en: "No. The filter mixes serious low-intervention domaines with large industrial brands that launch an organic or \"natural\" line. We only list producers with a recognised reputation in natural wine — and we name examples we leave out.",
        sv: "Nej. Filtret blandar seriösa låginterventionsdomäner med stora industriella varumärken som lanserar en ekologisk eller \"naturvin\"-linje. Vi listar bara producenter med erkänt rykte i naturvinsvärlden — och vi namnger exempel vi lämnar utanför.",
      },
    },
    {
      question: {
        en: "How do you choose the wines on this list?",
        sv: "Hur väljer ni vinerna på listan?",
      },
      answer: {
        en: "Organic or biodynamic farming, spontaneous fermentation, minimal or no added sulphur, and a producer with a verifiable history in natural wine. The list is checked against live Systembolaget assortment data. PACT does not sell at Systembolaget and has no affiliate links.",
        sv: "Ekologisk eller biodynamisk odling, spontanjäsning, minimal eller ingen tillsatt svavel, och en producent med verifierbar historia i naturvinsvärlden. Listan kontrolleras mot live sortimentsdata från Systembolaget. PACT säljer inte på Systembolaget och har inga provisionslänkar.",
      },
    },
    {
      question: {
        en: "What is the difference between fixed assortment and order assortment?",
        sv: "Vad är skillnaden mellan fast sortiment och ordervara?",
      },
      answer: {
        en: "Fixed assortment is stocked in stores. Order assortment (ordervara) and temporary listings can be ordered online or via the store — often where the most interesting natural wines sit. Many bottles on this list are order or temporary assortment.",
        sv: "Fast sortiment finns i butik. Ordervara och tillfälligt sortiment beställs online eller via butiken — ofta där de mest intressanta naturvinerna ligger. Många flaskor på den här listan är ordervara eller tillfälligt sortiment.",
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
        en: "The world's 100 best natural wine producers →",
        sv: "Världens 100 bästa naturvinsproducenter →",
      },
      href: {
        en: "/guides/worlds-best-natural-wine-producers",
        sv: "/guider/varldens-basta-naturvinsproducenter",
      },
    },
    {
      label: {
        en: "Natural wine from Languedoc →",
        sv: "Naturvin från Languedoc →",
      },
      href: {
        en: "/guides/languedoc-natural-wine",
        sv: "/guider/naturvin-languedoc",
      },
    },
    {
      label: {
        en: "Explore our own selection of red natural wine →",
        sv: "Utforska vårt eget sortiment av rött naturvin →",
      },
      href: {
        en: "/wine/red-natural-wine",
        sv: "/vin/rott-naturvin",
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
    en: "Red natural wine at Systembolaget 2026: the best",
    sv: "Rött naturvin på Systembolaget 2026: vårt urval | PACT Wines",
  },
  meta: {
    en: "Independent guide to red natural wine at Systembolaget. Only producers with real low-intervention credibility.",
    sv: "Rött naturvin på Systembolaget enligt PACT: lätta och kylbara röda, klassiker från Loire och Beaujolais, Sicilien, Österrike och Chile, med fakta om producent och druva och vanliga frågor.",
  },
  h1: {
    en: "Best red natural wines at Systembolaget 2026",
    sv: "Rött naturvin på Systembolaget",
  },
  lede: {
    en: "Looking for red natural wine at Systembolaget? Here is our selection of red wines from growers who farm organically or biodynamically with low intervention in the cellar.",
    sv: "Letar du efter rött naturvin på Systembolaget? Här är vårt urval av röda viner från odlare som arbetar ekologiskt eller biodynamiskt och med låg intervention i källaren, från Loire, Beaujolais, Sicilien, Österrike, Spanien och Chile. Listan följer Systembolagets sortiment och uppdateras när det ändras. Vi visar inga priser i vår text.",
  },
  breadcrumbShort: {
    en: "Best red natural wines at Systembolaget",
    sv: "Rött naturvin på Systembolaget",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Best red natural wines at Systembolaget 2026",
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
        en: "Our shortlist",
        sv: "Vårt urval i korthet",
      },
      body: EMPTY,
      blocks: [
        {
          type: "list",
          items: {
            en: [
              "**Light reds to serve cool:** Lamoresca Nerocapitano (Frappato, Sicily), Martin Gojer Campill (Vernatsch, South Tyrol), Pino Román Tinto País (Chile).",
              "**Classics of the natural-wine movement:** Catherine & Pierre Breton Trinch (Bourgueil), Sandrine Henriot Morgon Vagabond (Beaujolais), Éric Texier Chat Fou (Rhône).",
              "**Sicily:** Arianna Occhipinti Siccagno and Frappato, Frank Cornelissen Susucaru Rosso (Etna).",
              "**Austria:** Gut Oggau Josephine, Rennersistas Superglitzer, Heinrich Pinot Noir.",
              "**In the fixed assortment:** Werner Michlits family domaine in Burgenland.",
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
        en: "How we choose",
        sv: "Så har vi valt",
      },
      body: EMPTY,
      blocks: [
        {
          type: "list",
          items: {
            en: [
              "**The producer:** growers with their own story, not trading brands. Several appear on our list of [the world's best natural wine producers](/guides/worlds-best-natural-wine-producers).",
              "**Farming and cellar:** organic or biodynamic farming, spontaneous fermentation and little or no added sulphur where we can document it.",
              "**Breadth:** light chillable reds as well as more structured wines for food.",
              "**Availability:** the wine must be in Systembolaget's assortment (fixed, temporary or order assortment).",
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
              "Not every wine on the list is documented as natural wine. Where we can document the producer's approach we say so, and where a detail comes from an importer or Systembolaget we say so.",
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
          "Red natural wine is red wine made with low intervention. The grapes are typically farmed organically or biodynamically, fermentation uses the grapes' own yeast and little or no sulphur is added in the cellar. There is no shared legal definition of natural wine in Sweden or the EU, so the word says more about the producer's approach than about a certification. Read more in [What is natural wine?](/guides/what-is-natural-wine)",
          "Many red natural wines are lighter in style than classic reds, with grapes such as gamay, frappato, país, vernatsch and pinot noir. Several benefit from being served a little cooler than room temperature. There are also more structured wines, for example cabernet franc from the Loire or blaufränkisch from Burgenland.",
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
              "**Light, cool reds** (gamay, frappato, país): charcuterie, chicken, grilled vegetables and mushrooms.",
              "**More structured reds** (cabernet franc, blaufränkisch, nero d'avola): stews, lamb and dishes with herbs and pepper.",
              "**Litre bottles and lighter cuvées** are made to drink young, not to age.",
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
        en: "It depends on style. Breton Trinch and Henriot Morgon Vagabond are classics from the Loire and Beaujolais. Occhipinti and Cornelissen show what Sicily can do. For something light and cool, Lamoresca Nerocapitano is a good choice.",
        sv: "Det beror på stil. Breton Trinch och Henriot Morgon Vagabond är klassiker från Loire och Beaujolais. Occhipinti och Cornelissen visar vad Sicilien kan. Vill du ha något lätt och svalt är Lamoresca Nerocapitano ett bra val.",
      },
    },
    {
      question: {
        en: "Is organic red wine the same as natural wine?",
        sv: "Är ekologiskt rött vin samma sak som naturvin?",
      },
      answer: {
        en: "No. Organic covers farming. Natural wine is also about how the wine is made in the cellar: spontaneous fermentation, few or no additives and little or no sulphur. An organic wine can still be made entirely conventionally in the cellar.",
        sv: "Nej. Ekologiskt gäller odlingen. Naturvin handlar också om hur vinet görs i källaren: spontanjäsning, få eller inga tillsatser och lite eller inget svavel. Ett ekologiskt vin kan vara gjort helt konventionellt.",
      },
    },
    {
      question: {
        en: "Should red natural wine be served chilled?",
        sv: "Ska rött naturvin serveras kylt?",
      },
      answer: {
        en: "Many light red natural wines taste best a little cooler than room temperature. Systembolaget recommends around 16 degrees for Pino Román Tinto País, for example.",
        sv: "Många lätta röda naturviner smakar bäst lite svalare än rumstemperatur. Systembolaget rekommenderar till exempel cirka 16 grader för Pino Román Tinto País.",
      },
    },
    {
      question: {
        en: "Is there red natural wine in Systembolaget's fixed assortment?",
        sv: "Finns rött naturvin i Systembolagets fasta sortiment?",
      },
      answer: {
        en: "Yes, but most wines on the list are temporary range or order assortment. Werner Michlits' family domaine in Burgenland is in the fixed assortment.",
        sv: "Ja, men de flesta viner på listan är tillfälligt sortiment eller beställningsvaror. Werner Michlits familjedomän i Burgenland finns i det fasta sortimentet.",
      },
    },
    {
      question: {
        en: 'Do you run scored tests, "best in test"?',
        sv: 'Gör ni tester med poäng, "bäst i test"?',
      },
      answer: {
        en: "No. The list is our editorial judgement based on producer, method and breadth.",
        sv: "Nej. Listan är vår redaktionella bedömning utifrån producent, metod och bredd.",
      },
    },
    {
      question: {
        en: "How long does an opened red natural wine keep?",
        sv: "Hur länge håller ett öppnat rött naturvin?",
      },
      answer: {
        en: "It varies. With a cork in the fridge most keep a few days. Wine with little sulphur can change faster.",
        sv: "Det varierar. Med kork i kylskåp brukar de flesta hålla några dagar. Vin med lite svavel kan förändras snabbare.",
      },
    },
  ],
  internalLinks: [
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
        en: "Best red natural wines at Systembolaget →",
        sv: "Engelsk version: Best red natural wines at Systembolaget →",
      },
      href: {
        en: "/guides/best-red-natural-wines-systembolaget",
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
