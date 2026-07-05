import {
  GENERATED_WINE_CATEGORIES_EN,
  GENERATED_WINE_CATEGORIES_SV,
  mapDbColorToUi,
  mapUiColorToDb,
  resolveShopFilterCategoryUrl,
} from "@/lib/wine-shop-filter-categories";
import {
  getGrapeCategoryPath,
  getShopSegmentSlug,
  resolveGrapeNameFromSlug,
} from "@/lib/wine-grape-categories";
import type { WineCategory, WineCategoryFilter } from "@/lib/wine-category-types";

export type { WineCategory, WineCategoryFilter } from "@/lib/wine-category-types";

const LONG_TAIL_WINE_CATEGORIES_SV: WineCategory[] = [
  {
    slug: "naturvin-languedoc",
    locale: "sv",
    h1: "Naturvin från Languedoc",
    title: "Naturvin från Languedoc — direktimport till Stockholm | PACT Wines",
    metaDescription:
      "Naturvin direkt från småproducenter i Languedoc, Frankrike. Direktimporterat till Stockholm utan mellanhänder.",
    description:
      "Languedoc är Frankrikes mest dynamiska naturvinsregion. Vi importerar direkt från producenten till din dörr.",
    filter: { farming: ["natural"] },
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
    filter: { farming: ["natural"] },
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
    filter: { farming: ["natural"], color: ["Red"] },
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
    filter: { farming: ["natural"], color: ["White"] },
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
    filter: { farming: ["natural"], color: ["Orange"] },
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
    filter: { farming: ["natural"] },
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
    h1: "Carignan — rebellisk druvsort",
    title: "Carignan | PACT Wines",
    metaDescription:
      "Carignan från gamla gobeletstockar på skiffer och kalk. Koncentrerade, mineraliska viner — direktimporterat till Stockholm.",
    description:
      "Carignan har ett oförtjänt dåligt rykte. Unga stockar på bördig jord ger tunna bulkviner — det stämmer. Men gamla gobeletstockar på skiffersluttningarna i Faugères, kalkjorden i Puisserguier eller gnejs-terrasserna på 305 meters höjd förändrar allt. Det är den Carignan vi importerar.",
    longDescription:
      "Carignan härstammar från Aragonien i nordöstra Spanien och etablerade sig i Languedoc under romartiden. Under 1900-talets stora produktionsexpansion planterades den över hela södra Frankrike för ett enda syfte: volym. Druvan är produktiv, tålig och ger höga skördar — men kvaliteten på det stora flertalet viner var därefter. På 1990-talet halverades odlingsarealen av EU-subventioner, och de gamla stockarna lämnades i stort sett ensamma kvar.\n\nDet var naturvinsgenerationens producenter som insåg vad dessa övergivna gamla stockar faktiskt kunde ge. En gobelet-Carignan på 65, 80 eller 100 år producerar en bråkdel av vad en ung stock ger — men det som produceras är koncentrerat, mineraliskt och komplext. Rötterna går djupt ner i skiffersluttningarna och kalkstenen, druvorna koncentreras naturligt och handskörd blir nödvändig.\n\nTerroiret varierar markant inom Languedoc. I Faugères dominerar svart skiffer som ger viner med järnig mineralitet och djup. I Saint-Chinian möter skiffern kalksten — vinerna blir mjukare och mer fruktiga. I Haute Vallée de l'Orb på 300 meters höjd ger gnejs och granit en helt annan fräschör och syrastruktur.",
    tastingProfile: [
      "Mörka körsbär, björnbär och plommon",
      "Garrigue-toner — timjan, rosmarin, vildlavendel",
      "Hög fruktsyra och mineralisk eftersmak",
      "Skiffer, kalk eller granit beroende på terroir",
      "Gamla stockar: mer koncentration, mer komplexitet",
    ],
    foodPairing:
      "Carignan är ett utpräglat matvin. Syran och tanninerna skär igenom fett och lyfter umami. Tänk lammgryta med rosmarin, cassoulet, grillad entrecôte eller mogna ostar som Comté och Ossau-Iraty. Servera vid 15–17°C — karaferas gärna 30 minuter om vinet är ungt.",
    aboutText:
      "Vi importerar Carignan direkt från småproducenter i Faugères, Saint-Chinian och Haute Vallée de l'Orb. Gamla gobeletstockar, ekologisk eller biodynamisk odling, inga tillsatser.",
    filter: { filterGrape: "Carignan" },
    hreflang: "carignan",
    canonical: "/vin/carignan",
  },
  {
    slug: "carignan-naturvin",
    locale: "sv",
    h1: "Carignan naturvin — utan tillsatser från gamla stockar",
    title: "Carignan naturvin | PACT Wines",
    metaDescription:
      "Carignan naturvin från gamla gobeletstockar — utan svavel, utan filtrering. Direktimporterat till Stockholm.",
    description:
      "Carignan lämpar sig ovanligt väl för naturvinsproduktion. Gamla stockar ger naturlig koncentration utan tillsatser, hög fruktsyra fungerar som konservering och druvskalens tjocklek klarar långa macerationer utan att tappa balansen.",
    longDescription:
      "Naturvin på Carignan handlar om ett val: att låta druvan arbeta själv. Ingen tillsatt jäst, ingen tillsatt svavel, ingen filtrering. Det är ett risktagande som kräver friskt druvmaterial — och det är precis vad gamla gobeletstockar på mager jord ger.\n\nProducenterna på PACT arbetar med olika macerationsstilar beroende på årgång och parcellets karaktär. Alexandre Durand på Pèira Levada i Faugères kör 90 dagars maceration — exceptionellt länge, men stockarnas ålder ger tanninerna mognad och struktur att bära det. Pierre Regnault i Assignan väljer tidig skörd och helhals-maceration för maximal friskhet och lite koldioxid som naturligt skydd. Thomas Chany i Puisserguier arbetar kortare med kall maceration för att lyfta druvsortens fruktsida.\n\nResultatet är viner som varierar mer än konventionell Carignan — det är poängen. Utan tillsatser berättar varje flaska sin årgång och sin jord på ett sätt som standardiserade produkter aldrig kan.",
    aboutText:
      "Carignan naturvin utan tillsatser — direktimporterat från gamla stockar i Languedoc.",
    filter: { filterGrape: "Carignan", farming: ["natural"] },
    hreflang: "carignan-natural-wine",
    canonical: "/vin/carignan-naturvin",
  },
  {
    slug: "grenache",
    locale: "sv",
    h1: "Grenache — Languedocs generösa druvsort",
    title: "Grenache naturvin från Languedoc | PACT Wines",
    metaDescription:
      "Grenache från gamla stockar i Languedoc — röda bär, värme och silkeslena tanniner. Direktimporterat naturvin till Stockholm.",
    description:
      "Grenache är Languedocs mest generösa druvsort — röd frukt, naturlig sötma och en värme som speglar den soldränkta södern. Från gamla stockar i Faugères och Haute Vallée de l'Orb blir den både kraftfull och elegant.",
    longDescription:
      "Grenache har sitt ursprung i Aragonien i Spanien, där den kallas Garnacha, och är idag en av de mest planterade druvsorterna i södra Frankrike. Den trivs i värme och torka, mognar sent och bygger upp höga sockerhalter — vilket ger viner med generös frukt, mjuka tanniner och ofta hög alkohol.\n\nI Languedoc visar Grenache sina två ansikten. På låglandet ger den runda, fruktdrivna viner med mörka körsbär och kryddighet. Men i höjdlägena — som Claparedes och Septentrion från Haute Vallée de l'Orb på 300 meters höjd — bevaras syran bättre och vinerna får en fräschör och finess som lyfter druvan bortom ren fruktighet. Pachorra från Faugères visar hur skifferjorden ger Grenache en mineralisk ryggrad.\n\nNaturvinsproducenterna på PACT arbetar med Grenache både som ren druvsort och i klassiska Languedoc-blends med Syrah och Carignan. Gemensamt är gamla stockar, låga skördar och vinifiering utan tillsatser.",
    tastingProfile: [
      "Mörka körsbär, jordgubbar och plommon",
      "Kryddighet — vitpeppar, lakrits, garrigue",
      "Rund, generös frukt med mjuka tanniner",
      "Höjdlägen ger fräschör och finess",
      "Silkeslen struktur, värme i eftersmaken",
    ],
    foodPairing:
      "Grenache är ett tacksamt matvin med sin runda frukt och mjuka struktur. Passar till lammfärsrätter, ratatouille, grillade grönsaker, kryddiga korvar och medelhavskök. Servera vid 15–17°C. De lättare höjdlägesvinerna kan kylas något och passar även till charkbrickor.",
    aboutText:
      "Vi importerar Grenache direkt från småproducenter i Faugères, Pic Saint-Loup och Haute Vallée de l'Orb. Gamla stockar, ekologisk eller biodynamisk odling, inga tillsatser.",
    filter: { filterGrape: "Grenache" },
    hreflang: "grenache",
    canonical: "/vin/grenache",
  },
  {
    slug: "grenache-blanc",
    locale: "sv",
    h1: "Grenache Blanc — friskt och blommigt naturvin från Languedoc",
    title: "Grenache Blanc naturvin från Languedoc | PACT Wines",
    metaDescription:
      "Grenache Blanc är Languedocs fräschaste vita druvsort. Naturligt låg alkohol, blommig doft och krispig syra — direktimporterat till Stockholm.",
    description:
      "Grenache Blanc är Languedocs fräschaste vita druvsort med naturligt låg alkohol, blommig doft och krispig mineralisk syra.",
    longDescription:
      "Grenache Blanc är en mutation av den röda Grenache och delar dess förmåga att trivas i värme och torka. Druvan ger fylliga vita viner med relativt låg syra men stor textur och kropp — en stil som passar naturvinsproducenternas skinkontakt och oxidativa metoder särskilt väl.\n\nI Languedoc odlas Grenache Blanc ofta tillsammans med Roussanne, Marsanne och Clairette i klassiska sydfranska vita blends. Kairos från Haute Vallée de l'Orb kombinerar den med Grenache Gris, Clairette, Viognier och Vermentino för ett komplext höjdlägesvin. Rocalhas och Douce Brise visar druvans fylligare, texturrika sida. Premices blandar in gamla lokala druvor som Terret och Maccabeu.\n\nAlla Grenache Blanc-viner på PACT kommer från producenter som arbetar ekologiskt eller biodynamiskt, utan tillsatser och utan filtrering.",
    tastingProfile: [
      "Gula stenfrukter — persika, aprikos",
      "Blommig med inslag av fänkål och örter",
      "Fyllig textur, medelhög syra",
      "Ofta något oxidativ eller skinkontakt",
      "Rund, mineralisk avslutning",
    ],
    foodPairing:
      "Grenache Blanc är ett gastronomiskt vitt vin med kropp nog för rejäl mat. Passar till fet fisk, skaldjur i gräddsås, kyckling, medelhavsgrönsaker och mjuka ostar. Servera vid 10–12°C — inte för kallt, då tappar man druvans textur.",
    filter: { filterGrape: "Grenache Blanc" },
    hreflang: "grenache-blanc",
    canonical: "/vin/grenache-blanc",
  },
  {
    slug: "syrah",
    locale: "sv",
    h1: "Syrah — mörk och kryddig från Languedoc",
    title: "Syrah naturvin från Languedoc | PACT Wines",
    metaDescription:
      "Syrah från Languedoc — mörka bär, peppar och skiffermineralitet. Direktimporterat naturvin från gamla stockar till Stockholm.",
    description:
      "Syrah ger Languedocs mörkaste, mest kryddiga viner — svarta bär, peppar och en mineralisk stramhet från skiffer och kalksten. På höjderna i Haute Vallée de l'Orb och skiffern i Faugères visar druvan sin eleganta sida.",
    longDescription:
      "Syrah härstammar från Rhônedalen, norr om Languedoc, där den gjort druvsorten världsberömd i appellationer som Hermitage och Côte-Rôtie. I Languedoc är den ett relativt sent tillskott men har snabbt visat sig hemtam — särskilt i svalare höjdlägen och på mineralrika jordar.\n\nDruvan ger djupt färgade viner med svarta vinbär, björnbär och en karaktäristisk pepprig kryddighet. Där terroiret är svalt bevaras syran och vinerna blir stramare och mer eleganta. Punkahontas från Julien Peyras — ren Syrah från lerjord och kalksten på 350 meters höjd — visar den svalare, mineraliska stilen. I Faugères ger skiffern som i Courtiol och Otium en rökig, järnig ton. På höjderna i Haute Vallée de l'Orb, som Septentrion, får Syrah en nästan nordrhônsk fräschör.\n\nSyrah används både som ren druvsort och som strukturgivande komponent i Languedoc-blends. Alla Syrah-viner på PACT kommer från producenter som arbetar ekologiskt eller biodynamiskt, utan tillsatser.",
    tastingProfile: [
      "Svarta vinbär, björnbär och plommon",
      "Svartpeppar och kryddig garrigue",
      "Skiffer ger rökig, järnig mineralitet",
      "Höjdlägen ger stramhet och elegans",
      "Fasta tanniner, lagringspotential",
    ],
    foodPairing:
      "Syrah är ett kraftfullt matvin som passar till mörkt kött och kryddiga rätter. Tänk grillad lammracks, viltgryta, oxfilé med pepparsås eller kryddstarka rätter från Nordafrika och Mellanöstern. Servera vid 16–18°C — karaferas gärna om vinet är ungt.",
    aboutText:
      "Vi importerar Syrah direkt från småproducenter i Faugères, Pic Saint-Loup och Haute Vallée de l'Orb. Gamla stockar, ekologisk eller biodynamisk odling, inga tillsatser.",
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
      "Cinsault från Languedoc — lätta, friska röda viner med låg tannin. Perfekta lätt kylda. Direktimporterat naturvin till Stockholm.",
    description:
      "Cinsault är naturvinsälskarnas favorit — lätta, saftiga röda viner med låg tannin, hög fräschör och röd bärfrukt. Perfekta lätt kylda och ett av de mest törstsläckande röda vinerna Languedoc har att erbjuda.",
    longDescription:
      "Cinsault har länge levt i skuggan av de tyngre Languedoc-druvorna, ofta använd som en anonym blandningskomponent. Men naturvinsgenerationen har lyft fram den som soloartist — och upptäckt en druva perfekt anpassad för den moderna smaken för lätta, friska röda viner.\n\nDruvan ger blek färg, låg tannin och hög fräschör. Vinifierad med kort skalkontakt blir den nästan som en mörk rosé — saftig, blommig och omedelbart drickbar. La Lanterne Rouge, ren Cinsault, och blends som A Love Supreme från David Behar i Saint-Chinian visar druvans lätta, direkta sida. Miss Piggy Blues kombinerar Cinsault med Muscat för en aromatisk twist.\n\nCinsault trivs i Languedocs värme men behåller sin friskhet tack vare tidig skörd och skonsam vinifiering. Alla Cinsault-viner på PACT kommer från producenter som arbetar ekologiskt eller biodynamiskt, utan tillsatser.",
    tastingProfile: [
      "Röda bär — hallon, körsbär, jordgubbe",
      "Blommig, lätt och saftig",
      "Låg tannin, hög fräschör",
      "Ofta bäst lätt kyld",
      "Omedelbart drickbar, törstsläckande",
    ],
    foodPairing:
      "Cinsault är sommarens röda vin — lätt nog att kylas och passar till allt från charkbrickor till grillad kyckling. Prova till pizza, sallader med grillat, lufttorkad skinka eller lättare fiskrätter. Servera lätt kylt vid 12–14°C.",
    aboutText:
      "Vi importerar Cinsault direkt från småproducenter i Saint-Chinian och Hérault. Ekologisk eller biodynamisk odling, inga tillsatser.",
    filter: { filterGrape: "Cinsault" },
    hreflang: "cinsault",
    canonical: "/vin/cinsault",
  },
];

