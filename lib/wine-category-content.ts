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
  | "title"
  | "metaDescription"
  | "faq"
>;

/** Editorial overrides keyed by slug; locale nested under each slug. */
export const WINE_CATEGORY_CONTENT_OVERRIDES: Record<
  string,
  Partial<Record<AppLocale, WineCategoryContentOverride>>
> = {
  naturvin: {
    sv: {
      title: "Naturvin online — från Languedocs producenter | PACT Wines",
      metaDescription:
        "Naturvin direktimporterat från småproducenter i Languedoc. Ekologiskt och utan tillsatser — hemleverans Stockholm. Billigare än butik.",
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
      faq: [
        {
          question: "Vad är naturvin?",
          answer:
            "Naturvin är vin gjort av ekologiskt eller biodynamiskt odlade druvor, jäst med druvans egna vilda jästsvampar och utan tillsatser i källaren. Ingen tillsatt jäst, inget socker, inga enzymer, ingen filtrering — på sin höjd lite svavel vid buteljering.",
        },
        {
          question: "Är naturvin ekologiskt?",
          answer:
            "Naturvin är alltid gjort av ekologiskt eller biodynamiskt odlade druvor, men allt ekologiskt vin är inte naturvin. Skillnaden ligger i källaren: ekologiskt vin får använda vissa tillsatser som naturvin undviker helt.",
        },
        {
          question: "Ger naturvin mindre huvudvärk?",
          answer:
            "Det finns inga vetenskapliga bevis för att naturvin ger mindre huvudvärk än annat vin. Naturvin innehåller ofta mindre tillsatt svavel, men huvudvärk av vin beror på flera faktorer, främst alkoholen själv.",
        },
        {
          question: "Hur köper jag naturvin online?",
          answer:
            "På PACT reserverar du naturviner du vill ha och får dem levererade hem. Vinerna kommer direkt från småproducenter i Languedoc — inga mellanhänder, vilket ger lägre pris och viner du sällan hittar någon annanstans.",
        },
      ],
    },
  },
  "natural-wine": {
    en: {
      title: "Natural Wine Online — from Languedoc Producers | PACT Wines",
      metaDescription:
        "Natural wine direct imported from small producers in Languedoc. Organic, biodynamic and without additives — home delivery in Stockholm. Better value than retail.",
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
      faq: [
        {
          question: "What is natural wine?",
          answer:
            "Natural wine is wine made from organically or biodynamically farmed grapes, fermented with the grape's own wild yeasts and without additives in the cellar. No added yeast, no sugar, no enzymes, no filtration — at most a little sulphur at bottling.",
        },
        {
          question: "Is natural wine organic?",
          answer:
            "Natural wine is always made from organically or biodynamically farmed grapes, but not all organic wine is natural wine. The difference is in the cellar: organic wine may use certain additives that natural wine avoids entirely.",
        },
        {
          question: "Does natural wine cause fewer headaches?",
          answer:
            "There is no scientific evidence that natural wine causes fewer headaches than other wine. Natural wine often contains less added sulphur, but headaches from wine depend on several factors, primarily the alcohol itself.",
        },
        {
          question: "How do I buy natural wine online?",
          answer:
            "On PACT you reserve the natural wines you want and have them delivered to your door. The wines come directly from small producers in Languedoc — no middlemen, which means lower prices and wines you rarely find elsewhere.",
        },
      ],
    },
  },
  "biodynamiskt-vin": {
    sv: {
      title: "Biodynamiskt vin i Sverige — köp direkt från Languedoc | PACT Wines",
      metaDescription:
        "Köp biodynamiskt vin i Sverige med hemleverans i Stockholm. Demeter-certifierade producenter i Languedoc — direktimport utan mellanhänder via PACT.",
      contentHeading: "Om biodynamiskt vin",
      longDescription:
        "Biodynamiskt vin bygger på en helhetssyn av vingården som levande ekosystem — inte bara att undvika kemiska medel, utan att aktivt stärka jordhälsa, biodiversitet och balans mellan jord, planta och djur. Odlingsmetoden följer ofta Demeters regler: kompostpreparat, dynamiska sprayningar och skörd som planeras efter vingårdens rytm snarare än enbart kalendern.\n\nSkillnaden mot ekologiskt vin ligger i metoden. Ekologiskt fokuserar på vad du inte får använda; biodynamiskt lägger till en aktiv vingårdsfilosofi där jorden, stockarna och till och med månfaserna är en del av besluten. I Languedoc har biodynamisk odling blivit särskilt stark bland små, oberoende producenter som redan arbetar med låga skördar och minimal intervention i källaren.\n\nAtt köpa biodynamiskt vin i Sverige via traditionella kanaler är ofta dyrt och sortimentet begränsat. PACT importerar direkt från certifierade producenter i Languedoc till Stockholm — utan importörskedja och utan centrallager. Du reserverar flaskor online; när pallen fylls skickas vinet direkt från vingården.",
      tastingProfile: [
        "Demeter eller annan biodynamisk certifiering",
        "Tydlig platskaraktär och mineralitet",
        "Låga skördar och manuellt vingårdsarbete",
        "Rött, vitt och orange från Languedoc",
        "Direktimporterat till Stockholm",
      ],
      foodPairing:
        "Biodynamiskt vin från Languedoc passar till medelhavsmat — grillat lamm, ratatouille, svamp, chark och mogna ostar. Lättare röda och orangeviner kan serveras något svalare; fylligare röda till långkok och grytor.",
      aboutText:
        "Biodynamiskt vin från Languedoc — direkt från certifierade småproducenter till Stockholm via PACT.",
    },
  },
  "biodynamic-wine": {
    en: {
      title: "Biodynamic Wine in Sweden — Buy Direct from Languedoc | PACT Wines",
      metaDescription:
        "Buy biodynamic wine in Sweden with home delivery in Stockholm. Demeter-certified producers in Languedoc — direct import without middlemen via PACT.",
      contentHeading: "About biodynamic wine",
      longDescription:
        "Biodynamic wine is built on seeing the vineyard as a living ecosystem — not just avoiding chemicals, but actively strengthening soil health, biodiversity and balance between soil, plant and animal life. The method often follows Demeter rules: compost preparations, dynamic sprays and harvest timed to the vineyard's rhythms rather than the calendar alone.\n\nThe difference from organic wine is in the approach. Organic focuses on what you cannot use; biodynamic adds an active vineyard philosophy where soil, vines and even lunar phases inform decisions. In Languedoc, biodynamic farming has become especially strong among small, independent producers already working with low yields and minimal cellar intervention.\n\nBuying biodynamic wine in Sweden through traditional channels is often expensive with limited choice. PACT imports direct from certified producers in Languedoc to Stockholm — no import chain and no central warehouse. You reserve bottles online; when the pallet fills, wine ships direct from the vineyard.",
      tastingProfile: [
        "Demeter or other biodynamic certification",
        "Clear sense of place and minerality",
        "Low yields and manual vineyard work",
        "Red, white and orange from Languedoc",
        "Direct imported to Stockholm",
      ],
      foodPairing:
        "Biodynamic wine from Languedoc suits Mediterranean food — grilled lamb, ratatouille, mushrooms, charcuterie and mature cheeses. Lighter reds and orange wines can be served slightly chilled; fuller reds with slow-cooked dishes and stews.",
      aboutText:
        "Biodynamic wine from Languedoc — direct from certified small producers to Stockholm via PACT.",
    },
  },
  "ekologiskt-vin": {
    sv: {
      title: "Ekologiskt vin i Sverige — köp direkt från Languedoc | PACT Wines",
      metaDescription:
        "Köp ekologiskt vin i Sverige med hemleverans Stockholm. EU-certifierade producenter i Languedoc — direktimport utan mellanhänder via PACT.",
      contentHeading: "Om ekologiskt vin",
      longDescription:
        "Ekologiskt vin innebär att druvorna odlas enligt EU:s ekologiska regler — utan syntetiska bekämpningsmedel, utan konstgödsel och med krav på jordhälsa och biodiversitet i vingården. Certifieringen (t.ex. AB-märket) gäller odlingsmetoden; i källaren får producenten fortfarande arbeta på olika sätt, från klassisk vinifiering till minimal intervention.\n\nSkillnaden mot biodynamiskt vin är tydlig: ekologiskt definierar vad som inte får användas i vingården; biodynamiskt lägger till en helhetssyn med kompostpreparat, dynamiska sprayningar och vingårdens rytm. Skillnaden mot naturvin är också viktig — naturvin ställer krav både i vingård och källare (vild jäsning, inga tillsatser), medan ekologiskt vin i första hand handlar om hur druvorna odlas. Många av våra producenter gör både och, men det är inte samma sak.\n\nAtt köpa ekologiskt vin i Sverige via Systembolaget eller importörer ger ofta begränsat urval och höga priser. PACT importerar direkt från ekologiskt certifierade småproducenter i Languedoc till Stockholm — utan mellanhänder och utan centrallager. Du reserverar flaskor online; när pallen fylls skickas vinet direkt från vingården.",
      tastingProfile: [
        "EU-certifierad ekologisk odling (AB-märke)",
        "Inga syntetiska bekämpningsmedel i vingården",
        "Rött, vitt och orange från Languedoc",
        "Tydlig frukt och platskaraktär",
        "Direktimporterat till Stockholm",
      ],
      foodPairing:
        "Ekologiskt vin från Languedoc passar till medelhavsmat — grillat lamm, ratatouille, fisk, chark och grönsaksrätter. Lättare röda och orangeviner kan serveras något svalare; fylligare röda till grytor och ost.",
      aboutText:
        "Ekologiskt vin från Languedoc — direkt från certifierade småproducenter till Stockholm via PACT.",
    },
  },
  "organic-wine": {
    en: {
      title: "Organic Wine in Sweden — Buy Direct from Languedoc | PACT Wines",
      metaDescription:
        "Buy organic wine in Sweden with home delivery in Stockholm. EU-certified producers in Languedoc — direct import without middlemen via PACT.",
      contentHeading: "About organic wine",
      longDescription:
        "Organic wine means grapes grown under EU organic rules — no synthetic pesticides, no chemical fertilisers and requirements for soil health and biodiversity in the vineyard. Certification (e.g. the EU organic logo) covers farming; in the cellar producers may still work in different ways, from classic winemaking to minimal intervention.\n\nThe difference from biodynamic wine is clear: organic defines what cannot be used in the vineyard; biodynamic adds a holistic view with compost preparations, dynamic sprays and the vineyard's rhythms. The difference from natural wine matters too — natural wine sets rules in both vineyard and cellar (wild fermentation, no additives), while organic wine primarily concerns how grapes are grown. Many of our producers do both, but they are not the same thing.\n\nBuying organic wine in Sweden through the monopoly or traditional importers often means limited choice and high prices. PACT imports direct from organically certified small producers in Languedoc to Stockholm — without middlemen and without central warehousing. You reserve bottles online; when the pallet fills, wine ships direct from the vineyard.",
      tastingProfile: [
        "EU-certified organic farming",
        "No synthetic pesticides in the vineyard",
        "Red, white and orange from Languedoc",
        "Clear fruit and sense of place",
        "Direct imported to Stockholm",
      ],
      foodPairing:
        "Organic wine from Languedoc suits Mediterranean food — grilled lamb, ratatouille, fish, charcuterie and vegetable dishes. Lighter reds and orange wines can be served slightly chilled; fuller reds with stews and cheese.",
      aboutText:
        "Organic wine from Languedoc — direct from certified small producers to Stockholm via PACT.",
    },
  },
  "rott-naturvin": {
    sv: {
      title: "Rött naturvin online — från Languedoc | PACT Wines",
      metaDescription:
        "Köp rött naturvin online. Carignan, Grenache och Syrah från Languedoc — utan tillsatser, hemleverans Stockholm. Reservera innan pallen fylls.",
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
      faq: [
        {
          question: "Vad är rött naturvin?",
          answer:
            "Rött naturvin är rött vin gjort av ekologiskt eller biodynamiskt odlade druvor, jäst med vilda jästsvampar och utan tillsatser i källaren. Ingen tillsatt jäst, inget socker, ingen filtrering — på sin höjd en liten mängd svavel vid buteljering. Resultatet är ett levande vin som smakar av sin plats och årgång.",
        },
        {
          question: "Hur skiljer sig rött naturvin från vanligt rött vin?",
          answer:
            "Konventionellt rött vin får innehålla tillsatser som odlad jäst, socker, syra och högre halter svavel, och filtreras ofta för klarhet. Rött naturvin görs med minimal påverkan — druvan och platsen ska komma till uttryck utan att maskeras av tillsatser eller teknik.",
        },
        {
          question: "Hur serverar man rött naturvin?",
          answer:
            "Många röda naturviner, särskilt lätta stilar som Cinsault, vinner på att serveras lätt kylda vid 13–15°C. Fylligare röda som Carignan från gamla stockar serveras vid 15–17°C. Eftersom vinerna ofta är ofiltrerade kan lite fällning förekomma — häll försiktigt.",
        },
        {
          question: "Vilka druvor används i rött naturvin från Languedoc?",
          answer:
            "De vanligaste är Carignan, Grenache, Syrah, Cinsault och Mourvèdre. Cinsault ger lätta, saftiga viner, Carignan struktur och mineralitet, Syrah mörk frukt och peppar. Många röda naturviner är blandningar av flera druvor.",
        },
        {
          question: "Håller rött naturvin länge?",
          answer:
            "Det varierar. Lätta, fruktdrivna röda naturviner är gjorda för att drickas unga och färska. Röda naturviner från gamla stockar med mer struktur — som Carignan från Faugères — kan utvecklas i glaset och lagras i flera år.",
        },
      ],
    },
  },
  "red-natural-wine": {
    en: {
      title: "Red Natural Wine Online — from Languedoc | PACT Wines",
      metaDescription:
        "Buy red natural wine online. Carignan, Grenache and Syrah direct imported from Languedoc — without additives, home delivery Stockholm. Reserve before the pallet fills.",
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
      faq: [
        {
          question: "What is red natural wine?",
          answer:
            "Red natural wine is red wine made from organically or biodynamically farmed grapes, fermented with wild yeasts and without additives in the cellar. No added yeast, no sugar, no filtration — at most a small amount of sulphur at bottling. The result is a living wine that tastes of its place and vintage.",
        },
        {
          question: "How does red natural wine differ from regular red wine?",
          answer:
            "Conventional red wine can contain additives such as cultured yeast, sugar, acid and higher levels of sulphur, and is often filtered for clarity. Red natural wine is made with minimal intervention — the grape and place should come through without being masked by additives or technology.",
        },
        {
          question: "How should you serve red natural wine?",
          answer:
            "Many red natural wines, especially lighter styles like Cinsault, benefit from being served lightly chilled at 13–15°C. Fuller reds like Carignan from old vines are best at 15–17°C. Because the wines are often unfiltered, a little sediment may appear — pour carefully.",
        },
        {
          question: "Which grapes are used in red natural wine from Languedoc?",
          answer:
            "The most common are Carignan, Grenache, Syrah, Cinsault and Mourvèdre. Cinsault gives light, juicy wines, Carignan structure and minerality, Syrah dark fruit and pepper. Many red natural wines are blends of several grapes.",
        },
        {
          question: "Does red natural wine age well?",
          answer:
            "It varies. Light, fruit-driven red natural wines are made to be drunk young and fresh. Red natural wines from old vines with more structure — like Carignan from Faugères — can develop in the glass and be cellared for several years.",
        },
      ],
    },
  },
  "vitt-naturvin": {
    sv: {
      title: "Vitt naturvin online — från Languedoc | PACT Wines",
      metaDescription:
        "Köp vitt naturvin online. Handplockade flaskor från Languedoc — mineralitet och skalkontakt utan tillsatser. Hemleverans Stockholm via PACT.",
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
      title: "White Natural Wine Online — from Languedoc | PACT Wines",
      metaDescription:
        "Buy white natural wine online. Hand-picked bottles from Languedoc — minerality and skin contact without additives. Home delivery Stockholm via PACT.",
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
      title: "Orange naturvin online — från Languedoc | PACT Wines",
      metaDescription:
        "Köp orange naturvin och skalkontaktvin från Languedoc. Direktimporterat till Stockholm — utan tillsatser, utan mellanhänder. Reservera online.",
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
      title: "Orange Natural Wine Online — from Languedoc | PACT Wines",
      metaDescription:
        "Buy orange natural wine and skin-contact wine from Languedoc. Direct imported to Stockholm — without additives or middlemen. Reserve online.",
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
  "rod-och-orange-naturvin": {
    sv: {
      title: "Rött & orange naturvin — köp direkt från Languedoc | PACT Wines",
      metaDescription:
        "Köp rött och orange naturvin från Languedoc. Direktimporterat till Stockholm — experimentella flaskor utan tillsatser. Reservera innan pallen fylls.",
      contentHeading: "Om rött & orange naturvin",
      longDescription:
        "Rött & orange naturvin är flaskor där producenten arbetar med både röda druvor och orangevinifiering — antingen som fältblandningar, parallella skördar i samma cuvée, eller viner som rör sig mellan lätt skalkontakt och klassisk röd jäsning. Kategorin fångar den experimentella sidan av Languedoc: samma vingård, samma filosofi, men flera uttryck i ett sortiment.\n\nI praktiken hittar du här allt från lättdruckna röda med en hint av skalkontakt till mer amberfärgade viner med tydlig tannin. Gemensamt är naturvinsmetoden — vild jäsning, inga tillsatser, ekologisk eller biodynamisk odling — och den sydfranska druvbasen: Grenache, Carignan, Syrah och lokala vita druvor som får kort eller lång skalkontakt.\n\nPå PACT är urvalet litet och kuraterat. Vi listar bara viner från producenter vi själva står bakom, direktimporterade från Languedoc utan mellanhänder.",
      tastingProfile: [
        "Spektrum från saftigt rött till amber och skalkontakt",
        "Tydlig frukt, levande syra, låg eller ingen tillsatt svavel",
        "Ofta drickbart ungt — ibland med lätt grumlighet",
        "Sydfranska druvor: Grenache, Carignan, Syrah m.fl.",
        "Naturvin utan tillsatser från små producenter",
      ],
      foodPairing:
        "Den här typen av vin är mångsidig vid bordet. De rödare exemplaren passar chark, grillat och medelhavsinspirerade rätter; de mer orangea klarar kryddstark mat, ugnsrostade grönsaker och hårdost. Servera svalare än ett tungt rött — ofta 12–16°C beroende på stil.",
      aboutText:
        "Kurerat urval rött & orange naturvin från Languedoc — direktimporterat till Stockholm när pallen fylls.",
    },
  },
  "red-and-orange-natural-wine": {
    en: {
      title: "Red & Orange Natural Wine — Buy Direct from Languedoc | PACT Wines",
      metaDescription:
        "Buy red and orange natural wine from Languedoc. Direct imported to Stockholm — experimental bottles without additives. Reserve before the pallet fills.",
      contentHeading: "About red & orange natural wine",
      longDescription:
        "Red & orange natural wine covers bottles where the producer works with both red grapes and orange winemaking — field blends, parallel harvests in the same cuvée, or wines that move between light skin contact and classic red fermentation. The category captures Languedoc's experimental side: the same vineyard, the same philosophy, but several expressions in one range.\n\nIn practice you'll find everything from easy-drinking reds with a hint of skin contact to more amber wines with clear tannin. What they share is the natural wine method — wild fermentation, no additives, organic or biodynamic farming — and the southern French grape base: Grenache, Carignan, Syrah and local white grapes given short or long skin contact.\n\nAt PACT the selection is small and curated. We list only wines from producers we stand behind, direct imported from Languedoc without middlemen.",
      tastingProfile: [
        "Spectrum from juicy red to amber and skin contact",
        "Clear fruit, lively acidity, low or no added sulphur",
        "Often drinkable young — sometimes lightly cloudy",
        "Southern French grapes: Grenache, Carignan, Syrah and more",
        "Natural wine without additives from small producers",
      ],
      foodPairing:
        "This type of wine is versatile at the table. The redder examples suit charcuterie, grilled dishes and Mediterranean food; the more orange ones handle spice, roasted vegetables and hard cheese. Serve cooler than a heavy red — often 12–16°C depending on style.",
      aboutText:
        "Curated red & orange natural wine from Languedoc — direct imported to Stockholm when the pallet fills.",
    },
  },
  "rod-och-vit-vin": {
    sv: {
      contentHeading: "Om rött & vitt vin",
      longDescription:
        "Rött & vitt vin — ibland kallat field blend eller co-fermentation — är viner där röda och vita druvor skördas och jäser tillsammans. Det är en gammal medelhavs tradition som ger flaskor med färg och struktur någonstans mellan rosé och lätt rött: mer kropp än ett vitt, mer frukt och fräschör än många tunga röda.\n\nI Languedoc blandas ofta Grenache, Carignan eller Cinsault med vita druvor som Grenache Blanc eller Macabeu. Resultatet kan variera från nästan roséfärgade viner till djupare granat — alltid med den sydfranska solmognade frukten och den levande syran som kännetecknar regionen. Många av producenterna på PACT arbetar dessutom ekologiskt eller biodynamiskt, och flera gör vin utan tillsatser.\n\nHär hittar du flaskor för dig som vill ha något annorlunda vid bordet utan att gå fullt orange eller tungt rött — perfekt till vardagsmat och sammankomster där ett vin ska passa flera rätter.",
      tastingProfile: [
        "Fältblandningar av röda och vita druvor",
        "Färg från ljus granat till nästan rosé",
        "Fruktig, drickbar och matvänlig",
        "Typiska druvor: Grenache, Carignan, Grenache Blanc",
        "Ofta från ekologiska småproducenter i Languedoc",
      ],
      foodPairing:
        "Ett av de mest flexibla vinerna till middag. Passar grillat, pizza, kyckling, fisk i ugn och medelhavssallader. Fungerar även till lättare chark. Servera lätt kyld, runt 12–14°C, för maximal fräschör.",
      aboutText:
        "Rött & vitt vin direktimporterat från Languedoc — field blends från småproducenter, hemleverans i Stockholm via PACT.",
    },
  },
  "red-and-white-wine": {
    en: {
      contentHeading: "About red & white wine",
      longDescription:
        "Red & white wine — sometimes called a field blend or co-fermentation — is wine where red and white grapes are harvested and fermented together. It is an old Mediterranean tradition that gives bottles with colour and structure somewhere between rosé and light red: more body than a white, more fruit and freshness than many heavy reds.\n\nIn Languedoc, Grenache, Carignan or Cinsault are often blended with white grapes like Grenache Blanc or Macabeu. The result can range from almost rosé-coloured wines to deeper garnet — always with the sun-ripened southern French fruit and lively acidity that define the region. Many producers on PACT also farm organically or biodynamically, and several make wine without additives.\n\nHere you'll find bottles for anyone who wants something different at the table without going fully orange or heavy red — perfect for everyday food and gatherings where one wine needs to suit several dishes.",
      tastingProfile: [
        "Field blends of red and white grapes",
        "Colour from light garnet to almost rosé",
        "Fruity, drinkable and food-friendly",
        "Typical grapes: Grenache, Carignan, Grenache Blanc",
        "Often from organic small producers in Languedoc",
      ],
      foodPairing:
        "One of the most flexible wines for dinner. Suits grilled food, pizza, chicken, baked fish and Mediterranean salads. Works with lighter charcuterie too. Serve lightly chilled, around 12–14°C, for maximum freshness.",
      aboutText:
        "Red & white wine direct imported from Languedoc — field blends from small producers, home delivery in Stockholm via PACT.",
    },
  },
  "rott-biodynamiskt-vin": {
    sv: {
      title: "Rött biodynamiskt vin — köp direkt från Languedoc | PACT Wines",
      metaDescription:
        "Köp rött biodynamiskt vin online. Demeter-certifierade röda viner från Languedoc — direktimport med hemleverans Stockholm via PACT.",
      contentHeading: "Om rött biodynamiskt vin",
      longDescription:
        "Biodynamiskt vin går ett steg längre än ekologiskt: vingården sköts enligt biodynamiska principer med fokus på jordhälsa, biodiversitet och en helhetssyn på vingården som levande system. Rött biodynamiskt vin från Languedoc kombinerar den filosofin med regionens naturliga styrkor — gamla Carignan-stockar, Grenache på stenig mark och Syrah med pepprig precision.\n\nI glaset möter du ofta ren frukt, tydlig mineralitet och en känsla av plats som kommer från låga skördar och manuellt arbete. Biodynamisk certifiering (t.ex. Demeter) är inte garanti för smak, men signalerar att producenten investerat djupt i vingården — något som syns särskilt i torra, solutsatta lägen i södra Frankrike.\n\nAlla röda biodynamiska viner på PACT kommer direkt från oberoende producenter vi samarbetar med i Languedoc. Direktimport innebär bättre pris och kortare väg från vingård till glas.",
      tastingProfile: [
        "Certifierad biodynamisk odling (t.ex. Demeter)",
        "Rena, platsdrivna röda viner",
        "Carignan, Grenache, Syrah från Languedoc",
        "Mineralitet och struktur utan tung ek",
        "Direkt från små producenter utan mellanhänder",
      ],
      foodPairing:
        "Passar till det som rött vin från Medelhavet gör bäst: lamm, grytor, grillat, svamp och mogna ostar. Lättare stilar fungerar även till chark och pizza. Servera något svalare om vinet känns saftigt och ungt.",
      aboutText:
        "Rött biodynamiskt vin från Languedoc — direktimporterat från certifierade småproducenter till Stockholm.",
    },
  },
  "red-biodynamic-wine": {
    en: {
      title: "Red Biodynamic Wine — Buy Direct from Languedoc | PACT Wines",
      metaDescription:
        "Buy red biodynamic wine online. Demeter-certified red wines from Languedoc — direct import with home delivery in Stockholm via PACT.",
      contentHeading: "About red biodynamic wine",
      longDescription:
        "Biodynamic wine goes a step beyond organic: the vineyard is managed on biodynamic principles with a focus on soil health, biodiversity and seeing the vineyard as a living system. Red biodynamic wine from Languedoc combines that philosophy with the region's natural strengths — old Carignan vines, Grenache on stony ground and Syrah with peppery precision.\n\nIn the glass you often meet clean fruit, clear minerality and a sense of place that comes from low yields and manual work. Biodynamic certification (e.g. Demeter) is no guarantee of taste, but signals that the producer has invested deeply in the vineyard — especially visible in dry, sun-exposed sites in southern France.\n\nAll red biodynamic wines at PACT come directly from independent producers we work with in Languedoc. Direct import means better value and a shorter path from vineyard to glass.",
      tastingProfile: [
        "Certified biodynamic farming (e.g. Demeter)",
        "Clean, place-driven red wines",
        "Carignan, Grenache, Syrah from Languedoc",
        "Minerality and structure without heavy oak",
        "Direct from small producers without middlemen",
      ],
      foodPairing:
        "Suits what Mediterranean red does best: lamb, stews, grilled food, mushrooms and aged cheeses. Lighter styles also work with charcuterie and pizza. Serve slightly cooler if the wine feels juicy and young.",
      aboutText:
        "Red biodynamic wine from Languedoc — direct imported from certified small producers to Stockholm.",
    },
  },
  "vitt-biodynamiskt-vin": {
    sv: {
      title: "Vitt biodynamiskt vin — köp direkt från Languedoc | PACT Wines",
      metaDescription:
        "Köp vitt biodynamiskt vin online. Demeter-certifierade vita viner från Languedoc — direktimport med hemleverans Stockholm via PACT.",
      contentHeading: "Om vitt biodynamiskt vin",
      longDescription:
        "Vitt biodynamiskt vin kombinerar biodynamisk vingårdsfilosofi — jordhälsa, biodiversitet och certifiering enligt t.ex. Demeter — med Languedocs naturliga fördelar för vita druvor: lång växtsäsong, kustnärhet och svalare höjdlägen som ger fräschör och arom.\n\nI glaset hittar du allt från rena, citrusdrivna viner på Vermentino och Grenache Blanc till mer texturala flaskor med kort skalkontakt eller oxidativ hantering. Biodynamisk odling handlar om helheten i vingården; i källaren arbetar producenterna ofta med låg intervention, vilket ger vita viner med tydlig platskaraktär snarare än standardiserad stil.\n\nPACT importerar vitt biodynamiskt vin direkt från små producenter i Languedoc till Stockholm. Reservera innan pallen fylls — utan mellanhänder och utan onödiga lagerled.",
      tastingProfile: [
        "Demeter eller annan biodynamisk certifiering",
        "Frisk syra och medelhavsfrukt",
        "Vermentino, Grenache Blanc, Roussanne m.fl.",
        "Från kust- och höjdlägesvingårdar",
        "Direktimporterat till Stockholm",
      ],
      foodPairing:
        "Skaldjur, grillad fisk, sallader, getost och lättare kycklingrätter. Viner med mer textur passar även till grönsaksrätter i ugn. Servera kallt, runt 10–12°C.",
      aboutText:
        "Vitt biodynamiskt vin från Languedoc — direkt från certifierade producenter via PACT.",
    },
  },
  "white-biodynamic-wine": {
    en: {
      title: "White Biodynamic Wine — Buy Direct from Languedoc | PACT Wines",
      metaDescription:
        "Buy white biodynamic wine online. Demeter-certified white wines from Languedoc — direct import with home delivery in Stockholm via PACT.",
      contentHeading: "About white biodynamic wine",
      longDescription:
        "White biodynamic wine combines biodynamic vineyard philosophy — soil health, biodiversity and certification such as Demeter — with Languedoc's natural strengths for white grapes: long growing season, coastal influence and cooler altitude sites that give freshness and aroma.\n\nIn the glass you'll find everything from clean, citrus-driven wines on Vermentino and Grenache Blanc to more textured bottles with short skin contact or oxidative handling. Biodynamic farming is about the whole vineyard; in the cellar producers often work with low intervention, giving whites with clear sense of place rather than a standardised style.\n\nPACT imports white biodynamic wine direct from small producers in Languedoc to Stockholm. Reserve before the pallet fills — no middlemen and no unnecessary warehousing.",
      tastingProfile: [
        "Demeter or other biodynamic certification",
        "Fresh acidity and Mediterranean fruit",
        "Vermentino, Grenache Blanc, Roussanne and more",
        "From coastal and altitude vineyards",
        "Direct imported to Stockholm",
      ],
      foodPairing:
        "Shellfish, grilled fish, salads, goat's cheese and lighter chicken dishes. More textured wines also suit baked vegetable dishes. Serve chilled, around 10–12°C.",
      aboutText:
        "White biodynamic wine from Languedoc — direct from certified producers via PACT.",
    },
  },
  "orange-biodynamiskt-vin": {
    sv: {
      title: "Orange biodynamiskt vin — köp direkt från Languedoc | PACT Wines",
      metaDescription:
        "Köp orange biodynamiskt vin online. Demeter-certifierade skalkontaktviner från Languedoc — direktimport med hemleverans Stockholm via PACT.",
      contentHeading: "Om orange biodynamiskt vin",
      longDescription:
        "Orange biodynamiskt vin förenar två idéer som passar varandra: skalkontakt på vita druvor som ger färg, tannin och textur — och biodynamisk odling som stärker vingårdens ekosystem och ger sunda, koncentrerade druvor att arbeta med.\n\nI Languedoc görs orangevin ofta på Grenache Blanc, Macabeu och andra lokala sorter med dagar eller veckor på skalet. Biodynamisk certifiering signalerar att producenten investerat djupt i vingården; resultatet kan variera från lätt, te-liknande viner till mer strukturerade flaskor med kryddig garrigue och fast tannin.\n\nUrval på PACT är litet och kuraterat. Vi importerar direkt från oberoende producenter i Languedoc till Stockholm — reservera innan pallen fylls.",
      tastingProfile: [
        "Biodynamisk certifiering (t.ex. Demeter)",
        "Vita druvor med skalkontakt",
        "Amberfärg, textur och medelhavsörter",
        "Grenache Blanc, Macabeu och lokala sorter",
        "Direktimporterat utan mellanhänder",
      ],
      foodPairing:
        "Kryddstark mat, moroccan-inspirerade rätter, grillad fisk, svamp och hårdost. Servera lätt kyld, runt 12–14°C.",
      aboutText:
        "Orange biodynamiskt vin från Languedoc — skalkontakt och biodynamisk odling, direkt via PACT.",
    },
  },
  "orange-biodynamic-wine": {
    en: {
      title: "Orange Biodynamic Wine — Buy Direct from Languedoc | PACT Wines",
      metaDescription:
        "Buy orange biodynamic wine online. Demeter-certified skin-contact wines from Languedoc — direct import with home delivery in Stockholm via PACT.",
      contentHeading: "About orange biodynamic wine",
      longDescription:
        "Orange biodynamic wine brings together two ideas that suit each other: skin contact on white grapes for colour, tannin and texture — and biodynamic farming that strengthens the vineyard ecosystem and gives sound, concentrated grapes to work with.\n\nIn Languedoc, orange wines are often made from Grenache Blanc, Macabeu and other local varieties with days or weeks on the skins. Biodynamic certification signals deep investment in the vineyard; results can range from light, tea-like wines to more structured bottles with spicy garrigue and firm tannin.\n\nPACT's selection is small and curated. We import direct from independent producers in Languedoc to Stockholm — reserve before the pallet fills.",
      tastingProfile: [
        "Biodynamic certification (e.g. Demeter)",
        "White grapes with skin contact",
        "Amber colour, texture and Mediterranean herbs",
        "Grenache Blanc, Macabeu and local varieties",
        "Direct imported without middlemen",
      ],
      foodPairing:
        "Spiced food, Moroccan-inspired dishes, grilled fish, mushrooms and hard cheese. Serve lightly chilled, around 12–14°C.",
      aboutText:
        "Orange biodynamic wine from Languedoc — skin contact and biodynamic farming, direct via PACT.",
    },
  },
  "rod-och-vit-biodynamiskt-vin": {
    sv: {
      contentHeading: "Om rött & vitt biodynamiskt vin",
      longDescription:
        "Rött & vitt biodynamiskt vin — field blends eller co-fermentation — är flaskor där röda och vita druvor skördas och jäser tillsammans, från vingårdar som sköts enligt biodynamiska principer. Det ger viner med färg och struktur någonstans mellan rosé och lätt rött, ofta med mer frukt och fräschör än tunga röda.\n\nI Languedoc blandas ofta Grenache, Carignan eller Cinsault med vita druvor som Grenache Blanc eller Macabeu. Biodynamisk certifiering gäller vingården; stilen i glaset kan variera från nästan roséfärgat till djupare granat. Gemensamt är låga skördar, manuellt arbete och producenter som ser vingården som ett levande system.\n\nPACTs urval är litet. Allt direktimporterat från Languedoc till Stockholm — reservera innan pallen fylls.",
      tastingProfile: [
        "Biodynamisk certifiering i vingården",
        "Co-fermentation av röda och vita druvor",
        "Drickbar, fruktig och matvänlig",
        "Grenache, Carignan, Grenache Blanc m.fl.",
        "Direkt från små producenter i Languedoc",
      ],
      foodPairing:
        "Ett vin för hela bordet — chark, fisk, kyckling, pizza och grönsaker. Servera lätt kyld för bästa balans.",
      aboutText:
        "Rött & vitt biodynamiskt vin från Languedoc — field blends, direktimporterat via PACT.",
    },
  },
  "red-and-white-biodynamic-wine": {
    en: {
      contentHeading: "About red & white biodynamic wine",
      longDescription:
        "Red & white biodynamic wine — field blends or co-fermentation — is wine where red and white grapes are harvested and fermented together, from vineyards managed on biodynamic principles. That gives bottles with colour and structure somewhere between rosé and light red, often with more fruit and freshness than heavy reds.\n\nIn Languedoc, Grenache, Carignan or Cinsault are often blended with white grapes like Grenache Blanc or Macabeu. Biodynamic certification applies to the vineyard; styles in the glass can range from almost rosé-coloured to deeper garnet. What they share is low yields, manual work and producers who see the vineyard as a living system.\n\nPACT's selection is small. All direct imported from Languedoc to Stockholm — reserve before the pallet fills.",
      tastingProfile: [
        "Biodynamic certification in the vineyard",
        "Co-fermentation of red and white grapes",
        "Drinkable, fruity and food-friendly",
        "Grenache, Carignan, Grenache Blanc and more",
        "Direct from small producers in Languedoc",
      ],
      foodPairing:
        "A wine for the whole table — charcuterie, fish, chicken, pizza and vegetables. Serve lightly chilled for the best balance.",
      aboutText:
        "Red & white biodynamic wine from Languedoc — field blends, direct imported via PACT.",
    },
  },
  "rod-och-orange-biodynamiskt-vin": {
    sv: {
      contentHeading: "Om rött & orange biodynamiskt vin",
      longDescription:
        "Rött & orange biodynamiskt vin samlar flaskor där producenten arbetar biodynamiskt i vingården och uttrycker sig genom både röda druvor och orangevinifiering — fältblandningar, parallella skördar i samma cuvée, eller viner som rör sig mellan lätt skalkontakt och klassisk röd jäsning.\n\nKategorin fångar den experimentella sidan av Languedoc: samma vingård, samma biodynamiska filosofi, men flera uttryck i sortimentet. Du kan hitta allt från lättdruckna röda med en hint av skalkontakt till amberfärgade viner med tydlig tannin. Druvbasen är sydfransk — Grenache, Carignan, Syrah och lokala vita sorter.\n\nPACT importerar direkt från oberoende producenter vi samarbetar med. Reservera innan pallen till Stockholm fylls.",
      tastingProfile: [
        "Biodynamisk odling (t.ex. Demeter)",
        "Spektrum mellan rött och orange",
        "Fältblandningar och skalkontakt",
        "Grenache, Carignan, Syrah och lokala vita druvor",
        "Direktimporterat till Stockholm",
      ],
      foodPairing:
        "Medelhavsmat, grillade grönsaker, chark och kryddiga rätter. Servera svalt — testa 12–15°C.",
      aboutText:
        "Rött & orange biodynamiskt vin från Languedoc — direkt från certifierade producenter via PACT.",
    },
  },
  "red-and-orange-biodynamic-wine": {
    en: {
      contentHeading: "About red & orange biodynamic wine",
      longDescription:
        "Red & orange biodynamic wine brings together bottles where the producer farms biodynamically and expresses both red grapes and orange winemaking — field blends, parallel harvests in the same cuvée, or wines that move between light skin contact and classic red fermentation.\n\nThe category captures Languedoc's experimental side: the same vineyard, the same biodynamic philosophy, but several expressions in the range. You can find everything from easy-drinking reds with a hint of skin contact to amber wines with clear tannin. The grape base is southern French — Grenache, Carignan, Syrah and local white varieties.\n\nPACT imports direct from independent producers we work with. Reserve before the pallet to Stockholm fills.",
      tastingProfile: [
        "Biodynamic farming (e.g. Demeter)",
        "Spectrum between red and orange",
        "Field blends and skin contact",
        "Grenache, Carignan, Syrah and local white grapes",
        "Direct imported to Stockholm",
      ],
      foodPairing:
        "Mediterranean food, grilled vegetables, charcuterie and spiced dishes. Serve slightly chilled — try 12–15°C.",
      aboutText:
        "Red & orange biodynamic wine from Languedoc — direct from certified producers via PACT.",
    },
  },
  "vitt-ekologiskt-vin": {
    sv: {
      title: "Vitt ekologiskt vin — köp direkt från Languedoc | PACT Wines",
      metaDescription:
        "Köp vitt ekologiskt vin online. Certifierat ekologiska vita viner från Languedoc — direktimport med hemleverans Stockholm via PACT.",
      contentHeading: "Om vitt ekologiskt vin",
      longDescription:
        "Ekologiskt vin innebär att druvorna odlas utan syntetiska bekämpningsmedel, konstgödsel och med respekt för jord och ekosystem — certifierat enligt EU:s ekologiska regler. Vitt ekologiskt vin från Languedoc utnyttjar regionens långa växtsäsong och kustnära eller höjdbelägna vingårdar för att ge friska, aromatiska viner med tydlig frukt.\n\nHär hittar du allt från rena, friska viner på Vermentino och Grenache Blanc till mer texturala stilar med kort skalkontakt. Många producenter arbetar också med minimal intervention i källaren, även om ekologisk certifiering i sig handlar om vingården. Det ger vita viner som är lätta att dricka men ändå har personlighet.\n\nPACT importerar ekologiskt vitt vin direkt från små producenter i Languedoc. När tillräckligt många reserverat fylls en pall och vinet skickas direkt till Stockholm — utan onödiga lagerled.",
      tastingProfile: [
        "EU-certifierad ekologisk odling",
        "Friska vita viner med tydlig frukt",
        "Vermentino, Grenache Blanc, Roussanne m.fl.",
        "Från kust- och höjdlägesvingårdar",
        "Direktimport från oberoende producenter",
      ],
      foodPairing:
        "Perfekt till fisk, skaldjur, sallader, getost och lättare kycklingrätter. Viner med mer kropp klarar även grönsaksrätter i ugn och medelhavsinspirerad mat. Servera kallt men inte iskallt — 10–12°C är ofta idealiskt.",
      aboutText:
        "Vitt ekologiskt vin från Languedoc — certifierat odlat, direktimporterat till Stockholm via PACT.",
    },
  },
  "white-organic-wine": {
    en: {
      title: "White Organic Wine — Buy Direct from Languedoc | PACT Wines",
      metaDescription:
        "Buy white organic wine online. Certified organic white wines from Languedoc — direct import with home delivery in Stockholm via PACT.",
      contentHeading: "About white organic wine",
      longDescription:
        "Organic wine means grapes grown without synthetic pesticides or fertilisers, with respect for soil and ecosystem — certified under EU organic rules. White organic wine from Languedoc uses the region's long growing season and coastal or altitude vineyards to produce fresh, aromatic wines with clear fruit.\n\nHere you'll find everything from clean, crisp wines on Vermentino and Grenache Blanc to more textured styles with short skin contact. Many producers also work with minimal intervention in the cellar, even though organic certification itself concerns the vineyard. That gives white wines that are easy to drink but still have personality.\n\nPACT imports organic white wine directly from small producers in Languedoc. When enough people reserve, a pallet fills and the wine ships directly to Stockholm — without unnecessary warehousing.",
      tastingProfile: [
        "EU-certified organic farming",
        "Fresh white wines with clear fruit",
        "Vermentino, Grenache Blanc, Roussanne and more",
        "From coastal and altitude vineyards",
        "Direct import from independent producers",
      ],
      foodPairing:
        "Perfect with fish, shellfish, salads, goat's cheese and lighter chicken dishes. Wines with more body also handle baked vegetables and Mediterranean food. Serve cold but not ice-cold — 10–12°C is often ideal.",
      aboutText:
        "White organic wine from Languedoc — certified farming, direct imported to Stockholm via PACT.",
    },
  },
  "orange-ekologiskt-vin": {
    sv: {
      title: "Orange ekologiskt vin — köp skalkontaktvin direkt | PACT Wines",
      metaDescription:
        "Köp orange ekologiskt vin från Languedoc. Certifierat ekologiska skalkontaktviner — direktimport med hemleverans Stockholm via PACT.",
      contentHeading: "Om orange ekologiskt vin",
      longDescription:
        "Orange ekologiskt vin förenar skalkontakt på vita druvor med ekologisk odling enligt EU:s regler — utan syntetiska bekämpningsmedel i vingården och med fokus på jordhälsa och biodiversitet. Skalkontakten ger färg, tannin och textur som ett rött vin skulle ha, men med vit druvas frukt och syra.\n\nI Languedoc görs orangevin ofta på Grenache Blanc, Macabeu och andra lokala sorter. Ekologisk certifiering gäller vingården; i källaren arbetar många producenter med minimal intervention, vilket ger flaskor med tydlig platskaraktär. Stilarna spänner från lätt och te-liknande till mer strukturerade viner med kryddig garrigue.\n\nPACT importerar orange ekologiskt vin direkt från små producenter i Languedoc till Stockholm. Reservera innan pallen fylls — utan mellanhänder.",
      tastingProfile: [
        "EU-certifierad ekologisk odling",
        "Vita druvor med skalkontakt",
        "Amberfärg, textur och medelhavsörter",
        "Grenache Blanc, Macabeu och lokala sorter",
        "Direktimporterat till Stockholm",
      ],
      foodPairing:
        "Kryddstark mat, grillad fisk, svamp, hårdost och medelhavsinspirerade rätter. Servera lätt kyld, runt 12–14°C.",
      aboutText:
        "Orange ekologiskt vin från Languedoc — certifierat odlat, direkt via PACT.",
    },
  },
  "orange-organic-wine": {
    en: {
      title: "Orange Organic Wine — Buy Skin-Contact Wine Direct | PACT Wines",
      metaDescription:
        "Buy orange organic wine from Languedoc. Certified organic skin-contact wines — direct import with home delivery in Stockholm via PACT.",
      contentHeading: "About orange organic wine",
      longDescription:
        "Orange organic wine combines skin contact on white grapes with organic farming under EU rules — no synthetic pesticides in the vineyard and a focus on soil health and biodiversity. Skin contact gives colour, tannin and texture like a red wine would, but with a white grape's fruit and acidity.\n\nIn Languedoc, orange wines are often made from Grenache Blanc, Macabeu and other local varieties. Organic certification applies to the vineyard; in the cellar many producers work with minimal intervention, giving bottles with clear sense of place. Styles range from light and tea-like to more structured wines with spicy garrigue.\n\nPACT imports orange organic wine direct from small producers in Languedoc to Stockholm. Reserve before the pallet fills — no middlemen.",
      tastingProfile: [
        "EU-certified organic farming",
        "White grapes with skin contact",
        "Amber colour, texture and Mediterranean herbs",
        "Grenache Blanc, Macabeu and local varieties",
        "Direct imported to Stockholm",
      ],
      foodPairing:
        "Spiced food, grilled fish, mushrooms, hard cheese and Mediterranean-inspired dishes. Serve lightly chilled, around 12–14°C.",
      aboutText:
        "Orange organic wine from Languedoc — certified farming, direct via PACT.",
    },
  },
  "rod-och-orange-ekologiskt-vin": {
    sv: {
      contentHeading: "Om rött & orange ekologiskt vin",
      longDescription:
        "Den här kategorin samlar ekologiskt odlade viner som rör sig mellan rött och orange — antingen genom fältblandningar, kort skalkontakt på vita druvor kombinerat med röda, eller producenters experimentella cuvéer. Det är en nisch, men en viktig en: den visar hur Languedocs producenter uttrycker samma ekologiska vingård på flera sätt.\n\nEkologisk certifiering säkerställer att druvorna odlats utan syntetiska medel i vingården. I källaren varierar stilen — vissa flaskor är lättdruckna och rödfruktiga, andra har tydlig amberfärg och tannin från skalkontakt. Gemensamt är den sydfranska druvbasen och den direkta, fruktiga profilen.\n\nUrval på PACT är litet och speglar vad våra producenter faktiskt gör just nu. Allt direktimporterat från Languedoc till Stockholm.",
      tastingProfile: [
        "EU-certifierad ekologisk odling",
        "Spektrum mellan rött och orange",
        "Fältblandningar och skalkontakt vanligt",
        "Grenache, Carignan och lokala vita druvor",
        "Direkt från små producenter i Languedoc",
      ],
      foodPairing:
        "Fungerar till medelhavsmat, grillade grönsaker, chark och rätter med kryddor som kräver både frukt och struktur. Servera svalt — testa 12–15°C och justera efter hur orange vinet känns.",
      aboutText:
        "Rött & orange ekologiskt vin från Languedoc — kurerat urval, direktimport till Stockholm.",
    },
  },
  "red-and-orange-organic-wine": {
    en: {
      contentHeading: "About red & orange organic wine",
      longDescription:
        "This category gathers organically farmed wines that move between red and orange — through field blends, short skin contact on white grapes combined with reds, or producers' experimental cuvées. It is a niche, but an important one: it shows how Languedoc producers express the same organic vineyard in several ways.\n\nOrganic certification ensures grapes were grown without synthetic inputs in the vineyard. In the cellar styles vary — some bottles are easy-drinking and red-fruited, others have clear amber colour and tannin from skin contact. What they share is the southern French grape base and a direct, fruity profile.\n\nThe selection at PACT is small and reflects what our producers are actually making right now. All direct imported from Languedoc to Stockholm.",
      tastingProfile: [
        "EU-certified organic farming",
        "Spectrum between red and orange",
        "Field blends and skin contact common",
        "Grenache, Carignan and local white grapes",
        "Direct from small producers in Languedoc",
      ],
      foodPairing:
        "Works with Mediterranean food, grilled vegetables, charcuterie and dishes with spice that need both fruit and structure. Serve cool — try 12–15°C and adjust depending on how orange the wine feels.",
      aboutText:
        "Red & orange organic wine from Languedoc — curated selection, direct import to Stockholm.",
    },
  },
  "rott-ekologiskt-vin": {
    sv: {
      title: "Rött ekologiskt vin — köp direkt från Languedoc | PACT Wines",
      metaDescription:
        "Köp rött ekologiskt vin online. Carignan, Grenache och Syrah från Languedoc — EU-certifierat, hemleverans Stockholm via PACT.",
      contentHeading: "Om rött ekologiskt vin",
      longDescription:
        "Rött ekologiskt vin från Languedoc bygger på sydfransk druvtradition — Carignan, Grenache, Syrah, Cinsault — odlad enligt EU:s ekologiska regler. Utan syntetiska bekämpningsmedel och med fokus på jordhälsa får vingårdarna uttrycka plats tydligare, vilket ofta syns i renare frukt och mer transparent smak.\n\nStilarna spänner från lätta, nästan svalserverade röda till mer strukturerade viner från gamla stockar. Ekologisk certifiering handlar om vingården; i källaren kan producenterna fortfarande arbeta med minimal intervention eller mer klassiska metoder. På PACT väljer vi producenter vars ekologiska röda viner vi tycker är genuint bra — inte bara korrekt certifierade.\n\nDirektimport från Languedoc ger bättre pris och färskare flaskor till Stockholm. Reservera innan pallen fylls.",
      tastingProfile: [
        "EU-certifierad ekologisk odling",
        "Carignan, Grenache, Syrah från Languedoc",
        "Från lättdrucket till strukturerat",
        "Tydlig frukt och medelhavskaraktär",
        "Direktimporterat utan mellanhänder",
      ],
      foodPairing:
        "Klassiska röda kombinationer: lamm, gryta, grillat, svamp och ost. Lättare viner till chark och pizza. Servera något svalare för unga, fruktiga stilar.",
      aboutText:
        "Rött ekologiskt vin från Languedoc — direkt från småproducenter till Stockholm via PACT.",
    },
  },
  "red-organic-wine": {
    en: {
      title: "Red Organic Wine — Buy Direct from Languedoc | PACT Wines",
      metaDescription:
        "Buy red organic wine online. Carignan, Grenache and Syrah from Languedoc — EU-certified, home delivery Stockholm via PACT.",
      contentHeading: "About red organic wine",
      longDescription:
        "Red organic wine from Languedoc builds on southern French grape tradition — Carignan, Grenache, Syrah, Cinsault — grown under EU organic rules. Without synthetic pesticides and with a focus on soil health, vineyards express place more clearly, which often shows in cleaner fruit and more transparent flavour.\n\nStyles range from light, almost chillable reds to more structured wines from old vines. Organic certification concerns the vineyard; in the cellar producers may still work with minimal intervention or more classic methods. At PACT we choose producers whose organic reds we think are genuinely good — not just correctly certified.\n\nDirect import from Languedoc gives better value and fresher bottles in Stockholm. Reserve before the pallet fills.",
      tastingProfile: [
        "EU-certified organic farming",
        "Carignan, Grenache, Syrah from Languedoc",
        "From easy-drinking to structured",
        "Clear fruit and Mediterranean character",
        "Direct imported without middlemen",
      ],
      foodPairing:
        "Classic red pairings: lamb, stew, grilled food, mushrooms and cheese. Lighter wines with charcuterie and pizza. Serve slightly cooler for young, fruity styles.",
      aboutText:
        "Red organic wine from Languedoc — direct from small producers to Stockholm via PACT.",
    },
  },
  "rod-och-vit-naturvin": {
    sv: {
      contentHeading: "Om rött & vitt naturvin",
      longDescription:
        "Naturvin gjort på både röda och vita druvor — co-fermentation eller fältblandning — kombinerar två av naturvinsrörelsens mest tillgängliga idéer: ärligt jordnära vinifiering utan tillsatser, och den drickbara, matvänliga stil som uppstår när rött och vitt möts i samma tank.\n\nI Languedoc är detta inget gimmick utan en levande tradition bland unga producenter som vill fånga hela vingårdens skörd i en flaska. Du kan få allt från nästan roséfärgade naturviner till djupare, saftiga röda med en friskhet som kommer från de vita druvorna. Vild jäsning, ingen filtrering och låg eller ingen svavel är norm.\n\nPACTs urval är litet. Vi importerar bara flaskor från producenter vi litar på — direkt från Languedoc till Stockholm.",
      tastingProfile: [
        "Co-fermentation av röda och vita druvor",
        "Naturvin: vild jäsning, inga tillsatser",
        "Drickbar, fruktig och matvänlig",
        "Låg eller ingen tillsatt svavel",
        "Direkt från små producenter i Languedoc",
      ],
      foodPairing:
        "Ett naturvin för hela bordet — chark, fisk, kyckling, pizza och grönsaker. Servera lätt kyld för bästa balans mellan frukt och syra.",
      aboutText:
        "Rött & vitt naturvin från Languedoc — field blends utan tillsatser, direktimporterat via PACT.",
    },
  },
  "red-and-white-natural-wine": {
    en: {
      contentHeading: "About red & white natural wine",
      longDescription:
        "Natural wine made from both red and white grapes — co-fermentation or field blend — combines two of the natural wine movement's most accessible ideas: honest, earthy winemaking without additives, and the drinkable, food-friendly style that emerges when red and white meet in the same tank.\n\nIn Languedoc this is not a gimmick but a living tradition among young producers who want to capture the whole vineyard harvest in one bottle. You can get everything from almost rosé-coloured natural wines to deeper, juicier reds with freshness from the white grapes. Wild fermentation, no filtration and low or no sulphur is the norm.\n\nPACT's selection is small. We import only bottles from producers we trust — direct from Languedoc to Stockholm.",
      tastingProfile: [
        "Co-fermentation of red and white grapes",
        "Natural wine: wild fermentation, no additives",
        "Drinkable, fruity and food-friendly",
        "Low or no added sulphur",
        "Direct from small producers in Languedoc",
      ],
      foodPairing:
        "A natural wine for the whole table — charcuterie, fish, chicken, pizza and vegetables. Serve lightly chilled for the best balance of fruit and acidity.",
      aboutText:
        "Red & white natural wine from Languedoc — field blends without additives, direct imported via PACT.",
    },
  },
  "naturvin-languedoc": {
    sv: {
      title: "Naturvin från Languedoc — köp direkt till Stockholm | PACT Wines",
      metaDescription:
        "Naturvin från Languedoc direktimporterat till Stockholm. Småproducenter, vild jäsning och utan tillsatser — reservera innan pallen fylls.",
      contentHeading: "Om naturvin från Languedoc",
      longDescription:
        "Languedoc-Roussillon är Frankrikes största vinregion och samtidigt den mest dynamiska när det gäller naturvin. Här finns allt från kalkiga sluttningar i Minervois och Saint-Chinian till skiffer i Faugères och höjdläge i Haute Vallée de l'Orb — terroir som ger distinkta, drickbara viner utan att behöva tung ekfatshantering.\n\nNaturvinsrörelsen i Languedoc växte fram när unga producenter tog över gamla vingårdar och började arbeta ekologiskt eller biodynamiskt med vild jäsning och minimal intervention i källaren. Resultatet är ett ekosystem av små, oberoende producenter som gör allt från lätta Cinsault-viner till koncentrerad Carignan och experimentella orangeviner.\n\nPACT importerar uteslutande från Languedoc — direkt från producenten till Stockholm. När tillräckligt många reserverat fylls en pall och flaskorna skickas utan mellanhänder. Det ger bättre pris, färskare vin och en äkta koppling mellan vingård och drickare.",
      tastingProfile: [
        "Medelhavsklimat med svalare nätter i höjdläge",
        "Carignan, Grenache, Syrah, Cinsault och lokala vita druvor",
        "Vild jäsning, låg eller ingen tillsatt svavel",
        "Från lättdrucket till strukturerat och mineraliskt",
        "Direktimporterat utan mellanhänder",
      ],
      foodPairing:
        "Languedoc-naturvin är gjort för mat — från grillat lamm och cassoulet till chark, pizza och grönsaksrätter. De lätta röda och orangeviner kan serveras något svalare; de fylligare röda passar till långkok och ost.",
      aboutText:
        "Naturvin från Languedoc — direkt från småproducenter till Stockholm via PACT.",
    },
  },
  "natural-wine-languedoc": {
    en: {
      title: "Natural Wine from Languedoc — Buy Direct to Stockholm | PACT Wines",
      metaDescription:
        "Natural wine from Languedoc direct imported to Stockholm. Small producers, wild fermentation and without additives — reserve before the pallet fills.",
      contentHeading: "About natural wine from Languedoc",
      longDescription:
        "Languedoc-Roussillon is France's largest wine region and at the same time the most dynamic for natural wine. Here you'll find everything from limestone slopes in Minervois and Saint-Chinian to schist in Faugères and altitude in Haute Vallée de l'Orb — terroir that gives distinctive, drinkable wines without heavy oak ageing.\n\nThe natural wine movement in Languedoc grew when young producers took over old vineyards and began farming organically or biodynamically with wild fermentation and minimal intervention in the cellar. The result is an ecosystem of small, independent producers making everything from light Cinsault wines to concentrated Carignan and experimental orange wines.\n\nPACT imports exclusively from Languedoc — direct from producer to Stockholm. When enough people have reserved, a pallet fills and bottles ship without middlemen. That means better value, fresher wine and a real connection between vineyard and drinker.",
      tastingProfile: [
        "Mediterranean climate with cooler nights at altitude",
        "Carignan, Grenache, Syrah, Cinsault and local white grapes",
        "Wild fermentation, low or no added sulphur",
        "From easy-drinking to structured and mineral",
        "Direct imported without middlemen",
      ],
      foodPairing:
        "Languedoc natural wine is made for food — from grilled lamb and cassoulet to charcuterie, pizza and vegetable dishes. Light reds and orange wines can be served slightly chilled; fuller reds suit slow-cooked dishes and cheese.",
      aboutText:
        "Natural wine from Languedoc — direct from small producers to Stockholm via PACT.",
    },
  },
  "naturvin-frankrike": {
    sv: {
      title: "Köpa naturvin från Frankrike online — direktimport | PACT Wines",
      metaDescription:
        "Köp naturvin från Frankrike online. Franskt naturvin direktimporterat från Languedoc till Stockholm — utan Systembolaget, utan mellanhänder.",
      contentHeading: "Om naturvin från Frankrike",
      longDescription:
        "Frankrike är naturvinets hemland — från Beaujolais och Loire till Jura och Rhône. Men för svenska köpare som vill ha tillgång till franskt naturvin utan dyra importkedjor är Languedoc den mest praktiska ingången: en region med enorm mångfald, rimliga priser och ett tätt nätverk av små producenter som arbetar ekologiskt och utan tillsatser.\n\nPACT fokuserar på Languedoc eftersom det är där vi har byggt relationer med producenter vi litar på — vingårdar som gör ärligt vin med vild jäsning, minimal svavel och tydlig platskaraktär. Du får alltså franskt naturvin i ordets sanna bemärkelse, även om sortimentet kommer från en region snarare än hela landet.\n\nBeställning sker via direktimport: vi samlar reserveringar till Stockholm tills en pall är full, sedan skickar producenten flaskorna direkt till dig. Ingen Systembolagsmonopol, inga onödiga lagerled.",
      tastingProfile: [
        "Franskt naturvin från Languedoc — PACTs fokusregion",
        "Ekologisk eller biodynamisk odling",
        "Vild jäsning utan tillsatser i källaren",
        "Klassiska sydfranska druvor och lokala sorter",
        "Hemleverans i Stockholm via direktimport",
      ],
      foodPairing:
        "Franskt naturvin passar till det mesta på bordet — från ostbricka och chark till fisk, fågel och grönsaksrätter. Låt syran och frukten balansera fet mat och kryddor.",
      aboutText:
        "Köp naturvin från Frankrike via PACT — direktimporterat från Languedoc till Stockholm.",
    },
  },
  "natural-wine-france": {
    en: {
      title: "Buy French Natural Wine Online — Direct Import | PACT Wines",
      metaDescription:
        "Buy natural wine from France online. French natural wine direct imported from Languedoc to Stockholm — without middlemen or markups.",
      contentHeading: "About natural wine from France",
      longDescription:
        "France is the homeland of natural wine — from Beaujolais and the Loire to the Jura and the Rhône. But for buyers in Sweden who want French natural wine without expensive import chains, Languedoc is the most practical entry point: a region with enormous diversity, fair prices and a dense network of small producers working organically and without additives.\n\nPACT focuses on Languedoc because that is where we have built relationships with producers we trust — vineyards making honest wine with wild fermentation, minimal sulphur and clear sense of place. You get French natural wine in the true sense, even though the range comes from one region rather than the whole country.\n\nOrders work via direct import: we aggregate reservations to Stockholm until a pallet is full, then the producer ships bottles directly to you. No unnecessary warehousing or markups.",
      tastingProfile: [
        "French natural wine from Languedoc — PACT's focus region",
        "Organic or biodynamic farming",
        "Wild fermentation without cellar additives",
        "Classic southern French grapes and local varieties",
        "Home delivery in Stockholm via direct import",
      ],
      foodPairing:
        "French natural wine suits most of the table — from cheese boards and charcuterie to fish, poultry and vegetable dishes. Let the acidity and fruit balance rich food and spice.",
      aboutText:
        "Buy natural wine from France via PACT — direct imported from Languedoc to Stockholm.",
    },
  },
  "rott-naturvin-languedoc": {
    sv: {
      contentHeading: "Om rött naturvin från Languedoc",
      longDescription:
        "Rött naturvin från Languedoc bygger på sydfransk druvtradition — Carignan, Grenache, Syrah, Cinsault och Mourvèdre — odlad ekologiskt och vinifierad utan tillsatser. Regionens varma dagar och svalare nätter i höjdläge ger mogen frukt med behållen syra, vilket är perfekt för drickbara, matvänliga röda viner.\n\nStilarna varierar enormt. Cinsault från Haute Vallée de l'Orb ger lätta, nästan svalserverade röda. Gamla Carignan-stockar i Faugères och Saint-Chinian ger struktur och mineralitet. Grenache bidrar med saftighet och värme. Producenterna bestämmer om vinet ska vara fruktigt och omedelbart eller mer seriöst och lagringsdugligt.\n\nPACT importerar rött naturvin direkt från dessa producenter till Stockholm. Reservera innan pallen fylls — du får bättre pris och färskare flaskor än via traditionella kedjor.",
      tastingProfile: [
        "Carignan, Grenache, Syrah, Cinsault från Languedoc",
        "Vild jäsning, låg eller ingen svavel",
        "Från lättdrucket till strukturerat",
        "Ofta kolsyremaceration för mjukare tannin",
        "Direktimporterat till Stockholm",
      ],
      foodPairing:
        "Grillat lamm, gryta, chark och pizza. Lättare röda serveras gärna något svalare; fylligare passar till långkok och ost.",
      aboutText:
        "Rött naturvin från Languedoc — direkt från småproducenter via PACT.",
    },
  },
  "red-natural-wine-languedoc": {
    en: {
      contentHeading: "About red natural wine from Languedoc",
      longDescription:
        "Red natural wine from Languedoc builds on southern French grape tradition — Carignan, Grenache, Syrah, Cinsault and Mourvèdre — grown organically and vinified without additives. The region's warm days and cooler nights at altitude give ripe fruit with retained acidity, perfect for drinkable, food-friendly reds.\n\nStyles vary enormously. Cinsault from Haute Vallée de l'Orb gives light, almost chillable reds. Old Carignan vines in Faugères and Saint-Chinian give structure and minerality. Grenache contributes juiciness and warmth. Producers decide whether the wine should be fruity and immediate or more serious and age-worthy.\n\nPACT imports red natural wine direct from these producers to Stockholm. Reserve before the pallet fills — you get better value and fresher bottles than through traditional chains.",
      tastingProfile: [
        "Carignan, Grenache, Syrah, Cinsault from Languedoc",
        "Wild fermentation, low or no sulphur",
        "From easy-drinking to structured",
        "Often carbonic maceration for softer tannin",
        "Direct imported to Stockholm",
      ],
      foodPairing:
        "Grilled lamb, stew, charcuterie and pizza. Lighter reds are often served slightly chilled; fuller styles suit slow-cooked dishes and cheese.",
      aboutText:
        "Red natural wine from Languedoc — direct from small producers via PACT.",
    },
  },
  "vitt-naturvin-languedoc": {
    sv: {
      contentHeading: "Om vitt naturvin från Languedoc",
      longDescription:
        "Vitt naturvin från Languedoc är en underskattad kategori — ofta gjord på lokala druvor som Terret, Bourboulenc, Grenache Blanc och Vermentino, med vild jäsning och minimal intervention. Klimatet ger solmogen frukt, men höjdläge och havsnärhet kan ge den fräschör som gör vinerna levande snarare än tunga.\n\nUtan tillsatt jäst och med låg eller ingen svavel får de vita druvorna uttrycka sin plats tydligt. Stilarna spänner från lätt och citrusdriven till mer texturrik och nästan nötig när producenten arbetar med längre skalkontakt eller äldre ekfat — men alltid inom naturvinets ramar.\n\nPACTs vita naturviner kommer direkt från små producenter i Languedoc. Beställ via direktimport till Stockholm och reservera innan pallen fylls.",
      tastingProfile: [
        "Terret, Bourboulenc, Grenache Blanc, Vermentino",
        "Vild jäsning utan tillsatser",
        "Frisk syra och medelhavsfrukt",
        "Låg eller ingen tillsatt svavel",
        "Direktimporterat från Languedoc",
      ],
      foodPairing:
        "Skaldjur, grillad fisk, sallader och getost. Servera svalt — ofta 10–12°C för bästa balans.",
      aboutText:
        "Vitt naturvin från Languedoc — direkt från producenten till Stockholm.",
    },
  },
  "white-natural-wine-languedoc": {
    en: {
      contentHeading: "About white natural wine from Languedoc",
      longDescription:
        "White natural wine from Languedoc is an underrated category — often made from local grapes such as Terret, Bourboulenc, Grenache Blanc and Vermentino, with wild fermentation and minimal intervention. The climate gives sun-ripe fruit, but altitude and proximity to the sea can provide the freshness that keeps the wines alive rather than heavy.\n\nWithout added yeast and with low or no sulphur, the white grapes express their place clearly. Styles range from light and citrus-driven to more textured and almost nutty when the producer works with longer skin contact or older oak — but always within natural wine's boundaries.\n\nPACT's white natural wines come direct from small producers in Languedoc. Order via direct import to Stockholm and reserve before the pallet fills.",
      tastingProfile: [
        "Terret, Bourboulenc, Grenache Blanc, Vermentino",
        "Wild fermentation without additives",
        "Fresh acidity and Mediterranean fruit",
        "Low or no added sulphur",
        "Direct imported from Languedoc",
      ],
      foodPairing:
        "Shellfish, grilled fish, salads and goat's cheese. Serve chilled — often 10–12°C for the best balance.",
      aboutText:
        "White natural wine from Languedoc — direct from producer to Stockholm.",
    },
  },
  "orange-naturvin-languedoc": {
    sv: {
      contentHeading: "Om orange naturvin från Languedoc",
      longDescription:
        "Orange naturvin från Languedoc görs på vita druvor med skalkontakt — dagar eller veckor på skalet ger färg, tannin och textur som ett rött vin skulle ha, men med vit druvas frukt och syra. I en region där producenter redan arbetar utan tillsatser är orangevin en naturlig förlängning av filosofin: mer druva, mindre manipulation.\n\nLanguedocs orangeviner kan vara lätta och te-liknande eller mer strukturerade med kryddig garrigue och fast tannin. Grenache Blanc, Macabeu och andra lokala sorter är vanliga. Många flaskor är gjorda för att drickas nu — perfekta till mat med krydda, umami och ost.\n\nVia PACT köper du orange naturvin direkt från producenten i Languedoc. Reservera till Stockholm-pallen innan den fylls.",
      tastingProfile: [
        "Vita druvor med skalkontakt",
        "Textur, tannin och medelhavsörter",
        "Vild jäsning, inga tillsatser",
        "Från lätt och teigt till strukturerat",
        "Direktimporterat till Stockholm",
      ],
      foodPairing:
        "Moroccan-inspirerad mat, curry, grillad fisk, hårdost och svamp. Servera lätt kyld, runt 12–14°C.",
      aboutText:
        "Orange naturvin från Languedoc — skalkontakt och karaktär, direkt via PACT.",
    },
  },
  "orange-natural-wine-languedoc": {
    en: {
      contentHeading: "About orange natural wine from Languedoc",
      longDescription:
        "Orange natural wine from Languedoc is made from white grapes with skin contact — days or weeks on the skins give colour, tannin and texture like a red wine would, but with a white grape's fruit and acidity. In a region where producers already work without additives, orange wine is a natural extension of the philosophy: more grape, less manipulation.\n\nLanguedoc orange wines can be light and tea-like or more structured with spicy garrigue and firm tannin. Grenache Blanc, Macabeu and other local varieties are common. Many bottles are made to drink now — perfect with spiced food, umami and cheese.\n\nVia PACT you buy orange natural wine direct from the producer in Languedoc. Reserve for the Stockholm pallet before it fills.",
      tastingProfile: [
        "White grapes with skin contact",
        "Texture, tannin and Mediterranean herbs",
        "Wild fermentation, no additives",
        "From light and tea-like to structured",
        "Direct imported to Stockholm",
      ],
      foodPairing:
        "Moroccan-inspired food, curry, grilled fish, hard cheese and mushrooms. Serve lightly chilled, around 12–14°C.",
      aboutText:
        "Orange natural wine from Languedoc — skin contact and character, direct via PACT.",
    },
  },
  "naturvin-hemleverans-stockholm": {
    sv: {
      title: "Naturvin hemleverans Stockholm — beställ online | PACT Wines",
      metaDescription:
        "Beställ naturvin med hemleverans i Stockholm. Direktimport från Languedoc — pallen skickas från vingården när den fylls. Billigare och färskare än butik.",
      contentHeading: "Om naturvin med hemleverans i Stockholm",
      longDescription:
        "Att köpa naturvin i Stockholm har historiskt varit begränsat — Systembolagets sortiment täcker bara en bråkdel av vad som faktiskt produceras i Languedoc och andra naturvinsregioner. PACT erbjuder ett alternativ: direktimport från små producenter med hemleverans när pallen till Stockholm är klar.\n\nSå fungerar det: du reserverar flaskor online. När tillräckligt många beställt fylls en pall hos producenten i Languedoc och skickas direkt till Sverige — utan mellanhänder och utan att vinet legat månader i centrallager. Du får bättre pris, färskare flaskor och tillgång till producenter som sällan når den svenska marknaden.\n\nLeveransen sker hem till dig i Stockholm. Sortimentet är fokuserat på naturvin från Languedoc — rött, vitt, orange och blandade stilar från producenter vi känner personligen.",
      tastingProfile: [
        "Hemleverans i Stockholm när pallen fylls",
        "Direktimport från Languedoc utan mellanhänder",
        "Naturvin: ekologiskt, vild jäsning, minimal svavel",
        "Små producenter utanför Systembolaget",
        "Reservera online — pallen skickas från producenten",
      ],
      foodPairing:
        "PACTs naturvin passar till vardagsmat och fest — chark, fisk, grill, ost och vegetariskt. Välj stil efter måltid: lätt rött till pizza, vitt till skaldjur, orange till kryddig mat.",
      aboutText:
        "Beställ naturvin med hemleverans i Stockholm — direktimporterat från Languedoc via PACT.",
    },
  },
  "natural-wine-delivery-stockholm": {
    en: {
      title: "Natural Wine Home Delivery Stockholm — Order Online | PACT Wines",
      metaDescription:
        "Order natural wine with home delivery in Stockholm. Direct import from Languedoc — the pallet ships from the vineyard when full. Better value than retail.",
      contentHeading: "About natural wine home delivery in Stockholm",
      longDescription:
        "Buying natural wine in Stockholm has historically been limited — the state monopoly's range covers only a fraction of what is actually produced in Languedoc and other natural wine regions. PACT offers an alternative: direct import from small producers with home delivery when the Stockholm pallet is ready.\n\nHow it works: you reserve bottles online. When enough people have ordered, a pallet fills at the producer in Languedoc and ships directly to Sweden — without middlemen and without the wine sitting for months in central warehouses. You get better value, fresher bottles and access to producers that rarely reach the Swedish market.\n\nDelivery is to your home in Stockholm. The range focuses on natural wine from Languedoc — red, white, orange and mixed styles from producers we know personally.",
      tastingProfile: [
        "Home delivery in Stockholm when the pallet fills",
        "Direct import from Languedoc without middlemen",
        "Natural wine: organic, wild fermentation, minimal sulphur",
        "Small producers outside the monopoly",
        "Reserve online — pallet ships from the producer",
      ],
      foodPairing:
        "PACT's natural wines suit everyday meals and celebrations — charcuterie, fish, grilled food, cheese and vegetarian dishes. Choose style by meal: light red for pizza, white for shellfish, orange for spiced food.",
      aboutText:
        "Order natural wine with home delivery in Stockholm — direct imported from Languedoc via PACT.",
    },
  },
  "direktimport-vin": {
    sv: {
      contentHeading: "Om direktimport av vin",
      longDescription:
        "Direktimport innebär att vinet köps direkt från producenten utan att passera importör, grossist och butikskedja. PACT är byggt kring den modellen: vi samlar beställningar från köpare i Stockholm tills en hel pall är reserverad, sedan skickar vingården i Languedoc flaskorna direkt till Sverige.\n\nFör dig som köpare betyder det lägre pris — mellanhändernas påslag försvinner — och färskare vin som inte legat i lager i månader. För producenten betyder det bättre marginal och en direkt relation med dem som faktiskt dricker vinet. Det är en win-win som traditionella vinimportkedjor inte kan erbjuda.\n\nPACT fokuserar på naturvin från små producenter i Languedoc. Du reserverar flaskor online; när pallen fylls får du hemleverans i Stockholm. Ingen prenumeration, inget lager hos oss — bara ärlig direktimport.",
      tastingProfile: [
        "Köp direkt från producenten i Languedoc",
        "Pallen fylls genom gemensamma reserveringar",
        "Lägre pris utan mellanhänder",
        "Färskare flaskor utan långa lagerled",
        "Hemleverans i Stockholm",
      ],
      foodPairing:
        "Direktimporterat vin från Languedoc passar till samma mat som naturvin generellt — lokala rätter, grill, ost och vardagsmat. Välj producent och stil efter vad du ska äta.",
      aboutText:
        "Direktimport av vin från Languedoc till Stockholm — reservera via PACT.",
    },
  },
  "direct-import-wine": {
    en: {
      contentHeading: "About direct import wine",
      longDescription:
        "Direct import means wine is bought directly from the producer without passing through importer, wholesaler and retail chain. PACT is built around that model: we aggregate orders from buyers in Stockholm until a full pallet is reserved, then the vineyard in Languedoc ships bottles directly to Sweden.\n\nFor you as a buyer that means lower price — middlemen's markups disappear — and fresher wine that has not sat in warehouse for months. For the producer it means better margin and a direct relationship with those who actually drink the wine. It is a win-win that traditional wine import chains cannot offer.\n\nPACT focuses on natural wine from small producers in Languedoc. You reserve bottles online; when the pallet fills you get home delivery in Stockholm. No subscription, no warehouse on our side — just honest direct import.",
      tastingProfile: [
        "Buy direct from the producer in Languedoc",
        "Pallet fills through shared reservations",
        "Lower price without middlemen",
        "Fresher bottles without long supply chains",
        "Home delivery in Stockholm",
      ],
      foodPairing:
        "Direct imported wine from Languedoc suits the same food as natural wine generally — local dishes, grilled food, cheese and everyday meals. Choose producer and style by what you're eating.",
      aboutText:
        "Direct import wine from Languedoc to Stockholm — reserve via PACT.",
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
    Boolean(override.contentHeading?.trim()) ||
    Boolean(override.title?.trim()) ||
    Boolean(override.metaDescription?.trim()) ||
    Boolean(override.faq?.length);

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
    ...(override.title !== undefined ? { title: override.title } : {}),
    ...(override.metaDescription !== undefined
      ? { metaDescription: override.metaDescription }
      : {}),
    ...(override.faq !== undefined ? { faq: override.faq } : {}),
  };
}
