import type { AppLocale } from "@/lib/i18n/locale";

export const STOCKHOLM_DELIVERY_PATH = {
  sv: "/vin/naturvin-hemleverans-stockholm",
  en: "/wine/natural-wine-delivery-stockholm",
} as const;

export const STOCKHOLM_DELIVERY_SLUG = {
  sv: "naturvin-hemleverans-stockholm",
  en: "natural-wine-delivery-stockholm",
} as const;

/** Full-bleed vineyard still used as the hero plane. */
export const STOCKHOLM_DELIVERY_HERO_IMAGE = "/images/hero_bild_5.webp";

export type StockholmDeliveryLandingCopy = {
  brand: string;
  h1: string;
  heroSupport: string;
  primaryCta: string;
  primaryHref: string;
  secondaryCta: string;
  howHeading: string;
  steps: readonly { title: string; body: string }[];
  whyHeading: string;
  whyBody: readonly string[];
  closeHeading: string;
  closeSupport: string;
  closeCta: string;
  faq: readonly { question: string; answer: string }[];
};

const PACT_COPY: Record<AppLocale, StockholmDeliveryLandingCopy> = {
  sv: {
    brand: "PACT",
    h1: "Naturvin hemleverans i Stockholm",
    heroSupport:
      "Du reserverar online och vinet levereras när pallen är full — hemleverans till din dörr.",
    primaryCta: "Utforska naturvin",
    primaryHref: "/vin",
    secondaryCta: "Så fungerar det",
    howHeading: "Från reservation till dörr",
    steps: [
      {
        title: "Reservera online",
        body: "Välj flaskor från småproducenter i Languedoc. Ingen prenumeration — bara det du vill ha.",
      },
      {
        title: "Pallen fylls",
        body: "När tillräckligt många beställt fylls en pall hos producenten. Då debiteras kortet du sparade.",
      },
      {
        title: "Hemleverans i Stockholm",
        body: "Flaskorna skickas utan centrallager och utan mellanhänder — färskare vin, tydligare pris.",
      },
    ],
    whyHeading: "Ett alternativ till Systembolaget",
    whyBody: [
      "Att köpa naturvin i Stockholm har historiskt varit begränsat — sortimentet täcker bara en bråkdel av vad som faktiskt produceras i Languedoc och andra naturvinsregioner.",
      "Vi säljer naturvin från små producenter. Du får tillgång till flaskor som sällan når den svenska marknaden, till bättre pris eftersom importörskedjan uteblir.",
    ],
    closeHeading: "Redo att reservera?",
    closeSupport:
      "Bläddra bland naturvin från Languedoc och reservera det du vill ha hem.",
    closeCta: "Gå till butiken",
    faq: [
      {
        question: "När levereras vinet?",
        answer:
          "När pallen är full skickas den från producenten. Du får hemleverans i Stockholm — tidpunkten beror på hur snabbt pallen fylls.",
      },
      {
        question: "När betalar jag?",
        answer:
          "Du sparar kortet i kassan och debiteras först när pallen är full.",
      },
      {
        question: "Vad för sorts vin?",
        answer:
          "Naturvin från småproducenter i Languedoc — ekologiskt eller biodynamiskt odlat, med vild jäsning och minimal intervention.",
      },
    ],
  },
  en: {
    brand: "PACT",
    h1: "Natural wine home delivery in Stockholm",
    heroSupport:
      "Reserve online and the wine is delivered when the pallet is full — home delivery to your door.",
    primaryCta: "Browse natural wine",
    primaryHref: "/wine",
    secondaryCta: "How it works",
    howHeading: "From reservation to doorstep",
    steps: [
      {
        title: "Reserve online",
        body: "Choose bottles from small producers in Languedoc. No subscription — just what you want.",
      },
      {
        title: "The pallet fills",
        body: "When enough people have ordered, a pallet fills at the producer. Then the card you saved is charged.",
      },
      {
        title: "Home delivery in Stockholm",
        body: "Bottles ship without a central warehouse and without middlemen — fresher wine, clearer pricing.",
      },
    ],
    whyHeading: "An alternative to the monopoly",
    whyBody: [
      "Buying natural wine in Stockholm has historically been limited — the range covers only a fraction of what is actually produced in Languedoc and other natural wine regions.",
      "We sell natural wine from small producers. You get bottles that rarely reach the Swedish market, at better prices because the importer chain is cut out.",
    ],
    closeHeading: "Ready to reserve?",
    closeSupport:
      "Browse natural wine from Languedoc and reserve what you want delivered home.",
    closeCta: "Go to the shop",
    faq: [
      {
        question: "When is the wine delivered?",
        answer:
          "When the pallet is full it ships from the producer. You get home delivery in Stockholm — timing depends on how quickly the pallet fills.",
      },
      {
        question: "When do I pay?",
        answer:
          "You save your card at checkout and are charged only when the pallet is full.",
      },
      {
        question: "What kind of wine?",
        answer:
          "Natural wine from small producers in Languedoc — organically or biodynamically grown, with wild fermentation and minimal intervention.",
      },
    ],
  },
};

