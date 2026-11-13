import {
  ARTICLE_GUIDE_EDITORIAL_H2_CLASS,
  ARTICLE_GUIDE_WINE_H3_FIXED_CLASS,
} from "@/lib/guides/article-guide-shell";
import type { GuideArticleContent } from "@/lib/guides/guide-types";

const EMPTY = { en: [] as string[], sv: [] as string[] };

const SLUG = {
  en: "best-white-natural-wines-systembolaget",
  sv: "basta-vita-naturviner-systembolaget",
} as const;

const AUTHOR = {
  name: "Axel Samuelson",
  jobTitle: "Grundare av PACT",
  byline: {
    en: "By Axel Samuelson, founder of PACT · Last reviewed: 2026-11-10",
    sv: "Av Axel Samuelson, grundare av PACT · Senast granskad: 2026-11-10",
  },
} as const;

/**
 * Shared slug/meta for the white Systembolaget guide pair.
 * English URL keeps this object on the ranked-list renderer. The Swedish
 * page uses `bestWhiteNaturalWinesSystembolagetSvArticle` on the same renderer.
 */
export const bestWhiteNaturalWinesSystembolagetArticle: GuideArticleContent = {
  updated: "2026-11-10",
  slug: SLUG,
  title: {
    en: "White natural wine at Systembolaget 2026: the best",
    sv: "Vitt naturvin på Systembolaget 2026: vårt urval | PACT Wines",
  },
  meta: {
    en: "White natural wine at Systembolaget: an independent shortlist of white natural wines, biodynamic, organic and low-intervention.",
    sv: "Vitt naturvin på Systembolaget enligt PACT: chenin blanc från Loire, grüner veltliner från Österrike, riesling, Tjeckien, Portugal och Sydafrika, med fakta om producent och druva och vanliga frågor.",
  },
  h1: {
    en: "Best white natural wines at Systembolaget 2026",
    sv: "Vitt naturvin på Systembolaget",
  },
  lede: {
    en: "Here is white natural wine at Systembolaget in one list: white natural wines from growers who farm with conviction (biodynamic, organic and low-intervention) that you can actually buy right now. The list is independent: PACT does not sell at Systembolaget and earns nothing from what you choose.",
    sv: "Letar du efter vitt naturvin på Systembolaget? Här är vårt urval av vita viner från odlare som arbetar ekologiskt eller biodynamiskt och med låg intervention i källaren, från Loire, Alsace, Österrike, Tyskland, Italien, Spanien, Portugal, Tjeckien och Sydafrika. Listan följer Systembolagets sortiment och uppdateras när det ändras. Priserna på korten är Systembolagets egna.",
  },
  breadcrumbShort: {
    en: "Best white natural wines at Systembolaget 2026",
    sv: "Vitt naturvin på Systembolaget",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Best white natural wines at Systembolaget 2026",
      sv: "Vitt naturvin på Systembolaget",
    },
    description: {
      en: "An independent shortlist of white wines at Systembolaget from biodynamic, organic and low-intervention growers.",
      sv: "Vårt urval av vita naturviner på Systembolaget — chenin, grüner veltliner, riesling och mer.",
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
          "Most Systembolaget \"natural wine\" lists are written by importers or shops that profit from what you buy. We don't — PACT imports from Languedoc and is not sold at Systembolaget. No affiliate links.",
          "This white-wine list is deliberately broader than our red and orange Systembolaget guides. We include biodynamic, organic and serious low-intervention growers — not only bottles that market themselves as strict natural wine. Demeter-certified domaines that never use the word \"natural\" still belong here when the farming and cellar work hold up. What we exclude is conventional farming that treats pesticides and synthetic fertiliser as the default — not the absence of a natural-wine label. Updated against live assortment data.",
        ],
        sv: [
          "De flesta listor över \"naturvin\" på Systembolaget görs av importörer eller butiker som tjänar på vad du köper. Vi gör inte det — PACT säljer från Languedoc och finns inte på Systembolaget. Inga provisionslänkar.",
          "Den här vitvinslistan är medvetet bredare än våra röda och orange Systembolaget-guider. Vi inkluderar biodynamiska, ekologiska och seriösa låginterventionsodlare — inte bara flaskor som marknadsförs som strikt naturvin. Demeter-certifierade domäner som aldrig använder ordet \"naturvin\" hör ändå hemma här när odling och källararbete håller. Det vi utesluter är konventionell odling där bekämpningsmedel och konstgödsel är standard — inte avsaknaden av en naturvinsetikett. Listan filtreras mot live sortimentsdata.",
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
          "Industrial white-wine lines dressed up as organic, anonymous trading brands, and conventional farming with routine pesticides and synthetic fertiliser stay off this list — even when Systembolaget's filters surface them. A certificate on the shelf is not enough if the producer has no verifiable farming practice and cellar discipline. Choose one of the wines above instead.",
        ],
        sv: [
          "Industriella vitvinslinjer som packats om till ekologisk, anonyma handelsmärken och konventionell odling med rutinmässiga bekämpningsmedel och konstgödsel hålls utanför den här listan — även när Systembolagets filter lyfter fram dem. Ett certifikat i hyllan räcker inte om producenten saknar verifierbar odlingspraxis och källardisciplin. Välj ett av vinerna ovan istället.",
        ],
      },
    },
  ],
  faqs: [
    {
      question: {
        en: "Why are the criteria broader here than on your red and orange lists?",
        sv: "Varför är kriterierna bredare här än på era röda och orange listor?",
      },
      answer: {
        en: "Because strong white bottles at Systembolaget often come from biodynamic or organic domaines that do not brand themselves as strict natural wine. We still require serious farming and low-intervention cellar work — we just do not require the \"natural wine\" label. That is why Demeter growers can appear here even when they never use that word.",
        sv: "För att starka vita flaskor på Systembolaget ofta kommer från biodynamiska eller ekologiska domäner som inte marknadsför sig som strikt naturvin. Vi kräver fortfarande seriös odling och lågintervention i källaren — vi kräver bara inte etiketten \"naturvin\". Därför kan Demeter-odlare synas här även när de aldrig använder det ordet.",
      },
    },
    {
      question: {
        en: "Is this the same thing as natural wine?",
        sv: "Är detta samma sak som naturvin?",
      },
      answer: {
        en: "Not always. Natural wine usually implies organic or biodynamic farming plus minimal cellar intervention and little or no added sulphur. This list overlaps heavily with that — but it also includes growers who meet the farming and intervention bar without claiming the natural-wine category. Conventional farming remains out.",
        sv: "Inte alltid. Naturvin innebär vanligtvis ekologisk eller biodynamisk odling plus minimal källarintervention och lite eller inget tillsatt svavel. Den här listan överlappar starkt med det — men den inkluderar också odlare som klarar odlings- och interventionsribban utan att kalla sig naturvin. Konventionell odling hålls utanför.",
      },
    },
    {
      question: {
        en: "What is the difference between fixed assortment and order assortment?",
        sv: "Vad är skillnaden mellan fast sortiment och ordervara?",
      },
      answer: {
        en: "Fixed assortment is stocked in stores. Order assortment (ordervara) and temporary listings can be ordered online or via the store — often where the most interesting low-intervention whites sit. Many bottles on this list are order or temporary assortment.",
        sv: "Fast sortiment finns i butik. Ordervara och tillfälligt sortiment beställs online eller via butiken — ofta där de mest intressanta låginterventionsvita ligger. Många flaskor på den här listan är ordervara eller tillfälligt sortiment.",
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
        en: "Explore our own selection of white natural wine →",
        sv: "Utforska vårt eget sortiment av vitt naturvin →",
      },
      href: {
        en: "/wine/white-natural-wine",
        sv: "/vin/vitt-naturvin",
      },
    },
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Natural wine",
  },
};

