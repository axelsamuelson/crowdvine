import type { AppLocale } from "@/lib/i18n/locale";
import { GUIDE_PATHS } from "@/lib/guides/guide-routes";
import { beaujolaisNaturalWineGuide } from "@/lib/guides/beaujolais-natural-wine";
import { gangOfFourWineGuide } from "@/lib/guides/gang-of-four-wine";
import { georgiaNaturalWineGuide } from "@/lib/guides/georgia-natural-wine";
import { guyBretonGuide } from "@/lib/guides/guy-breton";
import { jacquesSelosseGuide } from "@/lib/guides/jacques-selosse";
import { jeanFoillardGuide } from "@/lib/guides/jean-foillard";
import { jeanFrancoisGanevatGuide } from "@/lib/guides/jean-francois-ganevat";
import { jeanPaulThevenetGuide } from "@/lib/guides/jean-paul-thevenet";
import { joskoGravnerArticle } from "@/lib/guides/articles/josko-gravner";
import { whatIsNaturalWineArticle } from "@/lib/guides/articles/what-is-natural-wine";
import { whatIsOrangeWineArticle } from "@/lib/guides/articles/what-is-orange-wine";
import { articleHubCard } from "@/lib/guides/guide-types";
import { juraNaturalWineGuide } from "@/lib/guides/jura-natural-wine";
import { marcelLapierreGuide } from "@/lib/guides/marcel-lapierre";
import { pierreOvernoyGuide } from "@/lib/guides/pierre-overnoy";
import { radikonGuide } from "@/lib/guides/radikon";
import { thierryAllemandGuide } from "@/lib/guides/thierry-allemand";
import { worldsBestNaturalChampagneGuide } from "@/lib/guides/worlds-best-natural-champagne";
import { worldsBestOrangeWinesGuide } from "@/lib/guides/worlds-best-orange-wines";

export type GuideHubCard = {
  href: string;
  title: string;
  description: string;
  featured?: boolean;
  kicker?: string;
};

export type GuideHubSection = {
  title: string;
  cards: GuideHubCard[];
};

export type GuideLocaleCopy = {
  home: string;
  hubTitle: string;
  hubMetaTitle: string;
  hubMetaDescription: string;
  hubIntro: string;
  /** @deprecated Prefer hubSections; kept for any flat consumers. */
  hubCards: GuideHubCard[];
  hubSections: GuideHubSection[];
  top10: string;
  mid: string;
  rest: string;
  rank: string;
  name: string;
  region: string;
  country: string;
  grapes: string;
  wine: string;
  producer: string;
  type: string;
  languedocHeading: string;
  shopNaturalWine: string;
  producers: {
    h1: string;
    metaTitle: string;
    metaDescription: string;
    breadcrumbShort: string;
    intro: string[];
    languedocBeforeLinks: string;
    languedocAfterLinks: string;
    crossLinkWines: string;
  };
  wines: {
    h1: string;
    metaTitle: string;
    metaDescription: string;
    breadcrumbShort: string;
    intro: string[];
    languedocBody: string;
    languedocShopLabel: string;
    crossLinkProducers: string;
  };
};

const SV_PRODUCER_CARDS: GuideHubCard[] = [
  {
    ...articleHubCard(joskoGravnerArticle, "sv"),
    featured: true,
  },
];

const SV_GUIDE_CARDS: GuideHubCard[] = [
  articleHubCard(whatIsNaturalWineArticle, "sv"),
  articleHubCard(whatIsOrangeWineArticle, "sv"),
];

const SV_LIST_CARDS: GuideHubCard[] = [
  {
    href: GUIDE_PATHS.producers.sv,
    title: "Världens 100 bästa naturvinsproducenter",
    description:
      "Vår kurerade lista över de hundra producenter som format naturvinets moderna historia.",
  },
  {
    href: GUIDE_PATHS.wines.sv,
    title: "Världens 100 bästa naturviner",
    description:
      "Hundra flaskor som förändrat hur människor tänker om vad vin kan vara.",
  },
];

