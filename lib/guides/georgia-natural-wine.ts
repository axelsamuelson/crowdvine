/** English-only regional guide: Georgia natural wine. */

export const GEORGIA_NATURAL_WINE_GUIDE_PATH =
  "/guides/georgia-natural-wine" as const;

export const georgiaNaturalWineGuide = {
  path: GEORGIA_NATURAL_WINE_GUIDE_PATH,
  h1: "Georgia natural wine — the oldest wine tradition in the world",
  metaTitle:
    "Georgia natural wine — the oldest wine tradition in the world",
  metaDescription:
    "Georgia has been making wine in clay vessels buried in the ground for 8,000 years. The complete guide to Georgian natural wine, qvevri and the tradition that changed European winemaking.",
  breadcrumbShort: "Georgia Natural Wine",
  hubCard: {
    href: GEORGIA_NATURAL_WINE_GUIDE_PATH,
    title: "Georgia natural wine — the oldest wine tradition in the world",
    description:
      "Qvevri, Kakheti and Imereti — the living tradition that shaped modern orange wine.",
  },
  sections: [
    {
      heading: "Eight thousand years",
      paragraphs: [
        "Georgia, in the South Caucasus, is widely considered the birthplace of wine. Archaeological evidence points to winemaking going back approximately eight thousand years — not a marketing claim, but a depth of practice that few wine regions can approach. The finds matter because they place fermentation culture here long before most European vineyards existed as we know them.",
        "The qvevri is the unbroken thread: clay vessels buried in the ground for fermentation and storage, carrying an ancient method into modern bottles. That continuity matters. The tradition survived invasion, Soviet collectivisation and modernisation pressure without disappearing into museum folklore — a line of practice that kept being used, not merely remembered.",
        "What drinkers meet today is not a reconstruction. It is a living practice that European natural wine only rediscovered when growers began looking for authenticity beyond stainless steel and temperature control. Eight thousand years is not a slogan here — it is the reason Georgia still sets the terms for what skin-contact wine can mean.",
      ],
    },
    {
      heading: "What qvevri winemaking is",
      paragraphs: [
        "A qvevri is a clay vessel, traditionally beeswax-lined and buried in the ground. Burial steadies temperature without cooling equipment — the earth does the work that a modern cellar assigns to machines. That physical fact is as important as the romance of antiquity: the vessel is infrastructure, not decoration.",
        "The method is whole clusters, skin contact, natural fermentation, then sealing with beeswax. The result is amber wine with tannins, texture and the character of extended skin contact — closer to what many people now call orange wine, but older than the category name. Texture is not an accident; it is what months with skins and stems produce.",
        "That differs from modern orange wine made in stainless steel with timed, controlled skin contact. Qvevri winemaking is not a technique grafted onto industrial white wine. It is a vessel tradition in which fermentation, maceration and storage share the same buried clay — and the wine takes its structure from that continuity rather than from a short, managed maceration schedule.",
      ],
    },
    {
      heading: "Kakheti and Imereti",
      paragraphs: [
        "Two regions give Georgia's two main answers to skin-contact wine. Kakheti, in the east, carries most of the country's wine production and the long skin-contact tradition — whole clusters including stems, months of contact, the most intense expression of qvevri wine. Key whites are Rkatsiteli and Mtsvane; Saperavi is the most planted red.",
        "Imereti, in the west, works with shorter skin contact and a lighter, more floral result. The key whites are Tsitska and Tsolikouri. Cooler western conditions and a different maceration habit produce another register of the same clay-vessel idea — not a lesser version of Kakheti, but a parallel tradition.",
        "Together the regions show that Georgian tradition is not a single style. It is a family of practices — long and short, intense and floral — answering the same question of how white grapes and buried clay can make wine. Knowing which region you are tasting tells you which answer you are hearing.",
      ],
    },
    {
      heading: "The connection to European natural wine",
      paragraphs: [
        "Joško Gravner's 1997 trip to Georgia was the catalyst for orange wine in Friuli. What he saw — qvevri, skin contact, no temperature control — reshaped how he thought white wine could be made. From that visit, a change in Collio eventually reached drinkers everywhere. Georgian tradition did not stay in Georgia.",
        "European orange wine owes a direct debt to Georgian tradition. When a modern movement looking for authenticity met an ancient method that had never abandoned skin contact, the result was not invention so much as recognition — and then translation into European cellars. Kakheti did not become a fashion; it became a reference point for what orange wine had always been able to be. The debt is historical, not metaphorical.",
      ],
    },
  ],
  producersHeading: "The producers",
    producersIntro:
    "Two Georgian domaines on PACT's list of the world's 100 best natural wine producers show Kakheti and Imereti at their clearest — one in the long skin-contact east, one in the shorter, lighter west.",
  producers: [
    {
      name: "Pheasant's Tears",
      rank: 6,
      href: "/guides/worlds-best-natural-wine-producers",
      paragraphs: [
        "Ranked #6. Founded by American artist John Wurdeman and Georgian vigneron Gela Patalishvili in Kakheti. The project is cultural preservation as much as wine — reviving nearly extinct Georgian varieties and making in qvevri in the heart of the long skin-contact tradition. The bottles read as cultural artefacts as well as drinks. Pheasant's Tears made Kakheti legible to drinkers who had never heard of Rkatsiteli. See their entry on our top 100 producers list.",
      ],
    },
    {
      name: "Ramaz Nikoladze",
      rank: 11,
      href: "/guides/worlds-best-natural-wine-producers",
      paragraphs: [
        "Ranked #11. A key figure in Imereti, working with Tsitska and Tsolikouri. Nikoladze helped bridge Georgian tradition and the European natural wine movement — shorter skin contact, a lighter register, and a conversation that runs both ways between the Caucasus and Europe. Where Pheasant's Tears anchors Kakheti's long maceration story, Nikoladze shows how Imereti speaks to that same clay tradition in another key. Find him on our top 100 producers list.",
      ],
    },
  ],
  closingSections: [
    {
      heading: "Why Georgia matters now",
      paragraphs: [
        "In 2013 the Georgian qvevri winemaking tradition was inscribed on the UNESCO Intangible Cultural Heritage list — recognition that the practice belongs to world culture, not only to local habit. That listing arrives as international interest accelerates, not after the fact.",
        "European and international winemakers have made the pilgrimage. What Georgia offers that no other wine region can is a living unbroken tradition. As Georgian wine grows in visibility, how that tradition is preserved matters as much as how it is promoted — otherwise the clay vessel becomes a label, not a method. The opportunity is attention; the risk is turning eight thousand years into a brand story that forgets the work in the ground.",
      ],
    },
  ],
  furtherReadingHeading: "Further reading",
  links: [
    {
      href: "/guides/worlds-best-natural-wine-producers",
      label: "Explore the world's 100 best natural wine producers →",
    },
    {
      href: "/guides/josko-gravner",
      label: "Joško Gravner — how one trip to Georgia changed wine →",
    },
    {
      href: "/guides/worlds-best-orange-wines",
      label: "The world's best orange wines →",
    },
    {
      href: "/guides/worlds-best-natural-wines",
      label: "The world's 100 best natural wines →",
    },
  ],
} as const;
