import type { AppLocale } from "@/lib/i18n/locale";
import type { WineRegionSlug } from "@/lib/wine-regions";

/**
 * Marketing-owned copy slots for region landing pages.
 * Only Languedoc has an intro (direct-buy / shared pallets). Other regions
 * must not use grossist/wholesaler/samlastad/pallet wording.
 */
export type WineRegionSection = {
  heading: string;
  body: string;
};

export type WineRegionContentFields = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  /** One-line intro under H1. Empty → render nothing. */
  intro?: string | null;
  characteristicsHeading?: string | null;
  characteristicsBody?: string | null;
  locationBlurb?: string | null;
  /** Editorial H2 blocks from Margaux drafts (headings); bodies filled as available. */
  sections?: WineRegionSection[] | null;
};

export type WineRegionContentMap = Partial<
  Record<WineRegionSlug, Partial<Record<AppLocale, WineRegionContentFields>>>
>;

/** Per-region SV+EN copy. Languedoc keeps the only pallet/direct intro. */
export const WINE_REGION_CONTENT: WineRegionContentMap = {
  languedoc: {
    sv: {
      intro: "Naturvin från Languedoc som vi köper direkt av producenterna och skickar på delade pallar.",
      locationBlurb: "Södra Frankrike, Medelhavet och Cevennerna.",
      sections: [
        {
          heading: "Vad kännetecknar naturvin från Languedoc?",
          body: "Languedoc är Frankrikes största vinregion till ytan. Skiffer, kalksten och garrigue präglar appellationer från Minervois till Faugères. Naturvinsodlare arbetar ofta med gamla stockar av Carignan, Grenache, Syrah och Cinsault.",
        },
        {
          heading: "Var ligger Languedoc?",
          body: "",
        },
        {
          heading: "Druvorna",
          body: "Röda druvor dominerar: Carignan, Grenache, Syrah, Mourvèdre och Cinsault. Vita cuvéer bygger ofta på Grenache Blanc, Clairette, Macabeu eller Rolle. Blandningar är vanliga; enkla druvviner förekommer också. Regionen ger röda, vita, orange och mousserande naturviner. Medelhavsvärme möter svalare höjdlägen, så samma druva kan ge både fruktig och mer stram karaktär beroende på plats.",
        },
        {
          heading: "Appellationer och Vin de France",
          body: "",
        },
        {
          heading: "Hur vi köper vinerna från Languedoc",
          body: "",
        },
      ],
    },
    en: {
      intro: "Natural wine from the Languedoc, bought directly from the producers and shipped on shared pallets.",
      locationBlurb: "Southern France, between the Mediterranean and the Cévennes.",
      sections: [
        {
          heading: "What characterises natural wine from the Languedoc?",
          body: "The Languedoc is France's largest wine region by area. Schist, limestone and garrigue mark appellations from Minervois to Faugères. Natural growers often work old vines of Carignan, Grenache, Syrah and Cinsault.",
        },
        {
          heading: "Where is the Languedoc?",
          body: "",
        },
        {
          heading: "The grapes",
          body: "Red varieties dominate: Carignan, Grenache, Syrah, Mourvèdre and Cinsault. White cuvées often build on Grenache Blanc, Clairette, Macabeu or Rolle. Blends are common; single-variety bottles appear too. The region yields red, white, orange and sparkling natural wines. Mediterranean heat meets cooler altitudes, so the same grape can read fruity or more taut depending on site.",
        },
        {
          heading: "Appellations and Vin de France",
          body: "",
        },
        {
          heading: "How PACT buys its Languedoc wines",
          body: "",
        },
      ],
    },
  },
  beaujolais: {
    sv: {
      locationBlurb: "Östra Frankrike, söder om Bourgogne, på granitjordar.",
      sections: [
        {
          heading: "Vad kännetecknar naturvin från Beaujolais?",
          body: "Beaujolais ligger söder om Bourgogne. Gamay på granit är kärnan. Crus som Morgon, Fleurie och Côte de Brouilly visar hur samma druva skiftar med by och jord.",
        },
        {
          heading: "Gamay och granit",
          body: "Gamay är den dominerande röda druvan. Vita viner är ovanligare och bygger oftast på Chardonnay. Naturvinsproducenter arbetar ofta med hela klasar och kort eller ingen tillsats av svavel. Rött vin är huvudspåret — från lätta village-viner till mer strukturerade crus. Enstaka vita och mousserande flaskor kompletterar urvalet när de finns hos PACT.",
        },
        {
          heading: "De tio cru-byarna",
          body: "",
        },
        {
          heading: "Beaujolais, Beaujolais-Villages och cru",
          body: "",
        },
        {
          heading: "Naturvinsrörelsen i Beaujolais",
          body: "",
        },
      ],
    },
    en: {
      locationBlurb: "Eastern France, south of Burgundy, on granite soils.",
      sections: [
        {
          heading: "What characterises natural wine from Beaujolais?",
          body: "Beaujolais sits south of Burgundy. Gamay on granite is the core. Crus such as Morgon, Fleurie and Côte de Brouilly show how the same grape shifts with village and soil.",
        },
        {
          heading: "Gamay and granite",
          body: "",
        },
        {
          heading: "The ten crus",
          body: "",
        },
        {
          heading: "Beaujolais, Villages and cru",
          body: "",
        },
        {
          heading: "The natural wine movement",
          body: "",
        },
      ],
    },
  },
  loire: {
    sv: {
      locationBlurb: "Nordvästra Frankrike längs Loiredalen.",
      sections: [
        {
          heading: "Vad kännetecknar naturvin från Loire?",
          body: "Loire sträcker sig från Atlanten inåt landet. Klimat och jordar skiftar kraftigt mellan Muscadet, Anjou, Touraine och övre Loire. Naturvin har en stark närvaro i flera delar av dalen.",
        },
        {
          heading: "Loiredalens delområden",
          body: "",
        },
        {
          heading: "Druvorna",
          body: "Chenins blanc, Cabernet Franc, Sauvignon Blanc, Melon de Bourgogne och Grolleau är vanliga. Röda, vita och mousserande stilar delar ofta samma appellationsgeografi. Urvalet kan omfatta torra och söta vita, lätta till medelfylla röda, rosé och pet-nat. Svalare lägen ger ofta hög syra och tydlig platsprägel.",
        },
        {
          heading: "Vitt, rött och mousserande från Loire",
          body: "",
        },
      ],
    },
    en: {
      locationBlurb: "North-western France along the Loire Valley.",
      sections: [
        {
          heading: "What characterises natural wine from the Loire?",
          body: "The Loire runs inland from the Atlantic. Climate and soils shift sharply between Muscadet, Anjou, Touraine and the upper Loire. Natural wine has a strong presence in several parts of the valley.",
        },
        {
          heading: "Sub-regions of the Loire Valley",
          body: "",
        },
        {
          heading: "The grapes",
          body: "Chenin Blanc, Cabernet Franc, Sauvignon Blanc, Melon de Bourgogne and Grolleau are common. Red, white and sparkling styles often share the same appellation geography. The selection can include dry and sweet whites, light to mid-weight reds, rosé and pet-nat. Cooler sites often bring high acidity and a clear sense of place.",
        },
        {
          heading: "White, red and sparkling",
          body: "",
        },
      ],
    },
  },
  bourgogne: {
    sv: {
      locationBlurb: "Östra Frankrike, mellan Dijon och Mâconnais.",
      sections: [
        {
          heading: "Vad kännetecknar naturvin från Bourgogne?",
          body: "Bourgogne är indelad i byar och klimat där Pinot Noir och Chardonnay är huvuddruvor. Naturvinsorienterade odlare finns i flera delar av regionen, ofta i mindre volymer.",
        },
        {
          heading: "Druvorna",
          body: "Pinot Noir och Chardonnay dominerar. Aligoté och Gamay förekommer i vissa lägen. Parcelltänkande är vanligt även hos mindre domäner. Röda och vita stilla viner är kärnan. Enstaka mousserande eller orange flaskor kan synas i urvalet när de finns.",
        },
        {
          heading: "Regionerna från norr till söder",
          body: "",
        },
        {
          heading: "Appellationernas nivåer",
          body: "",
        },
        {
          heading: "Vit Bourgogne och Crémant de Bourgogne",
          body: "",
        },
      ],
    },
    en: {
      locationBlurb: "Eastern France, between Dijon and the Mâconnais.",
      sections: [
        {
          heading: "What characterises natural wine from Burgundy?",
          body: "Burgundy is organised by village and climate, with Pinot Noir and Chardonnay as the main grapes. Natural-leaning growers work across several parts of the region, often in small volumes.",
        },
        {
          heading: "The grapes",
          body: "Pinot Noir and Chardonnay dominate. Aligoté and Gamay appear in some sites. Parcel-level thinking is common even at smaller domaines. Still reds and whites are the core. Occasional sparkling or orange bottles can appear in the selection when available.",
        },
        {
          heading: "The Burgundy wine regions from north to south",
          body: "",
        },
        {
          heading: "Appellation levels",
          body: "",
        },
        {
          heading: "White Burgundy and Crémant de Bourgogne",
          body: "",
        },
      ],
    },
  },
  jura: {
    sv: {
      locationBlurb: "Östra Frankrike nära den schweiziska gränsen.",
      sections: [
        {
          heading: "Vad kännetecknar naturvin från Jura?",
          body: "Jura är en liten, sval region. Savagnin, Poulsard och Trousseau ger stilar som skiljer sig från grannregionerna. Ouillé och sous voile är två parallella vita vägar.\n\nJura ligger i östra Frankrike, i departementet med samma namn, mellan Bourgogne i väster och den schweiziska gränsen i öster [1]. Vingårdarna ligger på sluttningarna mellan Jurabergen och Bresseslätten, i ett smalt band från trakten norr om Arbois ner mot Lons-le-Saunier och vidare söderut. Jämfört med grannarna Bourgogne och Alsace är regionen liten.",
        },
        {
          heading: "Druvorna",
          body: "Vita: Savagnin och Chardonnay. Röda: Poulsard (Ploussard), Trousseau och Pinot Noir. Lokala druvor belönar låg intervention i källaren. Ouillé vita, oxidativa sous voile-viner, ljusa röda och ibland vin jaune-besläktade flaskor. Urvalet visar vilka cuvéer som finns hos PACT just nu.",
        },
        {
          heading: "Ouillé och sous voile",
          body: "",
        },
        {
          heading: "Vin jaune",
          body: "",
        },
        {
          heading: "Appellationer",
          body: "",
        },
      ],
    },
    en: {
      locationBlurb: "Eastern France near the Swiss border.",
      sections: [
        {
          heading: "What characterises natural wine from the Jura?",
          body: "The Jura is a small, cool region. Savagnin, Poulsard and Trousseau yield styles unlike neighbouring regions. Ouillé and sous voile are two parallel white paths.\n\nThe Jura lies in eastern France, in the department of the same name, between Burgundy to the west and the Swiss border to the east [1]. The vineyards sit on the slopes between the Jura mountains and the Bresse plain, in a narrow band from north of Arbois down toward Lons-le-Saunier and further south. Compared with its neighbours Burgundy and Alsace, it is a small region.",
        },
        {
          heading: "The grapes",
          body: "Whites: Savagnin and Chardonnay. Reds: Poulsard (Ploussard), Trousseau and Pinot Noir. Local grapes reward low intervention in the cellar. Ouillé whites, oxidative sous-voile wines, pale reds and occasional vin jaune-related bottles. The selection shows which cuvées PACT has right now.",
        },
        {
          heading: "Ouillé and sous voile",
          body: "",
        },
        {
          heading: "Vin jaune",
          body: "",
        },
        {
          heading: "Appellations",
          body: "",
        },
      ],
    },
  },
  champagne: {
    sv: {
      locationBlurb: "Nordöstra Frankrike, svalt klimat på kritjordar.",
      sections: [
        {
          heading: "Vad kännetecknar naturvin från Champagne?",
          body: "Champagne är en sval region på krita och kalksten. Naturorienterade odlare arbetar ofta med lägre dosage och mer restriktiv tillsats i källaren än den klassiska standardproduktionen.",
        },
        {
          heading: "Var ligger Champagne?",
          body: "",
        },
        {
          heading: "Druvorna",
          body: "Pinot Noir, Chardonnay och Meunier är de tre huvuddruvorna. Enstaka andra tillåtna sorter kan förekomma hos mindre odlare. Mousserande vin är kärnan. Stillviner (Coteaux Champenois) är mer sällsynta i urvalet när de finns hos PACT.",
        },
        {
          heading: "Champagnemetoden",
          body: "",
        },
        {
          heading: "Brut nature och dosage",
          body: "",
        },
      ],
    },
    en: {
      locationBlurb: "North-eastern France, cool climate on chalk soils.",
      sections: [
        {
          heading: "What characterises natural wine from Champagne?",
          body: "Champagne is a cool region on chalk and limestone. Natural-leaning growers often work with lower dosage and more restrained cellar additions than classic standard production.",
        },
        {
          heading: "Where is Champagne?",
          body: "",
        },
        {
          heading: "The grapes",
          body: "Pinot Noir, Chardonnay and Meunier are the three main grapes. Occasional other permitted varieties appear at smaller growers. Sparkling wine is the core. Still wines (Coteaux Champenois) are rarer in the selection when they are available.",
        },
        {
          heading: "The traditional method",
          body: "",
        },
        {
          heading: "Brut nature and dosage",
          body: "",
        },
      ],
    },
  },
  rhone: {
    sv: {
      locationBlurb: "Sydöstra Frankrike längs Rhônedalen.",
      sections: [
        {
          heading: "Vad kännetecknar naturvin från Rhône?",
          body: "Rhônedalen delar sig i norr och syd. Norra delen är ofta Syrah på branta sluttningar; söderut blandas Grenache, Syrah, Mourvèdre och flera vita sorter.",
        },
        {
          heading: "Norra och södra Rhône",
          body: "",
        },
        {
          heading: "Druvorna",
          body: "Syrah i norr; Grenache, Syrah, Mourvèdre, Cinsault och Carignan i syd. Vita: Viognier, Marsanne, Roussanne, Grenache Blanc med flera. Röda, vita och ibland rosé eller orange. Urvalet visar vilka appellationer och cuvéer som finns hos PACT just nu.",
        },
        {
          heading: "Côtes du Rhône",
          body: "",
        },
      ],
    },
    en: {
      locationBlurb: "South-eastern France along the Rhône Valley.",
      sections: [
        {
          heading: "What characterises natural wine from the Rhône Valley?",
          body: "The Rhône Valley splits north and south. The north is often Syrah on steep slopes; the south blends Grenache, Syrah, Mourvèdre and several white varieties.",
        },
        {
          heading: "Northern and southern Rhône",
          body: "",
        },
        {
          heading: "The grapes",
          body: "Syrah in the north; Grenache, Syrah, Mourvèdre, Cinsault and Carignan in the south. Whites include Viognier, Marsanne, Roussanne, Grenache Blanc and others. Reds, whites and occasional rosé or orange. The selection shows which appellations and cuvées PACT has right now.",
        },
        {
          heading: "Côtes du Rhône",
          body: "",
        },
      ],
    },
  },
  roussillon: {
    sv: {
      locationBlurb: "Längst söderut i Frankrike, mot Pyrenéerna och Medelhavet.",
      sections: [
        {
          heading: "Vad kännetecknar naturvin från Roussillon?",
          body: "Roussillon ligger mot Pyrenéerna och Medelhavet. Skiffer, granit och varmt klimat ger koncentrerad frukt. Naturvinsodlare arbetar ofta med gamla stockar och torrodling.",
        },
        {
          heading: "Var ligger Roussillon?",
          body: "",
        },
        {
          heading: "Druvorna",
          body: "Grenache (noir, gris, blanc), Carignan, Syrah, Mourvèdre och Macabeu är vanliga. Vita och orange cuvéer bygger ofta på Grenache Blanc eller Macabeu. Röda, vita, orange och söta traditionella stilar kan förekomma. Urvalet visar vad som finns hos PACT just nu.",
        },
        {
          heading: "Torra viner: AOP, IGP och Vin de France",
          body: "",
        },
        {
          heading: "Vin doux naturel",
          body: "",
        },
      ],
    },
    en: {
      locationBlurb: "Far southern France, toward the Pyrenees and the Mediterranean.",
      sections: [
        {
          heading: "What characterises natural wine from Roussillon?",
          body: "Roussillon faces the Pyrenees and the Mediterranean. Schist, granite and a warm climate give concentrated fruit. Natural growers often work old vines and dry farming.",
        },
        {
          heading: "Where is Roussillon?",
          body: "",
        },
        {
          heading: "The grapes",
          body: "Grenache (noir, gris, blanc), Carignan, Syrah, Mourvèdre and Macabeu are common. White and orange cuvées often build on Grenache Blanc or Macabeu. Reds, whites, orange and traditional sweet styles can appear. The selection shows what PACT has right now.",
        },
        {
          heading: "Dry wines: AOP, IGP and Vin de France",
          body: "",
        },
        {
          heading: "Vin doux naturel",
          body: "",
        },
      ],
    },
  },
  alsace: {
    sv: {
      locationBlurb: "Nordöstra Frankrike längs Vogeserna.",
      sections: [
        {
          heading: "Vad kännetecknar naturvin från Alsace?",
          body: "Alsace ligger längs Vogeserna med varierande jordar och ett torrt regnskuggesklimat. Vita druvor och tydlig sortprägel är kännetecken; naturvinsodlare finns i flera byar.",
        },
        {
          heading: "Var ligger Alsace?",
          body: "",
        },
        {
          heading: "Druvorna",
          body: "Riesling, Pinot Blanc, Pinot Gris, Gewurztraminer, Muscat och Auxerrois är vanliga. Pinot Noir är den viktigaste röda druvan. Torra och mer aromatiska vita, orange, enstaka röda och pet-nat. Urvalet visar vad som finns hos PACT just nu.",
        },
        {
          heading: "Grand cru",
          body: "",
        },
        {
          heading: "Crémant d'Alsace",
          body: "",
        },
      ],
    },
    en: {
      locationBlurb: "North-eastern France along the Vosges.",
      sections: [
        {
          heading: "What characterises natural wine from Alsace?",
          body: "Alsace runs along the Vosges with varied soils and a dry rain-shadow climate. White grapes and clear varietal character are hallmarks; natural growers work in several villages.",
        },
        {
          heading: "Where is Alsace?",
          body: "",
        },
        {
          heading: "The grapes",
          body: "Riesling, Pinot Blanc, Pinot Gris, Gewurztraminer, Muscat and Auxerrois are common. Pinot Noir is the main red grape. Dry and more aromatic whites, orange, occasional reds and pet-nat. The selection shows what PACT has right now.",
        },
        {
          heading: "Grand cru",
          body: "",
        },
        {
          heading: "Crémant d'Alsace",
          body: "",
        },
      ],
    },
  },
  "sud-ouest": {
    sv: {
      locationBlurb: "Sydvästra Frankrike, från Atlanten till foten av Pyrenéerna.",
      sections: [
        {
          heading: "Vad kännetecknar naturvin från Sydvästra Frankrike?",
          body: "Sud-Ouest samlar appellationer från Atlantkusten inåt landet. Lokala druvor och varierande klimat ger en bred stilpalett som skiljer sig från Bordeaux och Languedoc.",
        },
        {
          heading: "Delområdena",
          body: "",
        },
        {
          heading: "Druvorna",
          body: "Lokala sorter som Negrette, Fer Servadou, Tannat, Manseng och Mauzac förekommer tillsammans med mer kända franska druvor beroende på appellation. Röda, vita och mousserande stilar kan synas i urvalet. Urvalet speglar aktuella producenter hos PACT.",
        },
        {
          heading: "Cahors och Jurançon",
          body: "",
        },
      ],
    },
    en: {
      locationBlurb: "South-western France, from the Atlantic to the foothills of the Pyrenees.",
      sections: [
        {
          heading: "What characterises natural wine from Southwest France?",
          body: "Southwest France gathers appellations from the Atlantic inland. Local grapes and varied climates give a style range distinct from Bordeaux and the Languedoc.",
        },
        {
          heading: "The wine areas of Southwest France",
          body: "",
        },
        {
          heading: "The grapes",
          body: "Local varieties such as Négrette, Fer Servadou, Tannat, Manseng and Mauzac appear alongside better-known French grapes depending on the appellation. Red, white and sparkling styles can appear in the selection. The selection reflects current producers at PACT.",
        },
        {
          heading: "Cahors and Jurançon",
          body: "",
        },
      ],
    },
  },
};

export function getWineRegionContent(
  slug: WineRegionSlug,
  locale: AppLocale,
): WineRegionContentFields {
  return WINE_REGION_CONTENT[slug]?.[locale] ?? {};
}

export function wineRegionContentHasBody(
  content: WineRegionContentFields,
): boolean {
  return Boolean(
    content.characteristicsHeading?.trim() ||
      content.characteristicsBody?.trim() ||
      content.locationBlurb?.trim() ||
      (content.sections?.length ?? 0) > 0,
  );
}

/** Editorial H2 sections (Margaux headings; empty body still renders the H2). */
export function getWineRegionSections(
  slug: WineRegionSlug,
  locale: AppLocale,
): WineRegionSection[] {
  const sections = getWineRegionContent(slug, locale).sections;
  if (!sections?.length) return [];
  return sections.filter((s) => s.heading.trim());
}
