import { isDirectBoxCheckoutEnabled } from "@/lib/commerce/fulfillment-channel";
import type { GuideArticleContent } from "@/lib/guides/guide-types";

const WHERE_WE_DELIVER_BASE = {
  en: "We deliver to your door anywhere in Budbee's delivery area in Sweden. You can check whether your address is covered by entering your postcode at checkout. Delivery normally takes 2–3 weeks after the pallet has closed and always within 30 days. On delivery, the courier checks your ID and you must be at least 20 years old. If you can't show valid ID, the wine won't be handed over. The shipping cost is shown at checkout before you pay.",
  sv: "Vi levererar hem till dig i hela Budbees leveransområde i Sverige. Om din adress ingår ser du när du anger postnumret i kassan. Leveransen sker normalt inom 2–3 veckor efter att pallen har stängt och alltid senast 30 dagar efter. Vid överlämningen kontrollerar budet din legitimation, och du måste vara minst 20 år. Om du inte kan visa giltig legitimation lämnas inte vinet ut. Fraktkostnaden visas i kassan innan du betalar.",
} as const;

/** Direct-delivery copy under "Where do we deliver?" — gated by checkout flag. */
export const WHERE_WE_DELIVER_DIRECT = {
  en: "With direct delivery, the boxes are packed in France and sent with UPS Standard. The courier checks ID on delivery, and the recipient must be at least 20 years old.",
  sv: "Vid direktleverans packas lådorna i Frankrike och skickas med UPS Standard. Budet kontrollerar legitimation vid överlämningen, och mottagaren måste ha fyllt 20 år.",
} as const;

const HOW_LONG_BASE = {
  en: "Delivery normally takes 2–3 weeks after the pallet closes and always within 30 days. Once the pallet has shipped you'll get an estimated delivery window, and the delivery day once the wine has reached Sweden. How long it takes before the pallet closes depends on how quickly it fills.",
  sv: "Leveransen sker normalt inom 2–3 veckor efter att pallen stängt och alltid senast 30 dagar efter. När pallen har skickats får du ett beräknat leveransfönster, och leveransdagen när vinet nått Sverige. Hur lång tid det tar innan pallen stänger beror på hur snabbt den fylls.",
} as const;

export const HOW_LONG_DIRECT = {
  en: "Direct delivery normally takes 5–10 working days from when the order is confirmed and paid, always within 30 days.",
  sv: "Direktleverans tar normalt 5–10 arbetsdagar från att ordern är bekräftad och betald, alltid inom 30 dagar.",
} as const;

/**
 * Shared-pallet cost: one paragraph (99 kr + introductory).
 * Separate COST_INTRO_NOTE removed — folded into COST_SHARED.
 */
export const COST_SHARED = {
  en: "Delivery on a shared pallet costs SEK 99 per order including VAT, an introductory price for now.",
  sv: "Leverans på delad pall kostar 99 kr per order inklusive moms, ett introduktionspris tills vidare.",
} as const;

export const COST_DIRECT = {
  en: "Direct delivery costs SEK 149 including VAT per box of 6 bottles.",
  sv: "Direktleverans kostar 149 kr inklusive moms per låda om 6 flaskor.",
} as const;

/** Shared-pallet not-home body (Budbee-style). */
export const NOT_HOME_SHARED = {
  en: "For shared pallets: If the delivery cannot be completed, a new attempt is made the next day. After two attempts the wine is returned.",
  sv: "Gäller delad pall: Om leveransen inte kan genomföras görs ett nytt försök nästa dag. Efter två försök returneras vinet.",
} as const;

/**
 * Direct-delivery not-home body (UPS) — gated by checkout flag.
 * Terms link to #punkt-3b (verified on content/legal/kopvillkor.tsx +
 * kopvillkor-en.tsx). Inline markdown via ArticleParagraph.
 */
