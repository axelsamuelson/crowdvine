export type WineCategoryFilter = {
  color?: string[];
  tags?: string[];
  isNatural?: boolean;
  filterGrape?: string;
};

export type WineCategory = {
  slug: string;
  locale: "sv" | "en";
  h1: string;
  title: string;
  metaDescription: string;
  description: string;
  longDescription?: string;
  filter: WineCategoryFilter;
  hreflang?: string;
  canonical: string;
};

export const WINE_CATEGORIES_SV: WineCategory[] = [
  {
    slug: "naturvin",
    locale: "sv",
    h1: "Naturvin",
    title: "Köpa naturvin online — direktimporterat från Languedoc | PACT Wines",
    metaDescription:
      "Köp naturvin direkt från småproducenter i Languedoc. Hemleverans i Stockholm. Inga mellanhänder, inga tillsatser.",
    description:
      "Naturvin direktimporterat från Languedoc till Stockholm. Alla viner är ekologiskt eller biodynamiskt odlade utan tillsatser.",
    filter: { isNatural: true },
    hreflang: "natural-wine",
    canonical: "/vin/naturvin",
  },
  {
    slug: "rott-naturvin",
    locale: "sv",
    h1: "Rött naturvin",
    title: "Köpa rött naturvin online | PACT Wines",
    metaDescription:
      "Rött naturvin direkt från Languedoc. Carignan, Grenache, Syrah och mer — hemleverans i Stockholm.",
    description:
      "Röda naturviner direktimporterade från Languedoc. Från lättrörliga vardagsviner till komplexa matviner.",
    filter: { isNatural: true, color: ["Red"] },
    hreflang: "red-natural-wine",
    canonical: "/vin/rott-naturvin",
  },
  {
    slug: "vitt-naturvin",
    locale: "sv",
    h1: "Vitt naturvin",
    title: "Köpa vitt naturvin online | PACT Wines",
    metaDescription:
      "Vitt naturvin direkt från Languedoc. Vermentino, Chardonnay, Terret och mer — hemleverans i Stockholm.",
    description:
      "Vita naturviner direktimporterade från Languedoc. Mineraliska, friska och utan tillsatser.",
    filter: { isNatural: true, color: ["White"] },
    hreflang: "white-natural-wine",
    canonical: "/vin/vitt-naturvin",
  },
  {
    slug: "orange-naturvin",
    locale: "sv",
    h1: "Orange naturvin",
    title: "Köpa orange naturvin online | PACT Wines",
    metaDescription:
      "Orange naturvin med skalkontakt direkt från Languedoc. Textur, djup och karaktär — hemleverans i Stockholm.",
    description:
      "Orangeviner med skalkontakt från Languedoc. Gjorda på vita druvor med lång kontakt med skalet — textur och djup.",
    filter: { isNatural: true, color: ["Orange"] },
    hreflang: "orange-natural-wine",
    canonical: "/vin/orange-naturvin",
  },
  {
    slug: "rod-och-vit-naturvin",
    locale: "sv",
    h1: "Rött & vitt naturvin",
    title: "Rött och vitt naturvin — assemblage | PACT Wines",
    metaDescription:
      "Naturvin gjorda på både röda och vita druvor. Direktimporterat från Languedoc.",
    description:
      "Assemblage av röda och vita druvor — en ovanlig stil direktimporterad från Languedoc.",
    filter: { isNatural: true, color: ["Red & White"] },
    hreflang: "red-and-white-natural-wine",
    canonical: "/vin/rod-och-vit-naturvin",
  },
  {
    slug: "rod-och-orange-naturvin",
    locale: "sv",
    h1: "Rött & orange naturvin",
    title: "Rött och orange naturvin — assemblage | PACT Wines",
    metaDescription:
      "Naturvin gjorda på röda druvor med skalkontakt. Direktimporterat från Languedoc.",
    description:
      "Co-fermenterade röda och orangea druvor — en expressiv stil från Languedoc.",
    filter: { isNatural: true, color: ["Red & Orange"] },
    hreflang: "red-and-orange-natural-wine",
    canonical: "/vin/rod-och-orange-naturvin",
  },
  {
    slug: "naturvin-languedoc",
    locale: "sv",
    h1: "Naturvin från Languedoc",
    title: "Naturvin från Languedoc — direktimport till Stockholm | PACT Wines",
    metaDescription:
      "Naturvin direkt från småproducenter i Languedoc, Frankrike. Direktimporterat till Stockholm utan mellanhänder.",
    description:
      "Languedoc är Frankrikes mest dynamiska naturvinsregion. Vi importerar direkt från producenten till din dörr.",
    filter: { isNatural: true },
    hreflang: "natural-wine-languedoc",
    canonical: "/vin/naturvin-languedoc",
  },
  {
    slug: "naturvin-frankrike",
    locale: "sv",
    h1: "Naturvin från Frankrike",
    title: "Köpa naturvin från Frankrike online | PACT Wines",
    metaDescription:
      "Franskt naturvin direktimporterat från Languedoc. Köp naturvin från Frankrike med hemleverans i Stockholm.",
    description:
      "Alla viner i PACTs sortiment kommer från Languedoc i södra Frankrike — direktimporterade utan mellanhänder.",
    filter: { isNatural: true },
    hreflang: "natural-wine-france",
    canonical: "/vin/naturvin-frankrike",
  },
  {
    slug: "rott-naturvin-languedoc",
    locale: "sv",
    h1: "Rött naturvin från Languedoc",
    title: "Rött naturvin från Languedoc | PACT Wines",
    metaDescription:
      "Rött naturvin direkt från Languedoc, Frankrike. Carignan, Grenache, Syrah — hemleverans Stockholm.",
    description:
      "Röda naturviner från Languedocs bästa småproducenter. Direktimporterat till Stockholm.",
    filter: { isNatural: true, color: ["Red"] },
    hreflang: "red-natural-wine-languedoc",
    canonical: "/vin/rott-naturvin-languedoc",
  },
  {
    slug: "vitt-naturvin-languedoc",
    locale: "sv",
    h1: "Vitt naturvin från Languedoc",
    title: "Vitt naturvin från Languedoc | PACT Wines",
    metaDescription:
      "Vitt naturvin direkt från Languedoc, Frankrike. Vermentino, Chardonnay, Terret — hemleverans Stockholm.",
    description:
      "Vita naturviner från Languedocs bästa småproducenter. Direktimporterat till Stockholm.",
    filter: { isNatural: true, color: ["White"] },
    hreflang: "white-natural-wine-languedoc",
    canonical: "/vin/vitt-naturvin-languedoc",
  },
  {
    slug: "orange-naturvin-languedoc",
    locale: "sv",
    h1: "Orange naturvin från Languedoc",
    title: "Orange naturvin från Languedoc | PACT Wines",
    metaDescription:
      "Orange naturvin med skalkontakt direkt från Languedoc, Frankrike. Hemleverans Stockholm.",
    description:
      "Orangeviner från Languedoc — vita druvor med skalkontakt som ger textur, djup och karaktär.",
    filter: { isNatural: true, color: ["Orange"] },
    hreflang: "orange-natural-wine-languedoc",
    canonical: "/vin/orange-naturvin-languedoc",
  },
  {
    slug: "naturvin-hemleverans-stockholm",
    locale: "sv",
    h1: "Naturvin med hemleverans i Stockholm",
    title: "Naturvin hemleverans Stockholm — direktimport | PACT Wines",
    metaDescription:
      "Beställ naturvin online med hemleverans i Stockholm. Direktimporterat från Languedoc via PACT.",
    description:
      "PACT levererar naturvin hem till dig i Stockholm. Direktimporterat från Languedoc — billigare och friare än vad som finns i butik.",
    filter: { isNatural: true },
    hreflang: "natural-wine-delivery-stockholm",
    canonical: "/vin/naturvin-hemleverans-stockholm",
  },
  {
    slug: "direktimport-vin",
    locale: "sv",
    h1: "Direktimport av vin från Languedoc",
    title: "Direktimport vin Sverige — köp direkt från producenten | PACT Wines",
    metaDescription:
      "Köp vin direktimporterat från Languedoc till Sverige. PACT samlar beställningar och skickar direkt från producenten.",
    description:
      "PACT är en direktimportör av naturvin från Languedoc. Vi samlar beställningar tills en pall är full — sedan skickar producenten direkt till dig.",
    filter: {},
    hreflang: "direct-import-wine",
    canonical: "/vin/direktimport-vin",
  },
  {
    slug: "carignan",
    locale: "sv",
    h1: "Carignan — Languedocs rebelliska druvsort",
    title: "Carignan naturvin från Languedoc | PACT Wines",
    metaDescription:
      "Carignan är Languedocs mest missförstådda druvsort. Gamla stockar på skifferjord ger mörka frukter, hög syra och mineralisk karaktär. Direktimporterat till Stockholm.",
    description:
      "Carignan odlas i Languedoc sedan romartiden. Gamla stockar kräver handskörd och ger låga skördar — men vinerna är komplexa, strukturerade och mineral-drivna.",
    longDescription:
      "Carignan kommer ursprungligen från Aragonien i Spanien och har odlats i Languedoc sedan medeltiden. Under 1900-talets massproduktion fick druvsorten dåligt rykte för höga skördar och tunna viner — men det berättar bara halva sanningen. Gamla stockar med låga skördar på skiffer- och kalkstenjordar ger något helt annat: mörka frukter, fast syra, markerade tanniner och den karakteristiska doften av Languedocs garrigue. Naturvinsrörelsen har rehabiliterat Carignan. Producenter som Peira Levada, Thomas Chany och Clos Fantine visar vad hundra år gamla stockar kan åstadkomma när de hanteras med respekt och minimalt med intervention.",
    filter: { filterGrape: "Carignan" },
    hreflang: "carignan",
    canonical: "/vin/carignan",
  },
  {
    slug: "grenache",
    locale: "sv",
    h1: "Grenache — Languedocs hjärta",
    title: "Grenache naturvin från Languedoc | PACT Wines",
    metaDescription:
      "Grenache är Languedocs mest planterade röda druvsort. Fruktig, varm och versatil — från lättdruckna vardagsviner till komplexa fatlagrade cuvéer.",
    description:
      "Grenache trivs i Languedocs varma, torra klimat och producerar fruktfyllda viner med låga tanniner och hög alkohol. Gamla gobelets ger koncentration och djup.",
    longDescription:
      "Grenache är en av Medelhavsvärldens mest planterade druvssorter — med ursprung i Aragonien i Spanien och med anrika rötter i Languedoc sedan 1600-talet. Druvsorten trivs i värme och torka, producerar frukttäta viner med låga tanniner och naturligt hög alkohol. Gamla gobelet-stockar ger låga skördar och koncentrerad frukt. I Languedoc uttrycker Grenache sig annorlunda än i Châteauneuf-du-Pape — lättare, friskare, ofta med mer blomsterkaraktär på de kalkrika jordarna. Naturvinsproducenter som Gregory White och Mas d'Agalis arbetar med Grenache utan tillsatser och visar druvans genuina personlighet.",
    filter: { filterGrape: "Grenache" },
    hreflang: "grenache",
    canonical: "/vin/grenache",
  },
  {
    slug: "syrah",
    locale: "sv",
    h1: "Syrah — mörk och kryddig från Languedoc",
    title: "Syrah naturvin från Languedoc | PACT Wines",
    metaDescription:
      "Syrah ger Languedocs djupaste, kryddigaste röda viner. På skifferjordarna i Saint-Chinian och Faugères uttrycker den mörka frukter, svartpeppar och mineralitet.",
    description:
      "Syrah introducerades i Languedoc under 1970-talet och har blivit regionens mest uppskattade förbättrardruvsort. På skifferterroir uttrycker den sin bästa sida.",
    longDescription:
      "Syrah introducerades i Languedoc under 1970-talet som en förbättrardruvsort och har sedan dess blivit regionens mest omskrivna röda druvsort. På skifferterroir i Saint-Chinian och Faugères uttrycker Syrah mörka frukter, svartpeppar, rökt kött och en mineralitet som påminner om norra Rhône men med mer medelhavskaraktär. Kallare lägen på höjd — som hos Meïgoon i Roquebrun eller Ugo Lestelle i Pardailhan — ger Syrah den friskhet och precision som gör den exceptionell. Utan tillsatser och med indigena jästsvampar kommer druvans terroir igenom utan filter.",
    filter: { filterGrape: "Syrah" },
    hreflang: "syrah",
    canonical: "/vin/syrah",
  },
  {
    slug: "cinsault",
    locale: "sv",
    h1: "Cinsault — lätt, friskt och underskattat",
    title: "Cinsault naturvin från Languedoc | PACT Wines",
    metaDescription:
      "Cinsault är Languedocs mest underskattade druvsort. Låga tanniner, höga aromer och naturlig friskhet gör den perfekt för lättdruckna naturviner.",
    description:
      "Cinsault är en av Languedocs äldsta druvssorter med rötter i Hérault. Låga tanniner och blomsterrika aromer av jordgubb och körsbär gör den till en favorit bland naturvinsproducenter.",
    longDescription:
      "Cinsault har odlats i Languedoc och Provence sedan antiken — den äldsta dokumenterade nämnandet är från Hérault år 1600. Länge betraktad som en blandningsdruvsort för att mjuka upp kraftigare viner, håller Cinsault på att rehabiliteras av naturvinsrörelsen. Dess låga tanniner, naturliga friskhet och blomsterrika aromer av jordgubb, körsbär och violer gör den perfekt för minimal intervention. Producenter som Meïgoon och Extralucide visar att Cinsault kan stå på egna ben — lättdrucken, aromatisk och genomskinlig i sin expression av terroir.",
    filter: { filterGrape: "Cinsault" },
    hreflang: "cinsault",
    canonical: "/vin/cinsault",
  },
];

