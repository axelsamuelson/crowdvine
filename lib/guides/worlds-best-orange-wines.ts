/** English-only sublist guide: orange wines from TOP_100_WINES. */

export const WORLDS_BEST_ORANGE_WINES_PATH =
  "/guides/worlds-best-orange-wines" as const;

export const worldsBestOrangeWinesGuide = {
  path: WORLDS_BEST_ORANGE_WINES_PATH,
  h1: "The world's best orange wines",
  metaTitle: "The world's best orange wines — a curated list",
  metaDescription:
    "Orange wine is white wine made like red — skin contact, tannins, amber colour. Our curated list of the world's finest orange wines, from Gravner to Radikon to Pheasant's Tears.",
  breadcrumbShort: "Best Orange Wines",
  hubCard: {
    href: WORLDS_BEST_ORANGE_WINES_PATH,
    title: "The world's best orange wines — a curated list",
    description:
      "Skin-contact whites from our top 100 — Gravner, Radikon, Pheasant's Tears and more.",
  },
  intro: [
    "Orange wine is not a colour — it is a method. White grapes fermented with their skins, sometimes for days, sometimes for months. The result is amber or deep gold in colour, with tannins, texture and an aromatic world of dried apricots, tea, nuts and spice that is completely unlike either white or red wine.",
    "The method is ancient — Georgia has been making skin-contact wine in qvevri for eight thousand years. Its modern revival began in Friuli in the 1990s, when Joško Gravner returned from Georgia and Stanko Radikon independently arrived at the same conclusion. From that small village on the Italian-Slovenian border, orange wine spread to become one of the defining categories of natural wine.",
    "This is our selection of the finest orange wines in the world, drawn from our list of the world's 100 best natural wines.",
  ],
  listHeading: (count: number) =>
    `${count} orange wines from our top 100 list`,
  links: [
    {
      href: "/guides/worlds-best-natural-wines",
      label: "See our full list of the world's 100 best natural wines →",
    },
    {
      href: "/guides/josko-gravner",
      label: "Joško Gravner — how one trip to Georgia changed wine →",
    },
    {
      href: "/guides/radikon",
      label: "Radikon — how a village in Friuli defined orange wine →",
    },
    {
      href: "/vin/orange-naturvin",
      label: "Explore orange natural wine from Languedoc →",
    },
  ],
} as const;