const SV: GuideLocaleCopy = {
  home: "Hem",
  hubTitle: "Guider",
  hubMetaTitle: "Guider om naturvin | PACT Wines",
  hubMetaDescription:
    "Kurerade guider om naturvin — världens bästa naturvinsproducenter och naturviner.",
  hubIntro:
    "Våra guider täcker producenterna, regionerna och vinerna som betyder något i naturvinsvärlden — från pionjärerna som startade rörelsen till regionerna som definierar den idag. Varje guide bygger på verifierad information, skriven för dig som vill förstå naturvin bortom etiketten.",
  hubCards: [...SV_PRODUCER_CARDS, ...SV_GUIDE_CARDS, ...SV_LIST_CARDS],
  hubSections: [
    {
      title: "Producenter",
      cards: SV_PRODUCER_CARDS,
    },
    {
      title: "Guider",
      cards: SV_GUIDE_CARDS,
    },
    {
      title: "Listor",
      cards: SV_LIST_CARDS,
    },
  ],
  top10: "Topp 10",
  mid: "11–30",
  rest: "31–100",
  rank: "Rank",
  name: "Namn",
  region: "Region",
  country: "Land",
  grapes: "Druvor",
  wine: "Vin",
  producer: "Producent",
  type: "Typ",
  languedocHeading: "Languedoc och Roussillon bland världens bästa",
  shopNaturalWine: "Shoppa naturvin →",
  producers: {
    h1: "Världens 100 bästa naturvinsproducenter",
    metaTitle: "Världens 100 bästa naturvinsproducenter | PACT Wines",
    metaDescription:
      "Vår kurerade lista över de hundra producenter som format naturvinets moderna historia — från Pierre Overnoy till Frank Cornelissen.",
    breadcrumbShort: "100 bästa producenterna",
    intro: [
      "Naturvin är inte en appellation, en certifiering eller en teknik. Det är ett förhållningssätt — att odla utan syntetiska preparat, jäsa med druvans egna jästsvampar och tillsätta ingenting i källaren. Rörelsen har inga officiella regler och ingen central instans som delar ut betyg. Det som finns är producenterna själva, och de vinsamlare, sommelierer och krögare som följt dem i decennier.",
      "Den här listan är vår kurering av de hundra producenter som format naturvinets moderna historia. Vi har prioriterat tre saker: inflytande över rörelsen, konsekvens över tid och genuint terroiruttryck. Pierre Overnoy och Marcel Lapierre är med för att de i praktiken uppfann det moderna naturvinet. Joško Gravner för att han återuppfann det vita vinet. Frank Cornelissen för att han visade hur långt minimal intervention kan drivas.",
      "Vad som inte är med: konventionella prestigehus oavsett kvalitet, och producenter vars viner vi inte kunnat verifiera. Listan gör inte anspråk på att vara objektiv — det finns ingen objektiv rangordning i vin. Den gör anspråk på att vara ärlig.",
      "Geografiskt dominerar Frankrike med Jura, Loire, Beaujolais och Rhône i spetsen, men Italien, Georgien och Österrike är starkt representerade. Tio av producenterna på listan verkar i Languedoc och Roussillon — regionen vi själva importerar från, och en region som gått från massproduktion till att bli ett av naturvinets mest dynamiska områden.",
    ],
    languedocBeforeLinks:
      "Tio av producenterna på listan verkar i Languedoc och Roussillon. Det är samma landskap — samma skifferberg i Faugères, samma höjdlägen i Haute Vallée de l'Orb — som vinerna vi själva importerar kommer ifrån.",
    languedocAfterLinks:
      "Två kopplingar är särskilt direkta. Axel Prüfer i Le Bousquet-d'Orb (#38) är granne med både Hors Saison och Le Bouc à Trois Pattes, och hjälpte Olga Ivanova och Antoine Monod igång när de startade Hors Saison 2021. Didier Barral i Faugères (#71) var lärare åt Yannick Pelletier, vars domän ligger på gränsen mellan Saint-Chinian och Faugères.",
    crossLinkWines: "Världens 100 bästa naturviner →",
  },
  wines: {
    h1: "Världens 100 bästa naturviner",
    metaTitle: "Världens 100 bästa naturviner | PACT Wines",
    metaDescription:
      "Vår kurerade lista över de hundra naturviner som förändrat vinvärlden — från Overnoys Savagnin till Gravners Ribolla Gialla.",
    breadcrumbShort: "100 bästa naturvinerna",
    intro: [
      "Att rangordna vin är alltid ett omöjligt projekt. Ett vin är en årgång, en flaska, ett tillfälle — och naturvin mer än något annat vin varierar från buteljering till buteljering. Ändå finns det viner som betyder mer än andra. Viner som förändrade hur människor tänker om vad vin kan vara.",
      "Den här listan är vår kurering av hundra sådana flaskor. Kriterierna är inte poäng eller pris utan betydelse: har vinet flyttat något? Overnoys Savagnin visade att vin utan svavel kan åldras i decennier. Gravners Ribolla Gialla i amfora skapade i praktiken det moderna orangevinet. Allemands Cornas bevisade att naturvin kan nå klassisk storhet.",
      "Fördelningen speglar naturvinets tyngdpunkter. Frankrike dominerar med sjuttio viner, med Jura, Beaujolais, Loire och Rhône som kärnan. Italien följer med arton, framför allt Friuli och Etna. Georgien, Österrike, Slovenien, Spanien och Tyskland är representerade. Fyrtiotvå röda, trettio vita, elva orange, elva champagne, fyra mousserande och två roséviner.",
      "Vi har medvetet utelämnat konventionella prestigeviner oavsett kvalitet, och alla viner vars existens och cuvénamn vi inte kunnat verifiera. Ett påhittat cuvénamn skadar en lista mer än en utelämnad flaska.",
      "Sex av vinerna kommer från Languedoc och Roussillon — regionen vi själva importerar från. Det säger något om hur långt södra Frankrike kommit från sitt rykte som volymproducent.",
    ],
    languedocBody:
      "Sex av vinerna på listan kommer från Languedoc och Roussillon — samma landskap som vinerna vi själva importerar. Utforska vårt sortiment från regionen i",
    languedocShopLabel: "naturvin från Languedoc",
    crossLinkProducers: "Världens 100 bästa naturvinsproducenter →",
  },
};