/**
 * Swedish editorial rewrite of /guider/basta-vita-naturviner-systembolaget
 * (draft 2026-11-10). Keeps the same slug/hreflang pair as the English
 * ranked list at /guides/best-white-natural-wines-systembolaget.
 */
export const bestWhiteNaturalWinesSystembolagetSvArticle: GuideArticleContent =
  {
    updated: "2026-11-10",
    slug: SLUG,
    title: {
      en: "White natural wine at Systembolaget 2026: the best",
      sv: "Vitt naturvin på Systembolaget 2026: vårt urval | PACT Wines",
    },
    meta: {
      en: "White natural wine at Systembolaget according to PACT: chenin blanc from the Loire, grüner veltliner from Austria, riesling, Czechia, Portugal and South Africa, with producer and grape facts and FAQs.",
      sv: "Vitt naturvin på Systembolaget enligt PACT: chenin blanc från Loire, grüner veltliner från Österrike, riesling, Tjeckien, Portugal och Sydafrika, med fakta om producent och druva och vanliga frågor.",
    },
    h1: {
      en: "Best white natural wines at Systembolaget 2026",
      sv: "Vitt naturvin på Systembolaget",
    },
    lede: {
      en: "Looking for white natural wine at Systembolaget? Here is our selection of white wines from growers who farm organically or biodynamically with low intervention in the cellar.",
      sv: "Letar du efter vitt naturvin på Systembolaget? Här är vårt urval av vita viner från odlare som arbetar ekologiskt eller biodynamiskt och med låg intervention i källaren, från Loire, Alsace, Österrike, Tyskland, Italien, Spanien, Portugal, Tjeckien och Sydafrika. Listan följer Systembolagets sortiment och uppdateras när det ändras. Priserna på korten är Systembolagets egna.",
    },
    breadcrumbShort: {
      en: "Best white natural wines at Systembolaget",
      sv: "Vitt naturvin på Systembolaget",
    },
    furtherReadingHeading: {
      en: "Further reading",
      sv: "Vidare läsning",
    },
    hubCard: {
      title: {
        en: "Best white natural wines at Systembolaget 2026",
        sv: "Vitt naturvin på Systembolaget",
      },
      description: {
        en: "Our selection of white natural wines at Systembolaget — chenin, grüner veltliner, riesling and more.",
        sv: "Vårt urval av vita naturviner på Systembolaget — chenin, grüner veltliner, riesling och mer.",
      },
    },
    author: AUTHOR,
    shopCta: null,
    showRankedWineFacts: true,
    neutralizeRankedEditorialNotes: true,
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
                "**Chenin blanc from the Loire:** Domaine Huet Le Mont Demi-Sec (Vouvray, off-dry), François Chidaine Les Tuffeaux (Montlouis), Domaine Laureau Le Bel Ouvrage and Nicolas Joly Les Vieux Clos (Savennières), Coulée de Serrant, Terre de l'Élu Bastingage (Anjou).",
                "**Grüner veltliner from Austria:** Meinklang Naken (no added sulphur), Nikolaihof Hefeabzug (Wachau), Arndorfer Grüner Veltliner (Kamptal, litre bottle).",
                "**Riesling:** Peter Jakob Kühn Quarz & Schiefer (Rheingau) and Ostertag Fronholz (Alsace).",
                "**Outside the classic regions:** Testalonga Baby Bandito (Swartland, no added sulphur), Milan Nestarec TRBLMKR (Moravia), Márcio Lopes O Caminho (Vinho Verde), L'Archetipo Sette Lune (Apulia), Frontonio Microcosmico Macabeo (Aragon).",
                "**In the fixed assortment:** Vacheron Sancerre Les Roches, Meinklang Naken and Arndorfer Grüner Veltliner.",
              ],
              sv: [
                "**Chenin blanc från Loire:** Domaine Huet Le Mont Demi-Sec (Vouvray, halvtorr), François Chidaine Les Tuffeaux (Montlouis), Domaine Laureau Le Bel Ouvrage och Nicolas Joly Les Vieux Clos (Savennières), Coulée de Serrant, Terre de l'Élu Bastingage (Anjou).",
                "**Grüner veltliner från Österrike:** Meinklang Naken (utan tillsatt svavel), Nikolaihof Hefeabzug (Wachau), Arndorfer Grüner Veltliner (Kamptal, literflaska).",
                "**Riesling:** Peter Jakob Kühn Quarz & Schiefer (Rheingau) och Ostertag Fronholz (Alsace).",
                "**Utanför de klassiska regionerna:** Testalonga Baby Bandito (Swartland, utan tillsatt svavel), Milan Nestarec TRBLMKR (Moravien), Márcio Lopes O Caminho (Vinho Verde), L'Archetipo Sette Lune (Apulien), Frontonio Microcosmico Macabeo (Aragonien).",
                "**Finns i fasta sortimentet:** Vacheron Sancerre Les Roches, Meinklang Naken och Arndorfer Grüner Veltliner.",
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
                "**Farming and cellar:** organic or biodynamic farming, spontaneous fermentation and little or no added sulphur where we can document it. Several producers are Demeter- or Biodyvin-certified.",
                "**Breadth:** fresh and light wines as well as more concentrated wines for food, and both dry and off-dry.",
                "**Availability:** the wine must be in Systembolaget's assortment (fixed, temporary or order assortment).",
              ],
              sv: [
                "**Producenten:** odlare med egen historia, inte handelsvarumärken. Flera finns på vår lista över [världens bästa naturvinsproducenter](/guider/varldens-basta-naturvinsproducenter).",
                "**Odlingen och källaren:** ekologisk eller biodynamisk odling, spontanjäsning och lite eller inget tillsatt svavel där vi kan belägga det. Flera producenter är Demeter- eller Biodyvin-certifierade.",
                "**Bredd:** friska och lätta viner såväl som mer koncentrerade viner till mat, och både torra och halvtorra.",
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
          en: "What is white natural wine?",
          sv: "Vad är vitt naturvin?",
        },
        body: {
          en: [
            "White natural wine is white wine made with low intervention. The grapes are typically farmed organically or biodynamically, fermentation uses the grapes' own yeast and little or no sulphur is added in the cellar. There is no shared legal definition of natural wine in Sweden or the EU, so the word says more about the producer's approach than about a certification. Read more in [What is natural wine?](/guides/what-is-natural-wine)",
            "White natural wine is usually made like ordinary white wine: the grapes are pressed and the must ferments without skins. If the skins stay during fermentation it becomes orange wine instead, which we collect in a separate guide: [orange natural wine at Systembolaget](/guides/best-orange-natural-wines-systembolaget). White natural wine can be a little cloudy because it is often neither filtered nor fined hard.",
          ],
          sv: [
            "Vitt naturvin är vitt vin gjort med låg intervention. Druvorna odlas typiskt ekologiskt eller biodynamiskt, jäsningen sker med druvornas egen jäst och i källaren tillsätts lite eller inget svavel. Det finns ingen gemensam lagdefinition av naturvin i Sverige eller EU, så ordet säger mer om producentens arbetssätt än om en certifiering. Läs mer i [Vad är naturvin?](/guider/vad-ar-naturvin)",
            "Vitt naturvin görs oftast som vanligt vitt vin: druvorna pressas och musten jäser utan skal. Får skalen ligga med under jäsningen blir det i stället orange vin, som vi samlar i en egen guide: [orange naturvin på Systembolaget](/guider/basta-orange-naturviner-systembolaget). Vitt naturvin kan vara något grumligt eftersom det ofta varken filtreras eller klarnas hårt.",
          ],
        },
      },
      {
        heading: {
          en: "Demeter and Biodyvin",
          sv: "Demeter och Biodyvin",
        },
        body: {
          en: [
            "Demeter and Biodyvin are certifications for biodynamic farming. On the list Meinklang and Nikolaihof are Demeter-certified (Nikolaihof since 1971, Austria's first), and François Chidaine is certified through Biodyvin. Biodynamic farming says something about the vineyard, but not automatically how the wine is made in the cellar. Read more in [Biodynamic wine](/wine/biodynamic-wine).",
          ],
          sv: [
            "Demeter och Biodyvin är certifieringar för biodynamisk odling. På listan är Meinklang och Nikolaihof Demeter-certifierade (Nikolaihof sedan 1971, som Österrikes första), och François Chidaine är certifierad genom Biodyvin. Biodynamisk odling säger något om vingården, men inte automatiskt hur vinet görs i källaren. Läs mer i [Biodynamiskt vin](/vin/biodynamiskt-vin).",
          ],
        },
      },
      {
        heading: {
          en: "White natural wine and food",
          sv: "Vitt naturvin och mat",
        },
        body: EMPTY,
        blocks: [
          {
            type: "list",
            items: {
              en: [
                "**Fresh, light wines** (grüner veltliner, alvarinho, macabeo): shellfish, fish, salads and vegetable dishes.",
                "**Chenin blanc and riesling:** fish in sauce, poultry, mushrooms and milder cheeses. Off-dry chenin also suits spicier food.",
                "**Litre bottles and lighter cuvées** are made to drink young, not to age.",
              ],
              sv: [
                "**Friska, lätta viner** (grüner veltliner, alvarinho, macabeo): skaldjur, fisk, sallader och grönsaksrätter.",
                "**Chenin blanc och riesling:** fisk i sås, fågel, svamp och mildare ostar. Halvtorr chenin passar även till kryddigare mat.",
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
          en: "What is the best white natural wine at Systembolaget?",
          sv: "Vilket är det bästa vita naturvinet på Systembolaget?",
        },
        answer: {
          en: "It depends on style. Chenin blanc from the Loire, for example Chidaine Les Tuffeaux or Laureau Le Bel Ouvrage, are classics. For something fresh and light, Meinklang Naken or Arndorfer's grüner veltliner are good choices.",
          sv: "Det beror på stil. Chenin blanc från Loire, till exempel Chidaine Les Tuffeaux eller Laureau Le Bel Ouvrage, är klassiker. Vill du ha något friskt och lätt är Meinklang Naken eller Arndorfers grüner veltliner bra val.",
        },
      },
      {
        question: {
          en: "Is organic white wine the same as natural wine?",
          sv: "Är ekologiskt vitt vin samma sak som naturvin?",
        },
        answer: {
          en: "No. Organic covers farming. Natural wine is also about how the wine is made in the cellar: spontaneous fermentation, few or no additives and little or no sulphur. An organic wine can still be made entirely conventionally in the cellar.",
          sv: "Nej. Ekologiskt gäller odlingen. Naturvin handlar också om hur vinet görs i källaren: spontanjäsning, få eller inga tillsatser och lite eller inget svavel. Ett ekologiskt vin kan vara gjort helt konventionellt.",
        },
      },
      {
        question: {
          en: "Is there white wine without added sulphur at Systembolaget?",
          sv: "Finns det vitt vin utan tillsatt svavel på Systembolaget?",
        },
        answer: {
          en: "Yes. On our list Meinklang Naken and Testalonga Baby Bandito are made without added sulphur. Wine still always contains a little sulphur formed naturally during fermentation.",
          sv: "Ja. På vår lista är Meinklang Naken och Testalonga Baby Bandito gjorda utan tillsatt svavel. Vin innehåller ändå alltid lite svavel som bildas naturligt under jäsningen.",
        },
      },
      {
        question: {
          en: "Is there white natural wine in Systembolaget's fixed assortment?",
          sv: "Finns vitt naturvin i Systembolagets fasta sortiment?",
        },
        answer: {
          en: "Yes, but most wines on the list are temporary range or order assortment. Vacheron Sancerre Les Roches, Meinklang Naken and Arndorfer Grüner Veltliner are in the fixed assortment.",
          sv: "Ja, men de flesta viner på listan är tillfälligt sortiment eller beställningsvaror. Vacheron Sancerre Les Roches, Meinklang Naken och Arndorfer Grüner Veltliner finns i det fasta sortimentet.",
        },
      },
      {
        question: {
          en: "What is the difference between white and orange natural wine?",
          sv: "Vad är skillnaden mellan vitt och orange naturvin?",
        },
        answer: {
          en: "White wine ferments without grape skins. Orange wine is made from white grapes that ferment with their skins, which gives colour and astringency.",
          sv: "Vitt vin jäser utan druvskal. Orange vin görs på vita druvor som får jäsa med skalen, vilket ger färg och strävhet.",
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
          sv: "Orange naturvin på Systembolaget →",
        },
        href: {
          en: "/guides/best-orange-natural-wines-systembolaget",
          sv: "/guider/basta-orange-naturviner-systembolaget",
        },
      },
      {
        label: {
          en: "Best white natural wines at Systembolaget →",
          sv: "Engelsk version: Best white natural wines at Systembolaget →",
        },
        href: {
          en: "/guides/best-white-natural-wines-systembolaget",
          sv: "/guides/best-white-natural-wines-systembolaget",
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