export const WINE_CATEGORIES_EN: WineCategory[] = [
  {
    slug: "natural-wine",
    locale: "en",
    h1: "Natural Wine",
    title: "Buy Natural Wine Online — Direct from Languedoc | PACT Wines",
    metaDescription:
      "Buy natural wine directly from small producers in Languedoc. Home delivery in Stockholm. No middlemen, no additives.",
    description:
      "Natural wine directly imported from Languedoc to Stockholm. All wines are organically or biodynamically farmed without additives.",
    filter: { isNatural: true },
    hreflang: "naturvin",
    canonical: "/wine/natural-wine",
  },
  {
    slug: "red-natural-wine",
    locale: "en",
    h1: "Red Natural Wine",
    title: "Buy Red Natural Wine Online | PACT Wines",
    metaDescription:
      "Red natural wine direct from Languedoc. Carignan, Grenache, Syrah and more — home delivery in Stockholm.",
    description:
      "Red natural wines directly imported from Languedoc. From light everyday wines to complex food wines.",
    filter: { isNatural: true, color: ["Red"] },
    hreflang: "rott-naturvin",
    canonical: "/wine/red-natural-wine",
  },
  {
    slug: "white-natural-wine",
    locale: "en",
    h1: "White Natural Wine",
    title: "Buy White Natural Wine Online | PACT Wines",
    metaDescription:
      "White natural wine direct from Languedoc. Vermentino, Chardonnay, Terret and more — home delivery in Stockholm.",
    description:
      "White natural wines directly imported from Languedoc. Mineral, fresh and without additives.",
    filter: { isNatural: true, color: ["White"] },
    hreflang: "vitt-naturvin",
    canonical: "/wine/white-natural-wine",
  },
  {
    slug: "orange-natural-wine",
    locale: "en",
    h1: "Orange Natural Wine",
    title: "Buy Orange Natural Wine Online | PACT Wines",
    metaDescription:
      "Orange natural wine with skin contact direct from Languedoc. Texture, depth and character — home delivery in Stockholm.",
    description:
      "Orange wines with skin contact from Languedoc. Made from white grapes with extended skin contact — texture and depth.",
    filter: { isNatural: true, color: ["Orange"] },
    hreflang: "orange-naturvin",
    canonical: "/wine/orange-natural-wine",
  },
  {
    slug: "red-and-white-natural-wine",
    locale: "en",
    h1: "Red & White Natural Wine",
    title: "Red and White Natural Wine — assemblage | PACT Wines",
    metaDescription:
      "Natural wines made from both red and white grapes. Direct import from Languedoc.",
    description:
      "Assemblage of red and white grapes — an unusual style directly imported from Languedoc.",
    filter: { isNatural: true, color: ["Red & White"] },
    hreflang: "rod-och-vit-naturvin",
    canonical: "/wine/red-and-white-natural-wine",
  },
  {
    slug: "red-and-orange-natural-wine",
    locale: "en",
    h1: "Red & Orange Natural Wine",
    title: "Red and Orange Natural Wine | PACT Wines",
    metaDescription:
      "Natural wines made from red grapes with skin contact. Direct import from Languedoc.",
    description:
      "Co-fermented red and orange grapes — an expressive style from Languedoc.",
    filter: { isNatural: true, color: ["Red & Orange"] },
    hreflang: "rod-och-orange-naturvin",
    canonical: "/wine/red-and-orange-natural-wine",
  },
  {
    slug: "natural-wine-languedoc",
    locale: "en",
    h1: "Natural Wine from Languedoc",
    title: "Natural Wine from Languedoc — Direct Import to Stockholm | PACT Wines",
    metaDescription:
      "Natural wine direct from small producers in Languedoc, France. Imported directly to Stockholm without middlemen.",
    description:
      "Languedoc is France's most dynamic natural wine region. We import directly from the producer to your door.",
    filter: { isNatural: true },
    hreflang: "naturvin-languedoc",
    canonical: "/wine/natural-wine-languedoc",
  },
  {
    slug: "natural-wine-france",
    locale: "en",
    h1: "Natural Wine from France",
    title: "Buy French Natural Wine Online | PACT Wines",
    metaDescription:
      "French natural wine directly imported from Languedoc. Buy natural wine from France with home delivery in Stockholm.",
    description:
      "All wines in PACT's range come from Languedoc in southern France — directly imported without middlemen.",
    filter: { isNatural: true },
    hreflang: "naturvin-frankrike",
    canonical: "/wine/natural-wine-france",
  },
  {
    slug: "red-natural-wine-languedoc",
    locale: "en",
    h1: "Red Natural Wine from Languedoc",
    title: "Red Natural Wine from Languedoc | PACT Wines",
    metaDescription:
      "Red natural wine direct from Languedoc, France. Carignan, Grenache, Syrah — home delivery Stockholm.",
    description:
      "Red natural wines from Languedoc's best small producers. Directly imported to Stockholm.",
    filter: { isNatural: true, color: ["Red"] },
    hreflang: "rott-naturvin-languedoc",
    canonical: "/wine/red-natural-wine-languedoc",
  },
  {
    slug: "white-natural-wine-languedoc",
    locale: "en",
    h1: "White Natural Wine from Languedoc",
    title: "White Natural Wine from Languedoc | PACT Wines",
    metaDescription:
      "White natural wine direct from Languedoc, France. Vermentino, Chardonnay, Terret — home delivery Stockholm.",
    description:
      "White natural wines from Languedoc's best small producers. Directly imported to Stockholm.",
    filter: { isNatural: true, color: ["White"] },
    hreflang: "vitt-naturvin-languedoc",
    canonical: "/wine/white-natural-wine-languedoc",
  },
  {
    slug: "orange-natural-wine-languedoc",
    locale: "en",
    h1: "Orange Natural Wine from Languedoc",
    title: "Orange Natural Wine from Languedoc | PACT Wines",
    metaDescription:
      "Orange natural wine with skin contact direct from Languedoc, France. Home delivery Stockholm.",
    description:
      "Orange wines from Languedoc — white grapes with skin contact for texture, depth and character.",
    filter: { isNatural: true, color: ["Orange"] },
    hreflang: "orange-naturvin-languedoc",
    canonical: "/wine/orange-natural-wine-languedoc",
  },
  {
    slug: "natural-wine-delivery-stockholm",
    locale: "en",
    h1: "Natural Wine Home Delivery Stockholm",
    title: "Natural Wine Delivery Stockholm — Direct Import | PACT Wines",
    metaDescription:
      "Order natural wine online with home delivery in Stockholm. Directly imported from Languedoc via PACT.",
    description:
      "PACT delivers natural wine to your home in Stockholm. Directly imported from Languedoc — better value and more interesting than what you'll find in stores.",
    filter: { isNatural: true },
    hreflang: "naturvin-hemleverans-stockholm",
    canonical: "/wine/natural-wine-delivery-stockholm",
  },
  {
    slug: "direct-import-wine",
    locale: "en",
    h1: "Direct Import Wine from Languedoc",
    title: "Direct Import Wine Sweden — Buy Direct from Producer | PACT Wines",
    metaDescription:
      "Buy wine directly imported from Languedoc to Sweden. PACT aggregates orders and ships directly from the producer.",
    description:
      "PACT is a direct importer of natural wine from Languedoc. We aggregate orders until a pallet is full — then the producer ships directly to you.",
    filter: {},
    hreflang: "direktimport-vin",
    canonical: "/wine/direct-import-wine",
  },
  {
    slug: "carignan",
    locale: "en",
    h1: "Carignan — Languedoc's rebellious grape",
    title: "Carignan Natural Wine from Languedoc | PACT Wines",
    metaDescription:
      "Carignan is Languedoc's most misunderstood grape. Old vines on schist soil give dark fruit, high acidity and mineral character. Direct import to Stockholm.",
    description:
      "Carignan has been grown in Languedoc since Roman times. Old vines require hand harvesting and give low yields — but the wines are complex, structured and mineral-driven.",
    longDescription:
      "Carignan originates from Aragon in Spain and has been cultivated in Languedoc since the Middle Ages. During the era of mass production it gained a reputation for high yields and thin wines — but that tells only half the story. Old vines with low yields on schist and limestone soils produce something entirely different: dark fruit, firm acidity, marked tannins and the characteristic scent of Languedoc garrigue. The natural wine movement has rehabilitated Carignan. Producers like Peira Levada, Thomas Chany and Clos Fantine show what hundred-year-old vines can achieve when handled with respect and minimal intervention.",
    filter: { filterGrape: "Carignan" },
    hreflang: "carignan",
    canonical: "/wine/carignan",
  },
  {
    slug: "grenache",
    locale: "en",
    h1: "Grenache — the heart of Languedoc",
    title: "Grenache Natural Wine from Languedoc | PACT Wines",
    metaDescription:
      "Grenache is Languedoc's most planted red grape. Fruity, warm and versatile — from easy everyday wines to complex barrel-aged cuvées.",
    description:
      "Grenache thrives in Languedoc's warm, dry climate and produces fruit-forward wines with low tannins and naturally high alcohol. Old bush vines give concentration and depth.",
    longDescription:
      "Grenache is one of the Mediterranean's most planted grapes — originating in Aragon, Spain, with deep roots in Languedoc since the 1600s. The variety loves heat and drought, producing fruit-dense wines with low tannins and naturally high alcohol. Old gobelet-trained vines give low yields and concentrated fruit. In Languedoc, Grenache expresses itself differently than in Châteauneuf-du-Pape — lighter, fresher, often with more floral character on the limestone soils. Natural wine producers like Gregory White and Mas d'Agalis work with Grenache without additives and show the grape's genuine personality.",
    filter: { filterGrape: "Grenache" },
    hreflang: "grenache",
    canonical: "/wine/grenache",
  },
  {
    slug: "syrah",
    locale: "en",
    h1: "Syrah — dark and spicy from Languedoc",
    title: "Syrah Natural Wine from Languedoc | PACT Wines",
    metaDescription:
      "Syrah gives Languedoc's deepest, spiciest red wines. On schist soils in Saint-Chinian and Faugères it expresses dark fruit, black pepper and minerality.",
    description:
      "Syrah was introduced to Languedoc in the 1970s and has become the region's most prized blending grape. On schist terroir it shows its best side.",
    longDescription:
      "Syrah was introduced to Languedoc in the 1970s as a blending grape and has since become the region's most written-about red variety. On schist terroir in Saint-Chinian and Faugères, Syrah expresses dark fruit, black pepper, smoked meat and a minerality reminiscent of the northern Rhône but with more Mediterranean character. Cooler high-altitude sites — like Meïgoon in Roquebrun or Ugo Lestelle in Pardailhan — give Syrah the freshness and precision that makes it exceptional. Without additives and with indigenous yeasts, the grape's terroir comes through unfiltered.",
    filter: { filterGrape: "Syrah" },
    hreflang: "syrah",
    canonical: "/wine/syrah",
  },
  {
    slug: "cinsault",
    locale: "en",
    h1: "Cinsault — light, fresh and underrated",
    title: "Cinsault Natural Wine from Languedoc | PACT Wines",
    metaDescription:
      "Cinsault is Languedoc's most underrated grape. Low tannins, high aromatics and natural freshness make it perfect for easy-drinking natural wines.",
    description:
      "Cinsault is one of Languedoc's oldest grape varieties with roots in Hérault. Low tannins and floral aromas of strawberry and cherry make it a favourite among natural wine producers.",
    longDescription:
      "Cinsault has been grown in Languedoc and Provence since antiquity — the earliest documented mention is from Hérault in 1600. Long regarded as a blending grape to soften more powerful wines, Cinsault is being rehabilitated by the natural wine movement. Its low tannins, natural freshness and floral aromas of strawberry, cherry and violet make it perfect for minimal intervention. Producers like Meïgoon and Extralucide show that Cinsault can stand on its own — easy-drinking, aromatic and transparent in its expression of terroir.",
    filter: { filterGrape: "Cinsault" },
    hreflang: "cinsault",
    canonical: "/wine/cinsault",
  },
];

