/** Bilingual sublist guide: orange wines from TOP_100_WINES. */

export const WORLDS_BEST_ORANGE_WINES_PATHS = {
  en: "/guides/worlds-best-orange-wines",
  sv: "/guider/varldens-basta-orange-viner",
} as const;

/** @deprecated Use WORLDS_BEST_ORANGE_WINES_PATHS.en */
export const WORLDS_BEST_ORANGE_WINES_PATH =
  WORLDS_BEST_ORANGE_WINES_PATHS.en;

/** English blurbs for the 11 orange wines, keyed by TOP_100_WINES.rank. */
export const ORANGE_WINE_EN_BLURBS: Record<
  number,
  { origin: string; body: string }
> = {
  3: {
    origin: "Oslavia, Collio, Friuli, Italy · Ribolla Gialla",
    body: "After hail destroyed most of his 1996 crop, Joško Gravner left the surviving Ribolla on its skins. In 2000 he travelled to Georgia, and since the 2001 vintage his whites have fermented in qvevri buried in the cellar. The Ribolla spends around six months on the skins, then about six years in large oak before release. It became the reference point for orange wine outside Georgia: amber, firm and savory, with notes of dried fruit and tea. Read more in [Joško Gravner](/guides/josko-gravner).",
  },
  6: {
    origin: "Tibaani, near Sighnaghi, Kakheti, Georgia · Rkatsiteli",
    body: "Pheasant's Tears was founded in 2007 by the American painter John Wurdeman and the Georgian winemaker Gela Patalishvili. Rkatsiteli, Georgia's most planted white grape, ferments with its skins in qvevri, following the Kakhetian tradition of long skin contact. Expect dried apricot, walnut and black tea, with real grip. Read more in [Natural wine from Georgia](/guides/georgia-natural-wine).",
  },
  9: {
    origin: "Oslavia, Collio, Friuli, Italy · Chardonnay, Sauvignon Blanc, Pinot Grigio",
    body: "Stanko Radikon returned to his grandfather's skin-contact methods in 1995 and stopped adding sulfur in the early 2000s. Since his death in 2016 the estate has been run by his son Saša. Oslavje blends three varieties usually made as fresh whites and gives them months on the skins and years in large Slavonian oak. Deep amber, with the tannin of a red. Read more in [Radikon](/guides/radikon).",
  },
  13: {
    origin:
      "Oslavia, Collio, Friuli, Italy · Sauvignon Blanc, Chardonnay, Pinot Grigio, Riesling Italico",
    body: "Gravner's blend gets the same qvevri treatment as his Ribolla. Where the Ribolla shows one grape, Breg shows what long skin contact does to four varieties more often known as crisp whites. It is darker and more oxidative than the Ribolla and needs food.",
  },
  16: {
    origin: "Nakhshirgele, Imereti, Georgia · Tsitska, Tsolikouri",
    body: "Western Georgia has its own qvevri tradition. In Imereti, winemakers traditionally use fewer skins and shorter contact than in Kakheti. Nikoladze's blend of two local grapes shows that style: lighter, more floral and fresher than the Kakhetian wines, with gentle tannin. A good counterpoint to the Pheasant's Tears.",
  },
  18: {
    origin: "Oslavia, Collio, Friuli, Italy · Friulano",
    body: "Jakot is Tokaj spelled backwards. When the EU ended the use of the name Tocai for Friulian wine, Radikon renamed his Tocai Friulano in protest. Two to three months on the skins give a broad, spicy wine with the grape's almond note intact.",
  },
  28: {
    origin: "Oslavia, Collio, Friuli, Italy · Ribolla Gialla",
    body: "Radikon's single-variety Ribolla Gialla, with long skin contact and aging in large oak. Together with Gravner's, this is the wine that made the village of Oslavia known for skin-contact white wine. Comparing the two side by side shows how much the vessel and the winemaker matter.",
  },
  33: {
    origin:
      "Rivergaro, Colli Piacentini, Emilia-Romagna, Italy · Malvasia di Candia Aromatica, Ortrugo, Trebbiano",
    body: "Elena Pantaleoni's Ageno is mostly aromatic Malvasia di Candia, with a little Ortrugo and Trebbiano. It spends about four months on the skins in tank, ferments with native yeasts and is bottled without added sulfur after aging in large wooden vats and bottle. The aromatic grape and long contact give orange peel, apricot and a firm, drying finish. The name honors Giancarlo Ageno, who founded the estate.",
  },
  60: {
    origin: "Brda, Slovenia · Rebula (Ribolla Gialla)",
    body: "The Kristančič family has farmed Movia, on the Slovenian side of the border, since 1820. For Lunar, destemmed whole berries go into barrels uncrushed and ferment on their own. After about eight months, the wine is drawn off at full moon, without pressing, filtration or added sulfur. Rebula is the Slovenian name for Ribolla, so this is the same grape as wines 1 and 7, from just across the border.",
  },
  74: {
    origin: "Pfaffenheim, Alsace, France · Pinot Gris",
    body: "Pinot Gris has pinkish-gray skins, so even a short maceration gives a copper color close to rosé. Frick's version gets around a week on the skins and is bottled unfined, unfiltered and without added sulfur. With far shorter skin contact than the Friulian wines, it is the easiest place to start on this list.",
  },
  82: {
    origin: "Oslavia, Collio, Friuli, Italy · Friulano",
    body: "Dario Prinčič is Gravner's and Radikon's neighbor in Oslavia. He has farmed without chemicals since 1988 and founded his winery in 1993. His Friulano ferments with native yeasts on its skins in open vats for several weeks and is aromatic and generous. Tasted next to Radikon's Jakot, it shows two neighbors' takes on the same grape.",
  },
};