export const WINE_CATEGORIES_SV: WineCategory[] = [
  ...GENERATED_WINE_CATEGORIES_SV,
  ...LONG_TAIL_WINE_CATEGORIES_SV,
];

const LONG_TAIL_WINE_CATEGORIES_EN: WineCategory[] = [
  {
    slug: "natural-wine-languedoc",
    locale: "en",
    h1: "Natural Wine from Languedoc",
    title: "Natural Wine from Languedoc — Direct Import to Stockholm | PACT Wines",
    metaDescription:
      "Natural wine direct from small producers in Languedoc, France. Imported directly to Stockholm without middlemen.",
    description:
      "Languedoc is France's most dynamic natural wine region. We import directly from the producer to your door.",
    filter: { farming: ["natural"] },
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
    filter: { farming: ["natural"] },
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
    filter: { farming: ["natural"], color: ["Red"] },
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
    filter: { farming: ["natural"], color: ["White"] },
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
    filter: { farming: ["natural"], color: ["Orange"] },
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
    filter: { farming: ["natural"] },
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
    h1: "Carignan — rebellious grape",
    title: "Carignan | PACT Wines",
    metaDescription:
      "Carignan from old goblet vines on schist and limestone. Concentrated, mineral wines — direct import to Stockholm.",
    description:
      "Carignan has an undeserved reputation. Young vines on fertile soil produce thin bulk wine — that's true. But old goblet vines on the schist slopes of Faugères, the limestone soils of Puisserguier or the gneiss terraces at 305 metres altitude change everything. That's the Carignan we import.",
    longDescription:
      "Carignan originates from Aragon in northeastern Spain and established itself in Languedoc during Roman times. During the 20th century's great production expansion, it was planted across southern France for a single purpose: volume. The grape is productive, hardy and gives high yields — but quality suffered. In the 1990s, EU subsidies halved the planted area, and the old vines were largely left alone.\n\nIt was the natural wine generation's producers who recognised what these abandoned old vines could actually give. A gobelet Carignan of 65, 80 or 100 years produces a fraction of what a young vine gives — but what it produces is concentrated, mineral and complex. The roots go deep into schist slopes and limestone, grapes concentrate naturally and hand harvesting becomes necessary.\n\nThe terroir varies markedly within Languedoc. In Faugères, black schist gives wines with iron minerality and depth. In Saint-Chinian, schist meets limestone — the wines become softer and more fruit-driven. In Haute Vallée de l'Orb at 300 metres altitude, gneiss and granite give a completely different freshness and acid structure.",
    tastingProfile: [
      "Dark cherries, blackberries and plums",
      "Garrigue notes — thyme, rosemary, wild lavender",
      "High fruit acidity and mineral finish",
      "Schist, limestone or granite depending on terroir",
      "Old vines: more concentration, more complexity",
    ],
    foodPairing:
      "Carignan is a quintessential food wine. The acidity and tannins cut through fat and lift umami. Think lamb stew with rosemary, cassoulet, grilled entrecôte or aged cheeses like Comté and Ossau-Iraty. Serve at 15–17°C — decant for 30 minutes if the wine is young.",
    aboutText:
      "We import Carignan directly from small producers in Faugères, Saint-Chinian and Haute Vallée de l'Orb. Old gobelet vines, organic or biodynamic farming, no additives.",
    filter: { filterGrape: "Carignan" },
    hreflang: "carignan",
    canonical: "/wine/carignan",
  },
  {
    slug: "carignan-natural-wine",
    locale: "en",
    h1: "Carignan natural wine — no additives from old vines",
    title: "Carignan Natural Wine | PACT Wines",
    metaDescription:
      "Carignan natural wine from old goblet vines — no sulphur, no filtration. Direct import to Stockholm.",
    description:
      "Carignan is unusually well suited to natural wine production. Old vines give natural concentration without additives, high fruit acidity acts as preservation and the grape's thick skins handle long macerations without losing balance.",
    longDescription:
      "Natural wine from Carignan is about one choice: letting the grape work on its own. No added yeast, no added sulphur, no filtration. It is a risk that requires healthy fruit — and that is exactly what old gobelet vines on poor soils provide.\n\nThe producers at PACT work with different maceration styles depending on the vintage and the character of each parcel. Alexandre Durand at Pèira Levada in Faugères runs 90-day maceration — exceptionally long, but the age of the vines gives the tannins the ripeness and structure to carry it. Pierre Regnault in Assignan opts for early harvest and whole-cluster maceration for maximum freshness and a little carbon dioxide as natural protection. Thomas Chany in Puisserguier works shorter with cold maceration to highlight the grape's fruit character.\n\nThe result is wines that vary more than conventional Carignan — that is the point. Without additives, each bottle tells its vintage and its soil in a way that standardised products never can.",
    aboutText:
      "Carignan natural wine without additives — direct imported from old vines in Languedoc.",
    filter: { filterGrape: "Carignan", farming: ["natural"] },
    hreflang: "carignan-naturvin",
    canonical: "/wine/carignan-natural-wine",
  },
  {
    slug: "grenache",
    locale: "en",
    h1: "Grenache — Languedoc's generous grape",
    title: "Grenache Natural Wine from Languedoc | PACT Wines",
    metaDescription:
      "Grenache from old vines in Languedoc — red fruit, warmth and silky tannins. Direct import natural wine to Stockholm.",
    description:
      "Grenache is Languedoc's most generous grape — red fruit, natural sweetness and a warmth that reflects the sun-drenched south. From old vines in Faugères and Haute Vallée de l'Orb it becomes both powerful and elegant.",
    longDescription:
      "Grenache originates in Aragon in Spain, where it is called Garnacha, and is today one of the most planted grapes in southern France. It thrives in heat and drought, ripens late and builds high sugar levels — giving wines with generous fruit, soft tannins and often high alcohol.\n\nIn Languedoc, Grenache shows its two faces. On the lowlands it gives round, fruit-driven wines with dark cherries and spice. But at altitude — like Claparedes and Septentrion from Haute Vallée de l'Orb at 300 metres — the acidity is better preserved and the wines gain a freshness and finesse that lift the grape beyond pure fruit. Pachorra from Faugères shows how schist soil gives Grenache a mineral backbone.\n\nThe natural wine producers at PACT work with Grenache both as a single variety and in classic Languedoc blends with Syrah and Carignan. What they share: old vines, low yields and vinification without additives.",
    tastingProfile: [
      "Dark cherries, strawberries and plums",
      "Spice — white pepper, liquorice, garrigue",
      "Round, generous fruit with soft tannins",
      "Altitude gives freshness and finesse",
      "Silky structure, warmth in the finish",
    ],
    foodPairing:
      "Grenache is a rewarding food wine with its round fruit and soft structure. Pairs with lamb dishes, ratatouille, grilled vegetables, spiced sausages and Mediterranean cuisine. Serve at 15–17°C. The lighter altitude wines can be slightly chilled and also suit charcuterie boards.",
    aboutText:
      "We import Grenache directly from small producers in Faugères, Pic Saint-Loup and Haute Vallée de l'Orb. Old vines, organic or biodynamic farming, no additives.",
    filter: { filterGrape: "Grenache" },
    hreflang: "grenache",
    canonical: "/wine/grenache",
  },
  {
    slug: "grenache-blanc",
    locale: "en",
    h1: "Grenache Blanc — fresh and floral natural wine from Languedoc",
    title: "Grenache Blanc Natural Wine from Languedoc | PACT Wines",
    metaDescription:
      "Grenache Blanc is Languedoc's freshest white grape. Naturally low alcohol, floral aromas and crisp acidity — direct import to Stockholm.",
    description:
      "Grenache Blanc is Languedoc's freshest white grape with naturally low alcohol, floral aromas and crisp mineral acidity.",
    longDescription:
      "Grenache Blanc is a mutation of the red Grenache and shares its ability to thrive in heat and drought. The grape gives full-bodied white wines with relatively low acidity but great texture and body — a style that suits the natural wine producers' skin contact and oxidative methods particularly well.\n\nIn Languedoc, Grenache Blanc is often grown alongside Roussanne, Marsanne and Clairette in classic southern French white blends. Kairos from Haute Vallée de l'Orb combines it with Grenache Gris, Clairette, Viognier and Vermentino for a complex altitude wine. Rocalhas and Douce Brise show the grape's fuller, more textured side. Premices blends in old local grapes like Terret and Maccabeu.\n\nAll Grenache Blanc wines at PACT come from producers working organically or biodynamically, without additives and without filtration.",
    tastingProfile: [
      "Yellow stone fruit — peach, apricot",
      "Floral with notes of fennel and herbs",
      "Full texture, medium acidity",
      "Often slightly oxidative or skin contact",
      "Round, mineral finish",
    ],
    foodPairing:
      "Grenache Blanc is a gastronomic white with enough body for substantial food. Pairs with oily fish, shellfish in cream sauce, chicken, Mediterranean vegetables and soft cheeses. Serve at 10–12°C — not too cold, or you lose the grape's texture.",
    filter: { filterGrape: "Grenache Blanc" },
    hreflang: "grenache-blanc",
    canonical: "/wine/grenache-blanc",
  },
  {
    slug: "syrah",
    locale: "en",
    h1: "Syrah — dark and spiced from Languedoc",
    title: "Syrah Natural Wine from Languedoc | PACT Wines",
    metaDescription:
      "Syrah from Languedoc — dark berries, pepper and schist minerality. Direct import natural wine from old vines to Stockholm.",
    description:
      "Syrah gives Languedoc's darkest, most spiced wines — black fruit, pepper and a mineral tautness from schist and limestone. On the heights of Haute Vallée de l'Orb and the schist of Faugères, the grape shows its elegant side.",
    longDescription:
      "Syrah originates in the Rhône Valley, north of Languedoc, where it made the grape world-famous in appellations like Hermitage and Côte-Rôtie. In Languedoc it is a relatively recent addition but has quickly proven at home — especially in cooler high-altitude sites and on mineral-rich soils.\n\nThe grape gives deeply coloured wines with blackcurrant, blackberry and a characteristic peppery spice. Where the terroir is cool, acidity is preserved and the wines become tauter and more elegant. Punkahontas from Julien Peyras — pure Syrah from clay and limestone at 350 metres — shows the cooler, mineral style. In Faugères, the schist as in Courtiol and Otium gives a smoky, iron note. On the heights of Haute Vallée de l'Orb, like Septentrion, Syrah gains an almost northern-Rhône freshness.\n\nSyrah is used both as a single variety and as a structuring component in Languedoc blends. All Syrah wines at PACT come from producers working organically or biodynamically, without additives.",
    tastingProfile: [
      "Blackcurrant, blackberry and plum",
      "Black pepper and spiced garrigue",
      "Schist gives smoky, iron minerality",
      "Altitude gives tautness and elegance",
      "Firm tannins, ageing potential",
    ],
    foodPairing:
      "Syrah is a powerful food wine that suits dark meat and spiced dishes. Think grilled rack of lamb, game stew, beef fillet with pepper sauce or spicy dishes from North Africa and the Middle East. Serve at 16–18°C — decant if the wine is young.",
    aboutText:
      "We import Syrah directly from small producers in Faugères, Pic Saint-Loup and Haute Vallée de l'Orb. Old vines, organic or biodynamic farming, no additives.",
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
      "Cinsault from Languedoc — light, fresh red wines with low tannin. Perfect lightly chilled. Direct import natural wine to Stockholm.",
    description:
      "Cinsault is the natural wine lover's favourite — light, juicy red wines with low tannin, high freshness and red berry fruit. Perfect lightly chilled and one of the most thirst-quenching red wines Languedoc has to offer.",
    longDescription:
      "Cinsault long lived in the shadow of the heavier Languedoc grapes, often used as an anonymous blending component. But the natural wine generation has brought it forward as a solo act — and discovered a grape perfectly suited to the modern taste for light, fresh red wines.\n\nThe grape gives pale colour, low tannin and high freshness. Vinified with short skin contact it becomes almost like a dark rosé — juicy, floral and immediately drinkable. La Lanterne Rouge, pure Cinsault, and blends like A Love Supreme from David Behar in Saint-Chinian show the grape's light, direct side. Miss Piggy Blues combines Cinsault with Muscat for an aromatic twist.\n\nCinsault thrives in Languedoc's heat but keeps its freshness thanks to early harvest and gentle vinification. All Cinsault wines at PACT come from producers working organically or biodynamically, without additives.",
    tastingProfile: [
      "Red berries — raspberry, cherry, strawberry",
      "Floral, light and juicy",
      "Low tannin, high freshness",
      "Often best lightly chilled",
      "Immediately drinkable, thirst-quenching",
    ],
    foodPairing:
      "Cinsault is summer's red wine — light enough to chill and suits everything from charcuterie to grilled chicken. Try it with pizza, grilled salads, cured ham or lighter fish dishes. Serve lightly chilled at 12–14°C.",
    aboutText:
      "We import Cinsault directly from small producers in Saint-Chinian and Hérault. Organic or biodynamic farming, no additives.",
    filter: { filterGrape: "Cinsault" },
    hreflang: "cinsault",
    canonical: "/wine/cinsault",
  },
];