const EN_PRODUCER_CARDS: GuideHubCard[] = [
  {
    href: pierreOvernoyGuide.hubCard.href,
    title: pierreOvernoyGuide.hubCard.title,
    description: pierreOvernoyGuide.hubCard.description,
    featured: true,
  },
  {
    href: thierryAllemandGuide.hubCard.href,
    title: thierryAllemandGuide.hubCard.title,
    description: thierryAllemandGuide.hubCard.description,
  },
  articleHubCard(joskoGravnerArticle, "en"),
  {
    href: jeanFrancoisGanevatGuide.hubCard.href,
    title: jeanFrancoisGanevatGuide.hubCard.title,
    description: jeanFrancoisGanevatGuide.hubCard.description,
  },
  {
    href: jeanFoillardGuide.hubCard.href,
    title: jeanFoillardGuide.hubCard.title,
    description: jeanFoillardGuide.hubCard.description,
  },
  {
    href: marcelLapierreGuide.hubCard.href,
    title: marcelLapierreGuide.hubCard.title,
    description: marcelLapierreGuide.hubCard.description,
  },
  {
    href: radikonGuide.hubCard.href,
    title: radikonGuide.hubCard.title,
    description: radikonGuide.hubCard.description,
  },
  {
    href: jacquesSelosseGuide.hubCard.href,
    title: jacquesSelosseGuide.hubCard.title,
    description: jacquesSelosseGuide.hubCard.description,
  },
  {
    href: guyBretonGuide.hubCard.href,
    title: guyBretonGuide.hubCard.title,
    description: guyBretonGuide.hubCard.description,
  },
  {
    href: jeanPaulThevenetGuide.hubCard.href,
    title: jeanPaulThevenetGuide.hubCard.title,
    description: jeanPaulThevenetGuide.hubCard.description,
  },
  {
    href: gangOfFourWineGuide.hubCard.href,
    title: gangOfFourWineGuide.hubCard.title,
    description: gangOfFourWineGuide.hubCard.description,
  },
];