/** Short color slugs → canonical category slug (EN). */
export const WINE_CATEGORY_EN_ALIASES: Record<string, string> = {
  red: "red-natural-wine",
  white: "white-natural-wine",
  orange: "orange-natural-wine",
};

/** Short color slugs → canonical category slug (SV). */
export const WINE_CATEGORY_SV_ALIASES: Record<string, string> = {
  rott: "rott-naturvin",
  vitt: "vitt-naturvin",
};

export function getWineCategoryEnCanonicalSlug(slug: string): string {
  return WINE_CATEGORY_EN_ALIASES[slug] ?? slug;
}

export function getWineCategorySvCanonicalSlug(slug: string): string {
  return WINE_CATEGORY_SV_ALIASES[slug] ?? slug;
}

export function isWineCategoryEnAlias(slug: string): boolean {
  return slug in WINE_CATEGORY_EN_ALIASES;
}

export function isWineCategorySvAlias(slug: string): boolean {
  return slug in WINE_CATEGORY_SV_ALIASES;
}

export function getWineCategorySv(slug: string): WineCategory | undefined {
  const canonicalSlug = getWineCategorySvCanonicalSlug(slug);
  return WINE_CATEGORIES_SV.find((c) => c.slug === canonicalSlug);
}

export function getWineCategoryEn(slug: string): WineCategory | undefined {
  const canonicalSlug = getWineCategoryEnCanonicalSlug(slug);
  return WINE_CATEGORIES_EN.find((c) => c.slug === canonicalSlug);
}

