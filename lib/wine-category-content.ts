import type { AppLocale } from "@/lib/i18n/locale";
import type { WineCategory } from "@/lib/wine-category-types";

/** Optional editorial fields merged onto resolved shop categories. */
export type WineCategoryContentOverride = Pick<
  WineCategory,
  | "longDescription"
  | "tastingProfile"
  | "foodPairing"
  | "aboutText"
  | "contentHeading"
>;

/** Editorial overrides keyed by slug; locale nested under each slug. */
export const WINE_CATEGORY_CONTENT_OVERRIDES: Record<
  string,
  Partial<Record<AppLocale, WineCategoryContentOverride>>
> = {
  naturvin: {
    sv: {
      contentHeading: "Om naturvin",
      longDescription:
        "Naturvin är vin gjort som det gjordes innan den industriella vinframställningen tog över — druvor odlade ekologiskt eller biodynamiskt, jäsning med druvans egna vilda jästsvampar, och ingenting tillsatt i källaren. Inga syntetiska bekämpningsmedel i vingården, ingen tillsatt jäst, inget socker, inga enzymer, ingen filtrering. På sin höjd en liten mängd svavel vid buteljering — ofta inte ens det.\n\nResultatet är vin som smakar av sin plats och sin årgång snarare än av en standardiserad process. Naturvin är levande, ibland oförutsägbart, alltid ärligt. Ett rött naturvin från gamla Carignan-stockar i Faugères smakar helt annorlunda än ett från kalkjorden i Puisserguier — och det är hela poängen.\n\nPå PACT importerar vi naturvin direkt från småproducenter i Languedoc. Ingen mellanhand, inget centrallager, inga påslag i onödiga led. När tillräckligt många reserverat viner för att fylla en pall skickas den direkt från producenten till Stockholm. Det gör vinet billigare och relationen mellan producent och drickare äkta.",
      tastingProfile: [
        "Levande, ofta ofiltrerat och något grumligt",
        "Smakar av terroir — plats och årgång, inte process",
        "Låg eller ingen tillsatt svavel",
        "Ekologisk eller biodynamisk odling",
        "Vild jäsning med druvans egna jästsvampar",
      ],
      foodPairing:
        "Naturvin är gjort för mat. Den höga fräschören och de levande syrorna gör det till ett tacksamt matvin — från lätta röda till chark och grillat, vita till skaldjur och fisk, orange till kryddstark mat och hårdostar. Servera generellt något svalare än konventionellt vin.",
      aboutText:
        "Vi importerar naturvin direkt från småproducenter i Languedoc — ekologiskt och biodynamiskt odlat, utan tillsatser. Reservera innan pallen fylls, så skickar producenten direkt till Stockholm.",
    },
  },
  "natural-wine": {
    en: {
      contentHeading: "About natural wine",
      longDescription:
        "Natural wine is wine made the way it was before industrial winemaking took over — grapes grown organically or biodynamically, fermentation with the grape's own wild yeasts, and nothing added in the cellar. No synthetic pesticides in the vineyard, no added yeast, no sugar, no enzymes, no filtration. At most a small amount of sulphur at bottling — often not even that.\n\nThe result is wine that tastes of its place and its vintage rather than of a standardised process. Natural wine is alive, sometimes unpredictable, always honest. A red natural wine from old Carignan vines in Faugères tastes completely different from one grown on the limestone of Puisserguier — and that is the whole point.\n\nAt PACT we import natural wine directly from small producers in Languedoc. No middleman, no central warehouse, no unnecessary markups. When enough people have reserved wines to fill a pallet, it ships directly from the producer to Stockholm. That makes the wine cheaper and the relationship between producer and drinker real.",
      tastingProfile: [
        "Alive, often unfiltered and slightly cloudy",
        "Tastes of terroir — place and vintage, not process",
        "Low or no added sulphur",
        "Organic or biodynamic farming",
        "Wild fermentation with the grape's own yeasts",
      ],
      foodPairing:
        "Natural wine is made for food. The high freshness and living acidity make it a rewarding food wine — from light reds with charcuterie and grilled dishes, whites with shellfish and fish, orange with spiced food and hard cheeses. Serve generally a little cooler than conventional wine.",
      aboutText:
        "We import natural wine directly from small producers in Languedoc — organically and biodynamically grown, without additives. Reserve before the pallet fills, and the producer ships directly to Stockholm.",
    },
  },
  "rott-naturvin": {
    sv: {
      contentHeading: "Om rött naturvin",
      longDescription:
        "Rött naturvin är kanske den mest omedelbart tilltalande ingången till naturvinsvärlden. Utan tillsatt svavel och utan filtrering får de röda druvorna uttrycka sin fulla fruktighet — ofta med en saftighet och drickbarhet som konventionella röda viner saknar. Många röda naturviner vinifieras med kolsyremaceration, en metod som lyfter fram frukten och dämpar de hårdaste tanninerna, vilket ger viner som är lätta att tycka om direkt.\n\nI Languedoc görs rött naturvin framför allt på de klassiska sydfranska druvorna: Carignan, Grenache, Syrah, Cinsault och Mourvèdre. Stilarna spänner brett. Cinsault ger lätta, nästan svalserverade röda viner med låg tannin. Carignan från gamla stockar ger struktur och mineralitet som håller i tio år. Syrah bidrar med mörk frukt och peppar. Producenterna avgör resten — allt från Le Bouc à Trois Pattes lätta höjdlägesviner till Clos Fantines koncentrerade Faugères-röda.\n\nAlla röda naturviner på PACT kommer direkt från småproducenter i Languedoc som odlar ekologiskt eller biodynamiskt och gör vin utan tillsatser. Direktimporterat, utan mellanhänder.",
      tastingProfile: [
        "Saftig, fruktdriven och ofta lättdrucken",
        "Från lätt Cinsault till strukturerad Carignan",
        "Låg eller ingen tillsatt svavel",
        "Ofta kolsyremacererad för mjukare tannin",
        "Kan serveras lätt kyld, särskilt de lättare stilarna",
      ],
      foodPairing:
        "Rött naturvin är utpräglat matvänligt. De lätta stilarna passar chark, pizza och grillad kyckling — gärna lätt kylda. De fylligare passar lammgryta, grillat rött kött och mogna ostar. Som regel: ju lättare vin, desto svalare servering.",
      aboutText:
        "Vi importerar rött naturvin direkt från Languedoc — Carignan, Grenache, Syrah och Cinsault från småproducenter som arbetar utan tillsatser. Reservera innan pallen fylls.",
    },
  },
  "red-natural-wine": {
    en: {
      contentHeading: "About red natural wine",
      longDescription:
        "Red natural wine is perhaps the most immediately appealing entry point into the world of natural wine. Without added sulphur and without filtration, the red grapes express their full fruitiness — often with a juiciness and drinkability that conventional reds lack. Many red natural wines are vinified with carbonic maceration, a method that brings out the fruit and softens the harshest tannins, giving wines that are easy to enjoy straight away.\n\nIn Languedoc, red natural wine is made mainly from the classic southern French grapes: Carignan, Grenache, Syrah, Cinsault and Mourvèdre. The styles range widely. Cinsault gives light, almost chillable reds with low tannin. Carignan from old vines gives structure and minerality that last ten years. Syrah contributes dark fruit and pepper. The producers decide the rest — from Le Bouc à Trois Pattes' light altitude wines to Clos Fantine's concentrated Faugères reds.\n\nAll red natural wines at PACT come directly from small producers in Languedoc who farm organically or biodynamically and make wine without additives. Direct import, no middlemen.",
      tastingProfile: [
        "Juicy, fruit-driven and often easy-drinking",
        "From light Cinsault to structured Carignan",
        "Low or no added sulphur",
        "Often carbonic-macerated for softer tannin",
        "Can be served lightly chilled, especially the lighter styles",
      ],
      foodPairing:
        "Red natural wine is highly food-friendly. The light styles suit charcuterie, pizza and grilled chicken — ideally lightly chilled. The fuller ones suit lamb stew, grilled red meat and aged cheeses. As a rule: the lighter the wine, the cooler the serving.",
      aboutText:
        "We import red natural wine directly from Languedoc — Carignan, Grenache, Syrah and Cinsault from small producers working without additives. Reserve before the pallet fills.",
    },
  },
  "vitt-naturvin": {
    sv: {
      contentHeading: "Om vitt naturvin",
      longDescription:
        "Vitt naturvin är en av de mest spännande kategorierna inom naturvinsvärlden — och en av de svåraste att göra bra. Utan tillsatt svavel att skydda de känsliga vita druvorna krävs precision i vingård och källare. De producenter som lyckas gör viner med en textur, salinitet och mineralitet som konventionella vita viner sällan når.\n\nI Languedoc görs vitt naturvin ofta med skalkontakt eller oxidativa metoder som ger vinerna kropp och komplexitet. Druvor som Grenache Blanc, Vermentino, Roussanne och Marsanne trivs i det varma klimatet men behåller sin friskhet hos rätt producent — som Sybil Baldassarre på La Graine Sauvage, vars vita viner från 450 meters höjd i Faugères hör till de mest omskrivna i Languedoc.\n\nVårt urval av vita naturviner är litet och handplockat. Vi importerar bara de vi själva vill dricka — direkt från producenten, utan tillsatser, utan mellanhänder.",
      tastingProfile: [
        "Textur och kropp, ofta med skalkontakt",
        "Salinitet och mineralitet",
        "Gula stenfrukter, örter, ibland oxidativa toner",
        "Låg eller ingen tillsatt svavel",
        "Litet, handplockat urval",
      ],
      foodPairing:
        "Vitt naturvin med kropp passar rejäl mat — fet fisk, skaldjur i gräddsås, kyckling och medelhavsgrönsaker. De med skalkontakt klarar även kryddstark mat och hårdostar. Servera inte för kallt, då tappar man texturen.",
      aboutText:
        "Ett litet, handplockat urval vita naturviner från Languedoc — direktimporterat från producenter som Sybil Baldassarre, utan tillsatser.",
    },
  },
  "white-natural-wine": {
    en: {
      contentHeading: "About white natural wine",
      longDescription:
        "White natural wine is one of the most exciting categories in the natural wine world — and one of the hardest to do well. Without added sulphur to protect the delicate white grapes, precision is required in the vineyard and cellar. The producers who succeed make wines with a texture, salinity and minerality that conventional whites rarely reach.\n\nIn Languedoc, white natural wine is often made with skin contact or oxidative methods that give the wines body and complexity. Grapes like Grenache Blanc, Vermentino, Roussanne and Marsanne thrive in the warm climate but keep their freshness with the right producer — like Sybil Baldassarre at La Graine Sauvage, whose white wines from 450 metres altitude in Faugères are among the most written-about in Languedoc.\n\nOur selection of white natural wines is small and hand-picked. We import only the ones we want to drink ourselves — directly from the producer, without additives, without middlemen.",
      tastingProfile: [
        "Texture and body, often with skin contact",
        "Salinity and minerality",
        "Yellow stone fruit, herbs, sometimes oxidative notes",
        "Low or no added sulphur",
        "Small, hand-picked selection",
      ],
      foodPairing:
        "White natural wine with body suits substantial food — oily fish, shellfish in cream sauce, chicken and Mediterranean vegetables. Those with skin contact also handle spiced food and hard cheeses. Do not serve too cold, or you lose the texture.",
      aboutText:
        "A small, hand-picked selection of white natural wines from Languedoc — direct imported from producers like Sybil Baldassarre, without additives.",
    },
  },
  "orange-naturvin": {
    sv: {
      contentHeading: "Om orange naturvin",
      longDescription:
        "Orange vin — eller skalkontaktvin — är vitt vin gjort som rött. Istället för att pressa bort skalen direkt får de vita druvorna jäsa tillsammans med sina skal, ibland i dagar, ibland i månader. Det ger vinet dess karaktäristiska bärnstensfärg, tanninstruktur och en helt egen aromatisk värld av torkade aprikoser, te, nötter och kryddor.\n\nOrange vin är en av de äldsta vinstilarna som finns — den har gjorts i Georgien i tusentals år — men har fått en renässans genom naturvinsrörelsen. Stilen passar naturvinsfilosofin perfekt: skalkontakten ger naturligt skydd, vilket minskar behovet av tillsatt svavel. I Languedoc experimenterar producenter som Le Bouc à Trois Pattes med orangeviner som hör till de mest uppskattade i regionen.\n\nVårt urval är litet och kurerat — orange vin är en nischstil, och vi importerar bara de flaskor vi själva blir entusiastiska över.",
      tastingProfile: [
        "Bärnstensfärgad, tanninstruktur som ett rött vin",
        "Torkade aprikoser, te, nötter, kryddor",
        "Skalkontakt ger naturligt skydd",
        "En av världens äldsta vinstilar",
        "Litet, kurerat urval",
      ],
      foodPairing:
        "Orange vin är ett av de mest matvänliga vinerna som finns — tanninerna och strukturen klarar rätter som slår ut både vitt och rött. Tänk kryddstark asiatisk mat, marockanska tagines, hårdostar och chark. Servera vid 12–14°C.",
      aboutText:
        "Ett litet, kurerat urval orange naturviner från Languedoc — skalkontaktviner från producenter som experimenterar, importerade direkt utan tillsatser.",
    },
  },
  "orange-natural-wine": {
    en: {
      contentHeading: "About orange wine",
      longDescription:
        "Orange wine — or skin-contact wine — is white wine made like red. Instead of pressing the skins away immediately, the white grapes ferment together with their skins, sometimes for days, sometimes for months. This gives the wine its characteristic amber colour, tannin structure and a whole aromatic world of its own — dried apricots, tea, nuts and spice.\n\nOrange wine is one of the oldest wine styles in existence — it has been made in Georgia for thousands of years — but has had a renaissance through the natural wine movement. The style suits the natural wine philosophy perfectly: the skin contact provides natural protection, reducing the need for added sulphur. In Languedoc, producers like Le Bouc à Trois Pattes experiment with orange wines that are among the most appreciated in the region.\n\nOur selection is small and curated — orange wine is a niche style, and we import only the bottles we get genuinely excited about ourselves.",
      tastingProfile: [
        "Amber-coloured, tannin structure like a red",
        "Dried apricots, tea, nuts, spice",
        "Skin contact provides natural protection",
        "One of the world's oldest wine styles",
        "Small, curated selection",
      ],
      foodPairing:
        "Orange wine is one of the most food-friendly wines there is — the tannins and structure handle dishes that defeat both white and red. Think spicy Asian food, Moroccan tagines, hard cheeses and charcuterie. Serve at 12–14°C.",
      aboutText:
        "A small, curated selection of orange natural wines from Languedoc — skin-contact wines from experimenting producers, imported directly without additives.",
    },
  },
};