const DIRTY_COPY: Record<AppLocale, StockholmDeliveryLandingCopy> = {
  sv: {
    ...PACT_COPY.sv,
    brand: "Dirty Wine",
    h1: "Naturvin till restaurangen i Stockholm",
    heroSupport:
      "Du reserverar online och vinet levereras när pallen är full — hemleverans till din restaurang.",
    steps: [
      PACT_COPY.sv.steps[0],
      PACT_COPY.sv.steps[1],
      {
        title: "Leverans till restaurangen",
        body: "Flaskorna skickas utan centrallager och utan mellanhänder — färskare vin för din meny.",
      },
    ],
    whyHeading: "Naturvin för Stockholm-krogen",
    whyBody: [
      "Restauranger i Stockholm behöver naturvin som inte fastnar i långa importkedjor. Vi säljer naturvin från små producenter.",
      "Du reserverar online. När pallen är full levereras vinet till restaurangen — utan onödiga lagerled.",
    ],
    closeSupport:
      "Bläddra bland naturvin från Languedoc och reservera det du vill ha till restaurangen.",
    faq: [
      {
        question: "När levereras vinet?",
        answer:
          "När pallen är full skickas den från producenten till din restaurang i Stockholm.",
      },
      PACT_COPY.sv.faq[1],
      PACT_COPY.sv.faq[2],
    ],
  },
  en: {
    ...PACT_COPY.en,
    brand: "Dirty Wine",
    h1: "Natural wine for restaurants in Stockholm",
    heroSupport:
      "Reserve online and the wine is delivered when the pallet is full — home delivery to your restaurant.",
    steps: [
      PACT_COPY.en.steps[0],
      PACT_COPY.en.steps[1],
      {
        title: "Delivery to the restaurant",
        body: "Bottles ship without a central warehouse and without middlemen — fresher wine for your list.",
      },
    ],
    whyHeading: "Natural wine for Stockholm restaurants",
    whyBody: [
      "Restaurants in Stockholm need natural wine that does not sit in long import chains. We sell natural wine from small producers.",
      "You reserve online. When the pallet is full the wine is delivered to the restaurant — without unnecessary warehousing.",
    ],
    closeSupport:
      "Browse natural wine from Languedoc and reserve what you want for the restaurant.",
    faq: [
      {
        question: "When is the wine delivered?",
        answer:
          "When the pallet is full it ships from the producer to your restaurant in Stockholm.",
      },
      PACT_COPY.en.faq[1],
      PACT_COPY.en.faq[2],
    ],
  },
};

export function stockholmDeliveryLandingCopy(
  locale: AppLocale,
  isDirtyWine: boolean,
): StockholmDeliveryLandingCopy {
  return (isDirtyWine ? DIRTY_COPY : PACT_COPY)[locale];
}

export function stockholmDeliveryPath(locale: AppLocale): string {
  return STOCKHOLM_DELIVERY_PATH[locale];
}

export function isStockholmDeliveryLandingPath(pathname: string): boolean {
  return (
    pathname === STOCKHOLM_DELIVERY_PATH.sv ||
    pathname === STOCKHOLM_DELIVERY_PATH.en
  );
}

export function isStockholmDeliveryLandingSlug(
  slug: string,
  locale: AppLocale,
): boolean {
  return slug === STOCKHOLM_DELIVERY_SLUG[locale];
}

/** Paths that should render without the shop filter chrome. */
export function isShopFullBleedPath(pathname: string): boolean {
  return isStockholmDeliveryLandingPath(pathname);
}