export function getHreflangPath(category: WineCategory): string {
  const counterpart = category.hreflang ?? category.slug;
  return category.locale === "sv"
    ? `/wine/${counterpart}`
    : `/vin/${counterpart}`;
}

export function getCategoryUrlForColor(
  colorName: string,
  locale: "sv" | "en",
): string | null {
  const uiToDbColor: Record<string, string> = {
    "Red/White": "Red & White",
    "Red/Orange": "Red & Orange",
  };
  const dbColor = uiToDbColor[colorName] ?? colorName;

  const categories =
    locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;

  const match = categories.find(
    (c) =>
      c.filter.color?.length === 1 &&
      c.filter.color[0] === dbColor &&
      c.filter.isNatural === true &&
      !c.filter.tags?.length &&
      !c.slug.includes("languedoc") &&
      !c.slug.includes("frankrike") &&
      !c.slug.includes("france") &&
      !c.slug.includes("stockholm") &&
      !c.slug.includes("delivery") &&
      !c.slug.includes("hemleverans"),
  );

  return match ? match.canonical : null;
}

export function getCategoryUrlForGrape(
  grapeName: string,
  locale: "sv" | "en",
): string | null {
  const categories =
    locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;

  const match = categories.find(
    (c) =>
      c.filter.filterGrape?.toLowerCase() === grapeName.toLowerCase() &&
      !c.filter.color?.length &&
      !c.filter.tags?.length,
  );

  return match ? match.canonical : null;
}

export function getActiveGrapeFromPathname(path: string): string | null {
  for (const c of WINE_CATEGORIES_SV) {
    if (c.filter.filterGrape && c.canonical === path) {
      return c.filter.filterGrape;
    }
  }
  for (const c of WINE_CATEGORIES_EN) {
    if (c.filter.filterGrape && c.canonical === path) {
      return c.filter.filterGrape;
    }
  }
  return null;
}