export const worldsBestOrangeWinesGuide = {
  updated: "2026-11-18",
  path: WORLDS_BEST_ORANGE_WINES_PATHS,
  h1: {
    en: "The world's best orange wines",
    sv: "Världens bästa orange viner",
  },
  metaTitle: {
    en: "The Best Orange Wines in the World: 11 Skin-Contact Wines to Know",
    sv: "Världens bästa orange viner — en kurerad lista",
  },
  metaDescription: {
    en: "The world's best orange wines, from Gravner and Radikon in Friuli to qvevri wines from Georgia. How each one is made, what it tastes like, and where to start.",
    sv: "Orange vin är vitt vin gjort som rött — skalkontakt, tannin, bärnstensfärg. Kurerad lista från Gravner till Radikon.",
  },
  breadcrumbShort: {
    en: "Best Orange Wines",
    sv: "Bästa orange viner",
  },
  hubCard: {
    title: {
      en: "The world's best orange wines — a curated list",
      sv: "Världens bästa orange viner — en kurerad lista",
    },
    description: {
      en: "Eleven orange wines that define the style, from Friuli and Slovenia to Georgia and Alsace.",
      sv: "Skalkontaktvita från vår topp 100 — Gravner, Radikon och fler.",
    },
  },
  intro: {
    en: [
      "Orange wine is white wine made like a red: the grapes ferment with their skins, for days, weeks or months, which gives the wine an amber color, tannin and texture. The style is oldest in Georgia, and its modern revival began on the Italian-Slovenian border in the 1990s. If you are new to it, start with [What is orange wine?](/guides/what-is-orange-wine)",
      "These are eleven orange wines we think everyone interested in the style should know. All come from our list of [the world's 100 best natural wines](/guides/worlds-best-natural-wines).",
    ],
    sv: [
      "[Orange vin](/vin/orange-naturvin) är inte en färg — det är en metod. Vita druvor jäser med sina skal, ibland i dagar, ibland i månader. Resultatet är bärnstensfärgat eller djupt guldgult, med tanniner, textur och en aromatisk värld av torkade aprikoser, te, nötter och kryddor som är helt annorlunda än både vitt och rött vin.",
      "Metoden är urgammal — Georgien har gjort skalkontaktvin i qvevri i åtta tusen år. Dess moderna återfödelse började i Friuli på 1990-talet när Joško Gravner återvände från Georgien och Stanko Radikon oberoende av honom kom fram till samma slutsats. Från den lilla byn Oslavje på gränsen mellan Italien och Slovenien spred sig det moderna orange vinet till resten av världen.",
      "Det här är vårt urval av de finaste orange vinerna i världen, hämtat från vår lista över världens 100 bästa naturviner.",
    ],
  },
  listHeading: {
    en: (_count: number) => "The list",
    sv: (count: number) => `${count} orange viner från vår topp 100-lista`,
  },
  howWeChose: {
    heading: "How we chose",
    paragraphs: [
      "Every wine here is made by a producer on our list of [the world's best natural wine producers](/guides/worlds-best-natural-wine-producers). Skin contact is central to each wine, not a side project. The grapes are farmed without synthetic chemicals, the wines ferment with native yeasts and are bottled with little or no added sulfur.",
      "We have favored wines that show something distinct: a place, a grape or a way of working. Several come from the same village, Oslavia in Friuli, because that is where the modern style was shaped. The order follows our top 100 list.",
    ],
  },
  origins: {
    heading: "Where the best orange wines come from",
    sections: [
      {
        heading: "Friuli and Slovenia",
        body: "Seven of the eleven wines come from a few kilometers around Oslavia, on both sides of the Italian-Slovenian border. Ribolla Gialla, called Rebula in Slovenia, is the local grape most associated with the style.",
      },
      {
        heading: "Georgia",
        body: "The oldest tradition. Kakheti in the east favors long skin contact and firm tannin, Imereti in the west fewer skins and a lighter style.",
      },
      {
        heading: "Elsewhere",
        body: "Orange wine is now made around the world. Emilia and Alsace are on this list, and many producers on our list of [the world's best natural wine producers](/guides/worlds-best-natural-wine-producers) make one.",
      },
    ],
  },
  whereToStart: {
    heading: "Where to start",
    paragraphs: [
      "For a first bottle, choose a wine with shorter skin contact: the Frick or the Nikoladze. For the full style, the Gravner or Radikon Ribolla. To see how much place and method matter, open the Gravner Ribolla and the Movia Lunar together: the same grape, a few kilometers apart.",
      "Serve orange wine cool, around 54–57°F (12–14°C), and give the long-macerated wines air and a larger glass.",
    ],
  },
  faqHeading: "Frequently asked questions",
  faqs: [
    {
      question: "What is the best orange wine in the world?",
      answer:
        "There is no single answer, but Gravner's Ribolla Gialla Anfora and Radikon's Ribolla, both from Oslavia in Friuli, are the reference points for the modern style. In Georgia, the qvevri wines of Kakheti and Imereti show the older tradition.",
    },
    {
      question: "Where is the best orange wine made?",
      answer:
        "Georgia, where the style is oldest, and the Italian-Slovenian border around Oslavia and Brda, where the modern revival began. Good orange wine is now made in many other regions too.",
    },
    {
      question: "What is a good orange wine for beginners?",
      answer:
        "Start with a wine with shorter skin contact, such as Pierre Frick's Pinot Gris Macération from Alsace or an Imeretian wine from western Georgia. They are lighter and less tannic than the long-macerated Friulian wines.",
    },
    {
      question: "Are orange wines natural wines?",
      answer:
        "Not necessarily. Skin contact is a method, while natural wine describes how the grapes are farmed and how little is added in the cellar. All the wines on this list come from natural wine producers.",
    },
    {
      question: "Do orange wines age well?",
      answer:
        "Long-macerated orange wines often do. Gravner releases his Ribolla around seven years after the harvest. Lighter, shorter-macerated wines are usually best young.",
    },
    {
      question: "How should orange wine be served?",
      answer:
        "Cool but not cold, around 54–57°F (12–14°C). Fuller wines benefit from a larger glass and some air.",
    },
  ],
  furtherReadingHeading: "Further reading",
  furtherReading: [
    {
      label: "What is orange wine?",
      href: "/guides/what-is-orange-wine",
    },
    { label: "Joško Gravner", href: "/guides/josko-gravner" },
    { label: "Radikon", href: "/guides/radikon" },
    {
      label: "Natural wine from Georgia",
      href: "/guides/georgia-natural-wine",
    },
    {
      label: "The world's 100 best natural wines",
      href: "/guides/worlds-best-natural-wines",
    },
  ],
  links: [
    {
      label: {
        en: "",
        sv: "Se vår kompletta lista över världens 100 bästa naturviner →",
      },
      href: {
        en: "/guides/worlds-best-natural-wines",
        sv: "/guider/varldens-basta-naturviner",
      },
    },
    {
      label: {
        en: "",
        sv: "Joško Gravner →",
      },
      href: {
        en: "/guides/josko-gravner",
        sv: "/guider/josko-gravner",
      },
    },
    {
      label: {
        en: "",
        sv: "Radikon →",
      },
      href: {
        en: "/guides/radikon",
        sv: "/guider/radikon",
      },
    },
    {
      label: {
        en: "",
        sv: "Utforska orange naturvin →",
      },
      href: {
        en: "/wine/orange-natural-wine",
        sv: "/vin/orange-naturvin",
      },
    },
    {
      label: {
        en: "",
        sv: "Vad är orange vin? →",
      },
      href: {
        en: "/guides/what-is-orange-wine",
        sv: "/guider/vad-ar-orange-vin",
      },
    },
  ],
} as const;