const EN_REGION_CARDS: GuideHubCard[] = [
  {
    href: juraNaturalWineGuide.hubCard.href,
    title: juraNaturalWineGuide.hubCard.title,
    description: juraNaturalWineGuide.hubCard.description,
  },
  {
    href: beaujolaisNaturalWineGuide.hubCard.href,
    title: beaujolaisNaturalWineGuide.hubCard.title,
    description: beaujolaisNaturalWineGuide.hubCard.description,
  },
  {
    href: georgiaNaturalWineGuide.hubCard.href,
    title: georgiaNaturalWineGuide.hubCard.title,
    description: georgiaNaturalWineGuide.hubCard.description,
  },
];

const EN_LIST_CARDS: GuideHubCard[] = [
  {
    href: GUIDE_PATHS.producers.en,
    title: "The World's 100 Best Natural Wine Producers",
    description:
      "Our curated list of the hundred producers who shaped the modern history of natural wine.",
  },
  {
    href: GUIDE_PATHS.wines.en,
    title: "The World's 100 Best Natural Wines",
    description:
      "A hundred bottles that changed how people think about what wine can be.",
  },
  {
    href: worldsBestOrangeWinesGuide.hubCard.href,
    title: worldsBestOrangeWinesGuide.hubCard.title,
    description: worldsBestOrangeWinesGuide.hubCard.description,
  },
  {
    href: worldsBestNaturalChampagneGuide.hubCard.href,
    title: worldsBestNaturalChampagneGuide.hubCard.title,
    description: worldsBestNaturalChampagneGuide.hubCard.description,
  },
];

const EN_GUIDE_CARDS: GuideHubCard[] = [
  articleHubCard(whatIsNaturalWineArticle, "en"),
  articleHubCard(whatIsOrangeWineArticle, "en"),
];

