/** Bilingual sublist guide: orange wines from TOP_100_WINES. */

export const WORLDS_BEST_ORANGE_WINES_PATHS = {
  en: "/guides/worlds-best-orange-wines",
  sv: "/guider/varldens-basta-orange-viner",
} as const;

/** @deprecated Use WORLDS_BEST_ORANGE_WINES_PATHS.en */
export const WORLDS_BEST_ORANGE_WINES_PATH =
  WORLDS_BEST_ORANGE_WINES_PATHS.en;

export const worldsBestOrangeWinesGuide = {
  path: WORLDS_BEST_ORANGE_WINES_PATHS,
  h1: {
    en: "The world's best orange wines",
    sv: "Världens bästa orange viner",
  },
  metaTitle: {
    en: "The world's best orange wines — a curated list",
    sv: "Världens bästa orange viner — en kurerad lista",
  },
  metaDescription: {
    en: "Orange wine is white wine made like red — skin contact, tannins, amber colour. Our curated list of the world's finest orange wines, from Gravner to Radikon to Pheasant's Tears.",
    sv: "Orange vin är vitt vin gjort som rött — skalkontakt, tanniner, bärnstensfärg. Vår kurerade lista över världens finaste orange viner, från Gravner till Radikon.",
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
      en: "Skin-contact whites from our top 100 — Gravner, Radikon, Pheasant's Tears and more.",
      sv: "Skalkontaktvita från vår topp 100 — Gravner, Radikon och fler.",
    },
  },
  intro: {
    en: [
      "Orange wine is not a colour — it is a method. White grapes fermented with their skins, sometimes for days, sometimes for months. The result is amber or deep gold in colour, with tannins, texture and an aromatic world of dried apricots, tea, nuts and spice that is completely unlike either white or red wine.",
      "The method is ancient — Georgia has been making skin-contact wine in qvevri for eight thousand years. Its modern revival began in Friuli in the 1990s, when Joško Gravner returned from Georgia and Stanko Radikon independently arrived at the same conclusion. From that small village on the Italian-Slovenian border, orange wine spread to become one of the defining categories of natural wine.",
      "This is our selection of the finest orange wines in the world, drawn from our list of the world's 100 best natural wines.",
    ],
    sv: [
      "Orange vin är inte en färg — det är en metod. Vita druvor jäser med sina skal, ibland i dagar, ibland i månader. Resultatet är bärnstensfärgat eller djupt guldgult, med tanniner, textur och en aromatisk värld av torkade aprikoser, te, nötter och kryddor som är helt annorlunda än både vitt och rött vin.",
      "Metoden är urgammal — Georgien har gjort skalkontaktvin i qvevri i åtta tusen år. Dess moderna återfödelse började i Friuli på 1990-talet när Joško Gravner återvände från Georgien och Stanko Radikon oberoende av honom kom fram till samma slutsats. Från den lilla byn Oslavje på gränsen mellan Italien och Slovenien spred sig det moderna orange vinet till resten av världen.",
      "Det här är vårt urval av de finaste orange vinerna i världen, hämtat från vår lista över världens 100 bästa naturviner.",
    ],
  },
  listHeading: {
    en: (count: number) => `${count} orange wines from our top 100 list`,
    sv: (count: number) => `${count} orange viner från vår topp 100-lista`,
  },
  links: [
    {
      label: {
        en: "See our full list of the world's 100 best natural wines →",
        sv: "Se vår kompletta lista över världens 100 bästa naturviner →",
      },
      href: {
        en: "/guides/worlds-best-natural-wines",
        sv: "/guider/varldens-basta-naturviner",
      },
    },
    {
      label: {
        en: "Joško Gravner — how one trip to Georgia changed wine →",
        sv: "Joško Gravner →",
      },
      href: {
        en: "/guides/josko-gravner",
        sv: "/guider/josko-gravner",
      },
    },
    {
      label: {
        en: "Radikon — how a village in Friuli defined orange wine →",
        sv: "Radikon →",
      },
      href: {
        en: "/guides/radikon",
        sv: "/guider/radikon",
      },
    },
    {
      label: {
        en: "Explore orange natural wine from Languedoc →",
        sv: "Utforska orange naturvin →",
      },
      href: {
        en: "/vin/orange-naturvin",
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
