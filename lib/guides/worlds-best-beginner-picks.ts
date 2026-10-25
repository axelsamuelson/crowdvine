import { unstable_cache } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AppLocale } from "@/lib/i18n/locale";

export type BeginnerPick = {
  productNumber: string;
  /** Producer and wine label, shown in bold. Same in SV and EN. */
  name: string;
  origin: { sv: string; en: string };
  body: { sv: string; en: string };
};

/**
 * Beginner-friendly Systembolaget bottles for the worlds-best wines guide.
 * Editorial copy is fixed here; price, image and availability come from
 * systembolaget_products by product_number.
 */
export const BEGINNER_PICKS: readonly BeginnerPick[] = [
  {
    productNumber: "7036101",
    name: "Meinklang, Naken Grüner Veltliner",
    origin: { sv: "Österrike, vitt", en: "Austria, white" },
    body: {
      sv: "Från en av Österrikes största biodynamiska gårdar, gjort utan tillsatt svavel. Okomplicerat och lätt att dricka. Art.nr 7036101",
      en: "From one of Austria's largest biodynamic farms, made with no added sulphur. Straightforward and easy to drink.",
    },
  },
  {
    productNumber: "9351401",
    name: "Testalonga, Keep On Punching Baby Bandito",
    origin: { sv: "Sydafrika, vitt", en: "South Africa, white" },
    body: {
      sv: "Chenin Blanc från Craig Hawkins i Swartland, Sydafrikas mest inflytelserika naturvinsproducent. Spänst och salt mineralitet. Art.nr 9351401",
      en: "Chenin Blanc from Craig Hawkins in Swartland, South Africa's most influential natural wine producer. Tension and saline minerality.",
    },
  },
  {
    productNumber: "2011001",
    name: "Weingut Heinrich, Pinot Noir",
    origin: { sv: "Österrike, rött", en: "Austria, red" },
    body: {
      sv: "Demeter-certifierat domän i Burgenland. Lätt och salt Pinot Noir. Art.nr 2011001",
      en: "A Demeter-certified domaine in Burgenland. Light, saline Pinot Noir.",
    },
  },
  {
    productNumber: "9287501",
    name: "Catherine & Pierre Breton, Trinch",
    origin: { sv: "Loire, rött", en: "Loire, red" },
    body: {
      sv: "Cabernet Franc från Bourgueil av ett par som gjort naturvin sedan 1980-talet. En av rörelsens mest kända etiketter. Art.nr 9287501",
      en: "Cabernet Franc from Bourgueil by a couple who have made natural wine since the 1980s. One of the movement's best-known labels.",
    },
  },
  {
    productNumber: "9348401",
    name: "Marcel Lapierre, Morgon",
    origin: { sv: "Beaujolais, rött", en: "Beaujolais, red" },
    body: {
      sv: "Vinet som blev mallen för naturligt Beaujolais. Gamay som visar hur långt druvan kan nå. Art.nr 9348401",
      en: "The bottle that became the template for natural Beaujolais. Gamay that shows how far the grape can go.",
    },
  },
  {
    productNumber: "9220601",
    name: "Domaine Sérol, Éclat de Granite",
    origin: { sv: "Loire, rött", en: "Loire, red" },
    body: {
      sv: "Gamay från granitjord i Côte Roannaise, ekologiskt och biodynamiskt odlat. Lätt filtrerat, så det ligger närmare lågintervention än strikt naturvin. Art.nr 9220601",
      en: "Gamay from granite soils in the Côte Roannaise, farmed organically and biodynamically. Lightly filtered, so it sits closer to low intervention than strict natural wine.",
    },
  },
  {
    productNumber: "7540801",
    name: "Ampeleia, Unlitro",
    origin: { sv: "Toscana, rött", en: "Tuscany, red" },
    body: {
      sv: "Literflaska från Maremma, biodynamiskt odlat och spontanjäst. Gjort för att drickas ungt. Art.nr 7540801",
      en: "A one-litre bottle from Maremma, biodynamically farmed and spontaneously fermented. Made to be drunk young.",
    },
  },
  {
    productNumber: "5808601",
    name: "Xavier Weisskopf, Haggan Pet Nat",
    origin: { sv: "Loire, mousserande", en: "Loire, sparkling" },
    body: {
      sv: "Chenin Blanc från Montlouis, gjort med méthode ancestrale utan tillsatt jäst eller socker. Ligger i Systembolagets fasta sortiment, så det går att hitta året runt. Art.nr 5808601",
      en: "Chenin Blanc from Montlouis, made using the ancestral method with no added yeast or sugar. It sits in Systembolaget's fixed assortment, so it can be found year round.",
    },
  },
  {
    productNumber: "9112801",
    name: "Frank Cornelissen, Susucaru Rosato",
    origin: { sv: "Sicilien, rosé", en: "Sicily, rosé" },
    body: {
      sv: "Cornelissens mest lättillgängliga vin, från gamla stockar på Etna. Ljust, salt och vulkaniskt. Art.nr 9112801",
      en: "Cornelissen's most approachable wine, from old vines on Etna. Pale, saline and volcanic.",
    },
  },
  {
    productNumber: "5924801",
    name: "Twins Wine House, Qvevris MZE Kisi",
    origin: { sv: "Georgien, orange", en: "Georgia, orange" },
    body: {
      sv: "Kisi med skalkontakt, gjort i qvevri på traditionellt georgiskt vis. En prisvärd ingång till georgiskt orange vin. Art.nr 5924801",
      en: "Skin-contact Kisi made in qvevri the traditional Georgian way. A good-value entry to Georgian orange wine.",
    },
  },
];