export const NOT_HOME_DIRECT = {
  en: "Direct delivery: If you're not home, UPS will let you know about a new delivery attempt or where you can collect the box. UPS only hands over the box to someone aged 20 or over who shows ID. If UPS cannot hand over the box, for example because it is not collected, [the terms of purchase apply, see point 3 b](/terms#punkt-3b).",
  sv: "Gäller direktleverans: Om du inte är hemma får du besked från UPS om ny leverans eller var du kan hämta lådan. UPS lämnar bara ut lådan mot legitimation till någon som fyllt 20 år. Kan UPS inte lämna över lådan, till exempel för att den inte hämtas ut, gäller det som står i [köpvillkoren, punkt 3 b](/villkor#punkt-3b).",
} as const;

const PAYMENT_SHARED = {
  en: "You pay by card. The amount is charged once, when the pallet closes.",
  sv: "Du betalar med kort. Beloppet dras vid ett enda tillfälle, när pallen stänger.",
} as const;

/**
 * Confirmed in lib/commerce/direct-box-payment-contract.ts:
 * direct_box always uses immediate PaymentIntent (never SetupIntent).
 * Amount is charged when the order is placed.
 */
export const PAYMENT_DIRECT = {
  en: "With direct delivery, the amount is charged when you place the order.",
  sv: "Vid direktleverans dras beloppet när du lägger ordern.",
} as const;

export function whereWeDeliverBody(
  includeDirectDelivery = isDirectBoxCheckoutEnabled(),
): { en: string[]; sv: string[] } {
  if (includeDirectDelivery) {
    return {
      en: [WHERE_WE_DELIVER_BASE.en, WHERE_WE_DELIVER_DIRECT.en],
      sv: [WHERE_WE_DELIVER_BASE.sv, WHERE_WE_DELIVER_DIRECT.sv],
    };
  }
  return {
    en: [WHERE_WE_DELIVER_BASE.en],
    sv: [WHERE_WE_DELIVER_BASE.sv],
  };
}

export function howLongDeliveryBody(
  includeDirectDelivery = isDirectBoxCheckoutEnabled(),
): { en: string[]; sv: string[] } {
  if (includeDirectDelivery) {
    return {
      en: [HOW_LONG_BASE.en, HOW_LONG_DIRECT.en],
      sv: [HOW_LONG_BASE.sv, HOW_LONG_DIRECT.sv],
    };
  }
  return {
    en: [HOW_LONG_BASE.en],
    sv: [HOW_LONG_BASE.sv],
  };
}

/**
 * Cost section: one shared-pallet paragraph; optional gated direct-box 149 kr.
 */
export function deliveryCostBody(
  includeDirectDelivery = isDirectBoxCheckoutEnabled(),
): { en: string[]; sv: string[] } {
  const en = [COST_SHARED.en];
  const sv = [COST_SHARED.sv];
  if (includeDirectDelivery) {
    en.push(COST_DIRECT.en);
    sv.push(COST_DIRECT.sv);
  }
  return { en, sv };
}

/**
 * Not-home section: shared-pallet Budbee paragraph; optional gated UPS direct.
 */
export function notHomeBody(
  includeDirectDelivery = isDirectBoxCheckoutEnabled(),
): { en: string[]; sv: string[] } {
  const en = [NOT_HOME_SHARED.en];
  const sv = [NOT_HOME_SHARED.sv];
  if (includeDirectDelivery) {
    en.push(NOT_HOME_DIRECT.en);
    sv.push(NOT_HOME_DIRECT.sv);
  }
  return { en, sv };
}

/**
 * Payment section: shared-pallet charge-at-close; optional gated direct charge-at-order.
 */
export function paymentBody(
  includeDirectDelivery = isDirectBoxCheckoutEnabled(),
): { en: string[]; sv: string[] } {
  const en = [PAYMENT_SHARED.en];
  const sv = [PAYMENT_SHARED.sv];
  if (includeDirectDelivery) {
    en.push(PAYMENT_DIRECT.en);
    sv.push(PAYMENT_DIRECT.sv);
  }
  return { en, sv };
}

