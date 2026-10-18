import type { AppLocale } from "@/lib/i18n/locale";
import type { WineCategoryFaqItem } from "@/lib/wine-category-types";

/** Editorial content for the shop root (/vin, /wine) — formerly naturvin/natural-wine. */
export type ShopRootNaturalWineContent = {
  h1: string;
  /** Short intro above the product grid. */
  intro: string;
  contentHeading: string;
  longDescription: string;
  tastingProfile: string[];
  foodPairing: string;
  aboutText: string;
  faq: WineCategoryFaqItem[];
};

const SV: ShopRootNaturalWineContent = {
  h1: "Naturvin",
  intro:
    "Här hittar du alla våra naturviner, från rött och vitt till orange och rosé. Du reserverar flaskor online, och vinet levereras till Stockholm när pallen är full.",
  contentHeading: "Om naturvin",
  longDescription:
    "Naturvin är vin gjort som det gjordes innan den industriella vinframställningen tog över — druvor odlade ekologiskt eller biodynamiskt, jäsning med druvans egna vilda jästsvampar, och ingenting tillsatt i källaren. Inga syntetiska bekämpningsmedel i vingården, ingen tillsatt jäst, inget socker, inga enzymer, ingen filtrering. På sin höjd en liten mängd svavel vid buteljering — ofta inte ens det.\n\nResultatet är vin som smakar av sin plats och sin årgång snarare än av en standardiserad process. Naturvin är levande, ibland oförutsägbart, alltid ärligt. Ett rött naturvin från gamla Carignan-stockar i Faugères smakar helt annorlunda än ett från kalkjorden i Puisserguier — och det är hela poängen.\n\nVi säljer naturvin online med leverans i Stockholm. Ingen mellanhand, inget centrallager, inga påslag i onödiga led. När tillräckligt många har reserverat viner för att fylla en pall skickas den till Stockholm. Det gör vinet billigare och relationen mellan producent och drickare äkta.",
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
    "Här hittar du alla våra naturviner, från rött och vitt till orange och rosé. Du reserverar flaskor online, och vinet levereras till Stockholm när pallen är full.",
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
        "På PACT reserverar du naturviner du vill ha och får dem levererade hem. Vinerna kommer från små naturvinsproducenter. Varje vin har en produktsida med producent, region och druvor.",
    },
  ],
};

const EN: ShopRootNaturalWineContent = {
  h1: "Natural Wine",
  intro:
    "Here you'll find all our natural wines, from red and white to orange and rosé. You reserve bottles online, and the wine is delivered to Stockholm when the pallet is full.",
  contentHeading: "About natural wine",
  longDescription:
    "Natural wine is wine made the way it was before industrial winemaking took over — grapes grown organically or biodynamically, fermentation with the grape's own wild yeasts, and nothing added in the cellar. No synthetic pesticides in the vineyard, no added yeast, no sugar, no enzymes, no filtration. At most a small amount of sulphur at bottling — often not even that.\n\nThe result is wine that tastes of its place and its vintage rather than of a standardised process. Natural wine is alive, sometimes unpredictable, always honest. A red natural wine from old Carignan vines in Faugères tastes completely different from one grown on the limestone of Puisserguier — and that is the whole point.\n\nWe sell natural wine online with delivery in Stockholm. No middleman, no central warehouse, no unnecessary markups. When enough people have reserved wines to fill a pallet, it ships to Stockholm. That makes the wine cheaper and the relationship between producer and drinker real.",
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
    "Here you'll find all our natural wines, from red and white to orange and rosé. You reserve bottles online, and the wine is delivered to Stockholm when the pallet is full.",
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
        "On PACT you reserve the natural wines you want and have them delivered to your door. The wines come from small natural wine producers. Each wine has a product page with the producer, region and grapes.",
    },
  ],
};

export function getShopRootNaturalWineContent(
  locale: AppLocale,
): ShopRootNaturalWineContent {
  return locale === "sv" ? SV : EN;
}