export const WINE_CATEGORIES_EN: WineCategory[] = [
  ...GENERATED_WINE_CATEGORIES_EN,
  ...LONG_TAIL_WINE_CATEGORIES_EN,
];

/** Short color slugs → canonical category slug (EN). */
export const WINE_CATEGORY_EN_ALIASES: Record<string, string> = {
  red: "red-wine",
  white: "white-wine",
  orange: "orange-wine",
};

/** Short color slugs → canonical category slug (SV). */
export const WINE_CATEGORY_SV_ALIASES: Record<string, string> = {
  rott: "rott-vin",
  vitt: "vitt-vin",
  orange: "orange-vin",
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

export function getWineCategoryFromPathname(
  path: string,
): WineCategory | undefined {
  if (path.startsWith("/vin/")) {
    const slug = path.slice("/vin/".length).split("/")[0] ?? "";
    return getWineCategorySv(slug);
  }
  if (path.startsWith("/wine/")) {
    const slug = path.slice("/wine/".length).split("/")[0] ?? "";
    return getWineCategoryEn(slug);
  }
  return undefined;
}

export function isShopFilterNavigationPath(pathname: string): boolean {
  if (pathname === "/vin" || pathname === "/wine") return true;
  const category = getWineCategoryFromPathname(pathname);
  if (!category) return false;
  return !category.filter.filterGrape;
}

export function getActiveColorFromPathname(path: string): string | null {
  const category = getWineCategoryFromPathname(path);
  const dbColor = category?.filter.color?.[0];
  return dbColor ? mapDbColorToUi(dbColor) : null;
}

export function getActiveFarmingFromPathname(
  path: string,
): string | null {
  const category = getWineCategoryFromPathname(path);
  return category?.filter.farming?.[0] ?? null;
}

export function getCategoryUrlForColor(
  colorName: string,
  locale: "sv" | "en",
): string | null {
  const categories =
    locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;
  return resolveShopFilterCategoryUrl(
    locale,
    mapUiColorToDb(colorName),
    null,
    categories,
  );
}

export function getCategoryUrlForFarming(
  farming: string,
  locale: "sv" | "en",
): string | null {
  const categories =
    locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;
  return resolveShopFilterCategoryUrl(locale, null, farming, categories);
}

export function getCategoryUrlForGrape(
  grapeName: string,
  locale: "sv" | "en",
): string {
  const categories =
    locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;

  const match = categories.find(
    (c) =>
      c.filter.filterGrape?.toLowerCase() === grapeName.toLowerCase() &&
      !c.filter.color?.length &&
      !c.filter.farming?.length &&
      !c.filter.tags?.length,
  );

  return match?.canonical ?? getGrapeCategoryPath(grapeName, locale);
}

export function getCategoryUrlForGrapeAndFarming(
  grapeName: string,
  farming: string,
  locale: "sv" | "en",
): string | null {
  const categories =
    locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;

  const match = categories.find(
    (c) =>
      c.filter.filterGrape?.toLowerCase() === grapeName.toLowerCase() &&
      c.filter.farming?.length === 1 &&
      c.filter.farming[0] === farming &&
      !c.filter.color?.length &&
      !c.filter.tags?.length,
  );

  return match?.canonical ?? null;
}

export function getActiveGrapeFromPathname(
  path: string,
  candidateGrapes?: string[],
): string | null {
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

  if (!candidateGrapes?.length) return null;

  const slug = getShopSegmentSlug(path);
  if (!slug) return null;

  return resolveGrapeNameFromSlug(slug, candidateGrapes);
}

export { grapeNameToSlug, getGrapeCategoryPath, getShopSegmentSlug };
