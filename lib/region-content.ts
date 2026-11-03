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
  /** Editorial H2 blocks (geography, grapes & styles, …). */
  sections?: WineRegionSection[] | null;
};

export type WineRegionContentMap = Partial<
  Record<WineRegionSlug, Partial<Record<AppLocale, WineRegionContentFields>>>
>;

/** Per-region SV+EN copy. Languedoc keeps the only pallet/direct intro. */
export const WINE_REGION_CONTENT: WineRegionContentMap = {
  languedoc: {
    sv: {
      intro:
        "Naturvin från Languedoc som vi köper direkt av producenterna och skickar på delade pallar.",
      locationBlurb: "Södra Frankrike, Medelhavet och Cevennerna.",
      sections: [
        {
          heading: "Om Languedoc",
          body: "Languedoc är Frankrikes största vinregion till ytan. Skiffer, kalksten och garrigue präglar appellationer från Minervois till Faugères. Naturvinsodlare arbetar ofta med gamla stockar av Carignan, Grenache, Syrah och Cinsault.",
        },
        {
          heading: "Druvor och stilar i Languedoc",
          body: "Röda druvor dominerar: Carignan, Grenache, Syrah, Mourvèdre och Cinsault. Vita cuvéer bygger ofta på Grenache Blanc, Clairette, Macabeu eller Rolle. Blandningar är vanliga; enkla druvviner förekommer också. Regionen ger röda, vita, orange och mousserande naturviner. Medelhavsvärme möter svalare höjdlägen, så samma druva kan ge både fruktig och mer stram karaktär beroende på plats.",
        },
      ],
    },
    en: {
      intro:
        "Natural wine from the Languedoc, bought directly from the producers and shipped on shared pallets.",
      locationBlurb: "Southern France, between the Mediterranean and the Cévennes.",
      sections: [
        {
          heading: "About the Languedoc",
          body: "The Languedoc is France's largest wine region by area. Schist, limestone and garrigue mark appellations from Minervois to Faugères. Natural growers often work old vines of Carignan, Grenache, Syrah and Cinsault.",
        },
        {
          heading: "Grapes and styles in the Languedoc",
          body: "Red varieties dominate: Carignan, Grenache, Syrah, Mourvèdre and Cinsault. White cuvées often build on Grenache Blanc, Clairette, Macabeu or Rolle. Blends are common; single-variety bottles appear too. The region yields red, white, orange and sparkling natural wines. Mediterranean heat meets cooler altitudes, so the same grape can read fruity or more taut depending on site.",
        },
      ],
    },
  },
  beaujolais: {
    sv: {
      locationBlurb: "Östra Frankrike, söder om Bourgogne, på granitjordar.",
      sections: [
        {
          heading: "Om Beaujolais",
          body: "Beaujolais ligger söder om Bourgogne. Gamay på granit är kärnan. Crus som Morgon, Fleurie och Côte de Brouilly visar hur samma druva skiftar med by och jord.",
        },
        {
          heading: "Druvor och stilar i Beaujolais",
          body: "Gamay är den dominerande röda druvan. Vita viner är ovanligare och bygger oftast på Chardonnay. Naturvinsproducenter arbetar ofta med hela klasar och kort eller ingen tillsats av svavel. Rött vin är huvudspåret — från lätta village-viner till mer strukturerade crus. Enstaka vita och mousserande flaskor kompletterar urvalet när de finns hos PACT.",
        },
      ],
    },
    en: {
      locationBlurb: "Eastern France, south of Burgundy, on granite soils.",
      sections: [
        {
          heading: "About Beaujolais",
          body: "Beaujolais sits south of Burgundy. Gamay on granite is the core. Crus such as Morgon, Fleurie and Côte de Brouilly show how the same grape shifts with village and soil.",
        },
        {
          heading: "Grapes and styles in Beaujolais",
          body: "Gamay is the dominant red grape. White wines are rarer and usually based on Chardonnay. Natural growers often work whole clusters with little or no added sulphur. Red wine is the main path — from lighter village bottles to more structured crus. Occasional white and sparkling bottles appear when they are in the selection.",
        },
      ],
    },
  },
  loire: {
    sv: {
      locationBlurb: "Nordvästra Frankrike längs Loiredalen.",
      sections: [
        {
          heading: "Om Loire",
          body: "Loire sträcker sig från Atlanten inåt landet. Klimat och jordar skiftar kraftigt mellan Muscadet, Anjou, Touraine och övre Loire. Naturvin har en stark närvaro i flera delar av dalen.",
        },
        {
          heading: "Druvor och stilar i Loire",
          body: "Chenins blanc, Cabernet Franc, Sauvignon Blanc, Melon de Bourgogne och Grolleau är vanliga. Röda, vita och mousserande stilar delar ofta samma appellationsgeografi. Urvalet kan omfatta torra och söta vita, lätta till medelfylla röda, rosé och pet-nat. Svalare lägen ger ofta hög syra och tydlig platsprägel.",
        },
      ],
    },
    en: {
      locationBlurb: "North-western France along the Loire Valley.",
      sections: [
        {
          heading: "About the Loire",
          body: "The Loire runs inland from the Atlantic. Climate and soils shift sharply between Muscadet, Anjou, Touraine and the upper Loire. Natural wine has a strong presence in several parts of the valley.",
        },
        {
          heading: "Grapes and styles in the Loire",
          body: "Chenin Blanc, Cabernet Franc, Sauvignon Blanc, Melon de Bourgogne and Grolleau are common. Red, white and sparkling styles often share the same appellation geography. The selection can include dry and sweet whites, light to mid-weight reds, rosé and pét-nat. Cooler sites often bring high acidity and a clear sense of place.",
        },
      ],
    },
  },
  bourgogne: {
    sv: {
      locationBlurb: "Östra Frankrike, mellan Dijon och Mâconnais.",
      sections: [
        {
          heading: "Om Bourgogne",
          body: "Bourgogne är indelad i byar och klimat där Pinot Noir och Chardonnay är huvuddruvor. Naturvinsorienterade odlare finns i flera delar av regionen, ofta i mindre volymer.",
        },
        {
          heading: "Druvor och stilar i Bourgogne",
          body: "Pinot Noir och Chardonnay dominerar. Aligoté och Gamay förekommer i vissa lägen. Parcelltänkande är vanligt även hos mindre domäner. Röda och vita stilla viner är kärnan. Enstaka mousserande eller orange flaskor kan synas i urvalet när de finns.",
        },
      ],
    },
    en: {
      locationBlurb: "Eastern France, between Dijon and the Mâconnais.",
      sections: [
        {
          heading: "About Burgundy",
          body: "Burgundy is organised by village and climate, with Pinot Noir and Chardonnay as the main grapes. Natural-leaning growers work across several parts of the region, often in small volumes.",
        },
        {
          heading: "Grapes and styles in Burgundy",
          body: "Pinot Noir and Chardonnay dominate. Aligoté and Gamay appear in some sites. Parcel-level thinking is common even at smaller domaines. Still reds and whites are the core. Occasional sparkling or orange bottles can appear in the selection when available.",
        },
      ],
    },
  },
  jura: {
    sv: {
      locationBlurb: "Östra Frankrike nära den schweiziska gränsen.",
      sections: [
        {
          heading: "Om Jura",
          body: "Jura är en liten, sval region. Savagnin, Poulsard och Trousseau ger stilar som skiljer sig från grannregionerna. Ouillé och sous voile är två parallella vita vägar.",
        },
        {
          heading: "Druvor och stilar i Jura",
          body: "Vita: Savagnin och Chardonnay. Röda: Poulsard (Ploussard), Trousseau och Pinot Noir. Lokala druvor belönar låg intervention i källaren. Ouillé vita, oxidativa sous voile-viner, ljusa röda och ibland vin jaune-besläktade flaskor. Urvalet visar vilka cuvéer som finns hos PACT just nu.",
        },
      ],
    },
    en: {
      locationBlurb: "Eastern France near the Swiss border.",
      sections: [
        {
          heading: "About the Jura",
          body: "The Jura is a small, cool region. Savagnin, Poulsard and Trousseau yield styles unlike neighbouring regions. Ouillé and sous voile are two parallel white paths.",
        },
        {
          heading: "Grapes and styles in the Jura",
          body: "Whites: Savagnin and Chardonnay. Reds: Poulsard (Ploussard), Trousseau and Pinot Noir. Local grapes reward low intervention in the cellar. Ouillé whites, oxidative sous-voile wines, pale reds and occasional vin jaune-related bottles. The selection shows which cuvées PACT has right now.",
        },
      ],
    },
  },
  champagne: {
    sv: {
      locationBlurb: "Nordöstra Frankrike, svalt klimat på kritjordar.",
      sections: [
        {
          heading: "Om Champagne",
          body: "Champagne är en sval region på krita och kalksten. Naturorienterade odlare arbetar ofta med lägre dosage och mer restriktiv tillsats i källaren än den klassiska standardproduktionen.",
        },
        {
          heading: "Druvor och stilar i Champagne",
          body: "Pinot Noir, Chardonnay och Meunier är de tre huvuddruvorna. Enstaka andra tillåtna sorter kan förekomma hos mindre odlare. Mousserande vin är kärnan. Stillviner (Coteaux Champenois) är mer sällsynta i urvalet när de finns hos PACT.",
        },
      ],
    },
    en: {
      locationBlurb: "North-eastern France, cool climate on chalk soils.",
      sections: [
        {
          heading: "About Champagne",
          body: "Champagne is a cool region on chalk and limestone. Natural-leaning growers often work with lower dosage and more restrained cellar additions than classic standard production.",
        },
        {
          heading: "Grapes and styles in Champagne",
          body: "Pinot Noir, Chardonnay and Meunier are the three main grapes. Occasional other permitted varieties appear at smaller growers. Sparkling wine is the core. Still wines (Coteaux Champenois) are rarer in the selection when they are available.",
        },
      ],
    },
  },
  rhone: {
    sv: {
      locationBlurb: "Sydöstra Frankrike längs Rhônedalen.",
      sections: [
        {
          heading: "Om Rhône",
          body: "Rhônedalen delar sig i norr och syd. Norra delen är ofta Syrah på branta sluttningar; söderut blandas Grenache, Syrah, Mourvèdre och flera vita sorter.",
        },
        {
          heading: "Druvor och stilar i Rhône",
          body: "Syrah i norr; Grenache, Syrah, Mourvèdre, Cinsault och Carignan i syd. Vita: Viognier, Marsanne, Roussanne, Grenache Blanc med flera. Röda, vita och ibland rosé eller orange. Urvalet visar vilka appellationer och cuvéer som finns hos PACT just nu.",
        },
      ],
    },
    en: {
      locationBlurb: "South-eastern France along the Rhône Valley.",
      sections: [
        {
          heading: "About the Rhône Valley",
          body: "The Rhône Valley splits north and south. The north is often Syrah on steep slopes; the south blends Grenache, Syrah, Mourvèdre and several white varieties.",
        },
        {
          heading: "Grapes and styles in the Rhône Valley",
          body: "Syrah in the north; Grenache, Syrah, Mourvèdre, Cinsault and Carignan in the south. Whites include Viognier, Marsanne, Roussanne, Grenache Blanc and others. Reds, whites and occasional rosé or orange. The selection shows which appellations and cuvées PACT has right now.",
        },
      ],
    },
  },
  roussillon: {
    sv: {
      locationBlurb: "Längst söderut i Frankrike, mot Pyrenéerna och Medelhavet.",
      sections: [
        {
          heading: "Om Roussillon",
          body: "Roussillon ligger mot Pyrenéerna och Medelhavet. Skiffer, granit och varmt klimat ger koncentrerad frukt. Naturvinsodlare arbetar ofta med gamla stockar och torrodling.",
        },
        {
          heading: "Druvor och stilar i Roussillon",
          body: "Grenache (noir, gris, blanc), Carignan, Syrah, Mourvèdre och Macabeu är vanliga. Vita och orange cuvéer bygger ofta på Grenache Blanc eller Macabeu. Röda, vita, orange och söta traditionella stilar kan förekomma. Urvalet visar vad som finns hos PACT just nu.",
        },
      ],
    },
    en: {
      locationBlurb: "Far southern France, toward the Pyrenees and the Mediterranean.",
      sections: [
        {
          heading: "About Roussillon",
          body: "Roussillon faces the Pyrenees and the Mediterranean. Schist, granite and a warm climate give concentrated fruit. Natural growers often work old vines and dry farming.",
        },
        {
          heading: "Grapes and styles in Roussillon",
          body: "Grenache (noir, gris, blanc), Carignan, Syrah, Mourvèdre and Macabeu are common. White and orange cuvées often build on Grenache Blanc or Macabeu. Reds, whites, orange and traditional sweet styles can appear. The selection shows what PACT has right now.",
        },
      ],
    },
  },
  alsace: {
    sv: {
      locationBlurb: "Nordöstra Frankrike längs Vogeserna.",
      sections: [
        {
          heading: "Om Alsace",
          body: "Alsace ligger längs Vogeserna med varierande jordar och ett torrt regnskuggesklimat. Vita druvor och tydlig sortprägel är kännetecken; naturvinsodlare finns i flera byar.",
        },
        {
          heading: "Druvor och stilar i Alsace",
          body: "Riesling, Pinot Blanc, Pinot Gris, Gewurztraminer, Muscat och Auxerrois är vanliga. Pinot Noir är den viktigaste röda druvan. Torra och mer aromatiska vita, orange, enstaka röda och pet-nat. Urvalet visar vad som finns hos PACT just nu.",
        },
      ],
    },
    en: {
      locationBlurb: "North-eastern France along the Vosges.",
      sections: [
        {
          heading: "About Alsace",
          body: "Alsace runs along the Vosges with varied soils and a dry rain-shadow climate. White grapes and clear varietal character are hallmarks; natural growers work in several villages.",
        },
        {
          heading: "Grapes and styles in Alsace",
          body: "Riesling, Pinot Blanc, Pinot Gris, Gewurztraminer, Muscat and Auxerrois are common. Pinot Noir is the main red grape. Dry and more aromatic whites, orange, occasional reds and pét-nat. The selection shows what PACT has right now.",
        },
      ],
    },
  },
  "sud-ouest": {
    sv: {
      locationBlurb: "Sydvästra Frankrike, från Atlanten till foten av Pyrenéerna.",
      sections: [
        {
          heading: "Om Sydvästra Frankrike",
          body: "Sud-Ouest samlar appellationer från Atlantkusten inåt landet. Lokala druvor och varierande klimat ger en bred stilpalett som skiljer sig från Bordeaux och Languedoc.",
        },
        {
          heading: "Druvor och stilar i Sydvästra Frankrike",
          body: "Lokala sorter som Negrette, Fer Servadou, Tannat, Manseng och Mauzac förekommer tillsammans med mer kända franska druvor beroende på appellation. Röda, vita och mousserande stilar kan synas i urvalet. Urvalet speglar aktuella producenter hos PACT.",
        },
      ],
    },
    en: {
      locationBlurb: "South-western France, from the Atlantic to the foothills of the Pyrenees.",
      sections: [
        {
          heading: "About Southwest France",
          body: "Southwest France gathers appellations from the Atlantic inland. Local grapes and varied climates give a style range distinct from Bordeaux and the Languedoc.",
        },
        {
          heading: "Grapes and styles in Southwest France",
          body: "Local varieties such as Négrette, Fer Servadou, Tannat, Manseng and Mauzac appear alongside better-known French grapes depending on the appellation. Red, white and sparkling styles can appear in the selection. The selection reflects current producers at PACT.",
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

/** Editorial H2 sections for a region page (paired with wines/producers/FAQ). */
export function getWineRegionSections(
  slug: WineRegionSlug,
  locale: AppLocale,
): WineRegionSection[] {
  const sections = getWineRegionContent(slug, locale).sections;
  if (!sections?.length) return [];
  return sections.filter((s) => s.heading.trim() && s.body.trim());
}