/**
 * Meta description — direct-delivery phrase gated by checkout flag
 * (same pattern as section bodies; drives generateMetadata + JSON-LD).
 */
export function homeDeliveryMeta(
  includeDirectDelivery = isDirectBoxCheckoutEnabled(),
): { en: string; sv: string } {
  if (includeDirectDelivery) {
    return {
      en: "Order natural wine online with home delivery in Sweden. How buying, shared pallets, direct delivery, delivery times, age checks and costs work.",
      sv: "Beställ naturvin online med hemleverans i Sverige. Så fungerar köp, delad pall, direktleverans, leveranstid, ålderskontroll och kostnad.",
    };
  }
  return {
    en: "Order natural wine online with home delivery in Sweden. How buying, shared pallets, delivery times, age checks and costs work.",
    sv: "Beställ naturvin online med hemleverans i Sverige. Så fungerar köp, delad pall, leveranstid, ålderskontroll och kostnad.",
  };
}

/** How PACT home delivery works (reservation → pallet → door). */
export const naturalWineHomeDeliveryArticle: GuideArticleContent = {
  published: true,
  updated: "2026-11-13",
  slug: {
    en: "natural-wine-home-delivery",
    sv: "hemleverans-av-naturvin",
  },
  title: {
    en: "Natural Wine Home Delivery: How It Works",
    sv: "Hemleverans av naturvin: så fungerar det",
  },
  get meta() {
    return homeDeliveryMeta();
  },
  h1: {
    en: "How Natural Wine Home Delivery Works",
    sv: "Så fungerar hemleverans av naturvin",
  },
  lede: {
    en: "You reserve the wine online and have it delivered to your home. The wine is shipped together on a pallet, so you only pay once the pallet is full, and delivery takes place after that.",
    sv: "Du reserverar vinet online och får det levererat hem. Vinet fraktas samlat på pall, så du betalar först när pallen är full och leveransen sker efter det.",
  },
  breadcrumbShort: {
    en: "Home delivery",
    sv: "Hemleverans",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Natural wine home delivery",
      sv: "Hemleverans av naturvin",
    },
    description: {
      en: "How reservation, the shared pallet and home delivery work.",
      sv: "Hur reservation, gemensam pall och hemleverans fungerar.",
    },
  },
  shopCta: {
    href: {
      en: "/wine",
      sv: "/vin",
    },
  },
  sections: [
    {
      heading: {
        en: "Where do we deliver?",
        sv: "Var levererar vi?",
      },
      get body() {
        return whereWeDeliverBody();
      },
    },
    {
      heading: {
        en: "How long does delivery take?",
        sv: "Hur lång tid tar leveransen?",
      },
      get body() {
        return howLongDeliveryBody();
      },
    },
    {
      heading: {
        en: "What does delivery cost?",
        sv: "Vad kostar leveransen?",
      },
      get body() {
        return deliveryCostBody();
      },
    },
    {
      heading: {
        en: "If you are not at home",
        sv: "Om du inte är hemma",
      },
      get body() {
        return notHomeBody();
      },
    },
    {
      heading: {
        en: "Payment",
        sv: "Betalning",
      },
      get body() {
        return paymentBody();
      },
    },
    {
      heading: {
        en: "Questions",
        sv: "Frågor",
      },
      body: {
        en: ["Contact us at customer@pactwines.com."],
        sv: ["Kontakta oss på customer@pactwines.com."],
      },
    },
  ],
  internalLinks: [
    {
      label: {
        en: "Buy natural wine online →",
        sv: "Köp naturvin online →",
      },
      href: {
        en: "/guides/buy-natural-wine-online-sweden",
        sv: "/guider/kopa-naturvin-online",
      },
    },
    {
      label: {
        en: "What is natural wine? →",
        sv: "Vad är naturvin? →",
      },
      href: {
        en: "/guides/what-is-natural-wine",
        sv: "/guider/vad-ar-naturvin",
      },
    },
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Natural wine home delivery",
  },
};