export function getWineCategoryContentOverride(
  slug: string,
  locale: AppLocale,
): WineCategoryContentOverride | undefined {
  const override = WINE_CATEGORY_CONTENT_OVERRIDES[slug]?.[locale];
  if (!override) return undefined;

  const hasContent =
    Boolean(override.longDescription?.trim()) ||
    Boolean(override.tastingProfile?.length) ||
    Boolean(override.foodPairing?.trim()) ||
    Boolean(override.aboutText?.trim()) ||
    Boolean(override.contentHeading?.trim());

  return hasContent ? override : undefined;
}

export function mergeWineCategoryContent(
  category: WineCategory,
): WineCategory {
  const override = getWineCategoryContentOverride(
    category.slug,
    category.locale,
  );
  if (!override) return category;

  return {
    ...category,
    ...(override.longDescription !== undefined
      ? { longDescription: override.longDescription }
      : {}),
    ...(override.tastingProfile !== undefined
      ? { tastingProfile: override.tastingProfile }
      : {}),
    ...(override.foodPairing !== undefined
      ? { foodPairing: override.foodPairing }
      : {}),
    ...(override.aboutText !== undefined
      ? { aboutText: override.aboutText }
      : {}),
    ...(override.contentHeading !== undefined
      ? { contentHeading: override.contentHeading }
      : {}),
  };
}