export type BeginnerPickProduct = {
  productNumber: string;
  price: number | null;
  imageUrl: string | null;
  isAvailable: boolean;
};

export type BeginnerPickResolved = BeginnerPick & {
  product: BeginnerPickProduct | null;
};

async function fetchBeginnerPickProductsUncached(
  productNumbers: readonly string[],
): Promise<Map<string, BeginnerPickProduct>> {
  const map = new Map<string, BeginnerPickProduct>();
  if (productNumbers.length === 0) return map;

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("systembolaget_products")
      .select("product_number, price, image_url, is_available")
      .in("product_number", [...productNumbers]);

    if (error) {
      console.error(
        "[BEGINNER_PICKS] systembolaget_products lookup failed:",
        error.message,
      );
      return map;
    }

    for (const row of data ?? []) {
      const productNumber = String(row.product_number);
      map.set(productNumber, {
        productNumber,
        price:
          typeof row.price === "number"
            ? row.price
            : row.price != null
              ? Number(row.price)
              : null,
        imageUrl:
          typeof row.image_url === "string" && row.image_url.trim()
            ? row.image_url.trim()
            : null,
        isAvailable: Boolean(row.is_available),
      });
    }
  } catch (error) {
    console.error(
      "[BEGINNER_PICKS] systembolaget_products lookup threw:",
      error instanceof Error ? error.message : error,
    );
  }

  return map;
}

export async function getBeginnerPickProducts(
  productNumbers: readonly string[],
): Promise<Map<string, BeginnerPickProduct>> {
  const key = [...productNumbers].join(",");
  return unstable_cache(
    () => fetchBeginnerPickProductsUncached(productNumbers),
    ["worlds-best-beginner-picks", key],
    {
      revalidate: 300,
      tags: ["sb-beginner-picks"],
    },
  )();
}

/**
 * Resolve BEGINNER_PICKS against live Systembolaget rows.
 * Unavailable / missing products are dropped; order of the rest is kept.
 * Logs a warning when fewer than 6 remain.
 */
export async function resolveAvailableBeginnerPicks(): Promise<{
  available: BeginnerPickResolved[];
  hiddenProductNumbers: string[];
}> {
  const products = await getBeginnerPickProducts(
    BEGINNER_PICKS.map((pick) => pick.productNumber),
  );

  const available: BeginnerPickResolved[] = [];
  const hiddenProductNumbers: string[] = [];

  for (const pick of BEGINNER_PICKS) {
    const product = products.get(pick.productNumber) ?? null;
    if (!product || !product.isAvailable) {
      hiddenProductNumbers.push(pick.productNumber);
      continue;
    }
    available.push({ ...pick, product });
  }

  if (available.length < 6) {
    console.warn(
      `[BEGINNER_PICKS] Only ${available.length} of ${BEGINNER_PICKS.length} beginner picks are available. Hidden: ${hiddenProductNumbers.join(", ") || "(none)"}`,
    );
  }

  return { available, hiddenProductNumbers };
}

export function beginnerPickCopy(locale: AppLocale): {
  heading: string;
  intro: string;
  moreBefore: string;
  moreLink: string;
  moreHref: string;
  moreAfter: string;
} {
  if (locale === "sv") {
    return {
      heading: "Där du börjar: naturviner som är lätta att hitta",
      intro:
        "De flesta vinerna på listan nedan görs i små mängder och är svåra att få tag på. Om du vill prova naturvin först är de här tio ett bättre ställe att börja. Alla görs av erkända producenter, de flesta i större volymer, och samtliga finns hos Systembolaget i skrivande stund.",
      moreBefore: "Vill du se fler? Läs vår guide till ",
      moreLink: "naturvin på Systembolaget",
      moreHref: "/guider/basta-naturvinerna-pa-systembolaget",
      moreAfter: ".",
    };
  }
  return {
    heading: "Where to start: natural wines that are easy to find",
    intro:
      "Most of the wines on the list below are made in small quantities and are hard to find. If you want to try natural wine first, these ten are a better place to start. All are made by recognised producers, most of them in larger volumes, and at the time of writing all are available at Systembolaget in Sweden.",
    moreBefore: "Want more? See our guide to ",
    moreLink: "natural wine at Systembolaget",
    moreHref: "/guides/best-natural-wines-systembolaget",
    moreAfter: ".",
  };
}