const EN: GuideLocaleCopy = {
  home: "Home",
  hubTitle: "Natural Wine Guides",
  hubMetaTitle: "Natural Wine Guides | PACT Wines",
  hubMetaDescription:
    "Guides to the producers, regions and wines that define the natural wine world — from Pierre Overnoy to Georgian qvevri.",
  hubIntro:
    "Our guides cover the producers, regions and wines that matter in the natural wine world — from the pioneers who started the movement to the regions that define it today. Each guide is built on verified information, written for people who want to understand natural wine beyond the label.",
  hubCards: [
    ...EN_PRODUCER_CARDS,
    ...EN_REGION_CARDS,
    ...EN_GUIDE_CARDS,
    ...EN_LIST_CARDS,
  ],
  hubSections: [
    { title: "Producers", cards: EN_PRODUCER_CARDS },
    { title: "Regions", cards: EN_REGION_CARDS },
    { title: "Guides", cards: EN_GUIDE_CARDS },
    { title: "Lists", cards: EN_LIST_CARDS },
  ],
  top10: "Top 10",
  mid: "11–30",
  rest: "31–100",
  rank: "Rank",
  name: "Name",
  region: "Region",
  country: "Country",
  grapes: "Grapes",
  wine: "Wine",
  producer: "Producer",
  type: "Type",
  languedocHeading: "Languedoc and Roussillon among the world's best",
  shopNaturalWine: "Shop natural wine →",
  producers: {
    h1: "The World's 100 Best Natural Wine Producers",
    metaTitle: "The World's 100 Best Natural Wine Producers | PACT Wines",
    metaDescription:
      "Our curated list of the hundred producers who shaped the modern history of natural wine — from Pierre Overnoy to Frank Cornelissen.",
    breadcrumbShort: "100 best producers",
    intro: [
      "Natural wine is not an appellation, a certification or a technique. It is an approach — farming without synthetic inputs, fermenting with the grape's own wild yeasts and adding nothing in the cellar. The movement has no official rules and no central body handing out scores. What it has is the producers themselves, and the collectors, sommeliers and restaurateurs who have followed them for decades.",
      "This list is our curation of the hundred producers who shaped the modern history of natural wine. We prioritised three things: influence on the movement, consistency over time and genuine expression of terroir. Pierre Overnoy and Marcel Lapierre are here because they effectively invented modern natural wine. Joško Gravner because he reinvented white wine. Frank Cornelissen because he showed how far minimal intervention can be pushed.",
      "What is not here: conventional prestige estates regardless of quality, and producers whose wines we could not verify. The list makes no claim to objectivity — there is no objective ranking in wine. It claims only to be honest.",
      "Geographically France dominates, led by the Jura, Loire, Beaujolais and Rhône, but Italy, Georgia and Austria are strongly represented. Ten of the producers on the list work in Languedoc and Roussillon — the region we import from ourselves, and one that has gone from mass production to becoming one of natural wine's most dynamic areas.",
    ],
    languedocBeforeLinks:
      "Ten of the producers on this list work in Languedoc and Roussillon. It is the same landscape — the same schist hills in Faugères, the same altitude sites in the Haute Vallée de l'Orb — that the wines we import ourselves come from.",
    languedocAfterLinks:
      "Two connections are especially direct. Axel Prüfer in Le Bousquet-d'Orb (#38) is a neighbour of both Hors Saison and Le Bouc à Trois Pattes, and helped Olga Ivanova and Antoine Monod get started when they founded Hors Saison in 2021. Didier Barral in Faugères (#71) taught Yannick Pelletier, whose domaine sits on the border between Saint-Chinian and Faugères.",
    crossLinkWines: "The World's 100 Best Natural Wines →",
  },
  wines: {
    h1: "The World's 100 Best Natural Wines",
    metaTitle: "The World's 100 Best Natural Wines | PACT Wines",
    metaDescription:
      "Our curated list of the hundred natural wines that changed the wine world — from Overnoy's Savagnin to Gravner's Ribolla Gialla.",
    breadcrumbShort: "100 best natural wines",
    intro: [
      "Ranking wine is always an impossible project. A wine is a vintage, a bottle, an occasion — and natural wine more than any other varies from bottling to bottling. Yet some wines matter more than others. Wines that changed how people think about what wine can be.",
      "This list is our curation of a hundred such bottles. The criteria are not scores or price but significance: did the wine move something? Overnoy's Savagnin proved that wine without sulphur can age for decades. Gravner's Ribolla Gialla in amphora effectively created modern orange wine. Allemand's Cornas proved that natural wine can reach classical greatness.",
      "The distribution reflects natural wine's centres of gravity. France dominates with seventy wines, with the Jura, Beaujolais, Loire and Rhône at the core. Italy follows with eighteen, above all Friuli and Etna. Georgia, Austria, Slovenia, Spain and Germany are represented. Forty-two red, thirty white, eleven orange, eleven champagne, four sparkling and two rosé.",
      "We have deliberately left out conventional prestige wines regardless of quality, and every wine whose existence and cuvée name we could not verify. A fabricated cuvée name damages a list more than an omitted bottle.",
      "Six of the wines come from Languedoc and Roussillon — the region we import from ourselves. That says something about how far southern France has come from its reputation as a volume producer.",
    ],
    languedocBody:
      "Six of the wines on this list come from Languedoc and Roussillon — the same landscape as the wines we import ourselves. Explore our selection from the region in",
    languedocShopLabel: "natural wine from Languedoc",
    crossLinkProducers: "The World's 100 Best Natural Wine Producers →",
  },
};

export function guideCopy(locale: AppLocale): GuideLocaleCopy {
  return locale === "en" ? EN : SV;
}

export function entryDescription(
  entry: { description?: string; descriptionEn?: string },
  locale: AppLocale,
): string | undefined {
  if (locale === "en") {
    return entry.descriptionEn ?? entry.description;
  }
  return entry.description;
}
