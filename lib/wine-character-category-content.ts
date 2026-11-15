import type { WineCategoryFaqItem } from "@/lib/wine-category-types";
import type { WineCharacterFilterValue } from "@/lib/wine-character-tags";

/**
 * Editorial copy for character category pages
 * (/vin/lattdruckna-naturviner, /wine/easy-drinking-natural-wine).
 * Rules: no "utan tillsatser", no Languedoc/"direct" buying claims,
 * no time pressure, no price comparisons.
 */
export type WineCharacterCategoryCopy = {
  h1: string;
  title: string;
  metaDescription: string;
  description: string;
  /** Short prose after the product grid (markdown links allowed). */
  aboutText?: string;
  contentHeading?: string;
  longDescription?: string;
  faq?: WineCategoryFaqItem[];
};

export const WINE_CHARACTER_CATEGORY_CONTENT: Partial<
  Record<
    WineCharacterFilterValue,
    Record<"sv" | "en", WineCharacterCategoryCopy>
  >
> = {
  light_easy: {
    sv: {
      h1: "Lättdruckna naturviner",
      title: "Lättdruckna viner: naturviner med hemleverans | PACT",
      metaDescription:
        "Lätta, fräscha naturviner som är gjorda för att drickas. Det som kallas glou glou, med hemleverans i Sverige.",
      description:
        "Lättdruckna viner är lätta i kroppen, fräscha och ofta lite lägre i alkohol. Inom naturvinsvärlden kallas stilen glou glou, franskans ljudord för klunkande. Här är vinerna i vårt sortiment som vi har märkt som lättdruckna.",
      aboutText:
        "Vill du hellre handla på Systembolaget? Vi har [rankat de lättdruckna naturvinerna där också](/guider/lattdruckna-naturviner-systembolaget).",
    },
    en: {
      h1: "Easy-drinking natural wines",
      title: "Easy-drinking natural wines | PACT",
      metaDescription:
        "Light, fresh natural wines made to be drunk. What the natural wine world calls glou glou.",
      description:
        "Easy-drinking wines are light-bodied, fresh and often a little lower in alcohol. In natural wine the style is called glou glou, French for the sound of gulping. These are the wines in our range that we have marked as easy-drinking.",
    },
  },
};
