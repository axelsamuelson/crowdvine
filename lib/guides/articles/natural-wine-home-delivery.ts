import type { GuideArticleContent } from "@/lib/guides/guide-types";

/** How PACT home delivery works (reservation → pallet → door). */
export const naturalWineHomeDeliveryArticle: GuideArticleContent = {
  published: true,
  updated: "2026-11-09",
  slug: {
    en: "natural-wine-home-delivery",
    sv: "hemleverans-av-naturvin",
  },
  title: {
    en: "Natural Wine Home Delivery: How It Works",
    sv: "Hemleverans av naturvin: så fungerar det",
  },
  meta: {
    en: "Order natural wine online with home delivery in Budbee's Sweden coverage area. How reservation, pallet, delivery time, age check and cost work.",
    sv: "Beställ naturvin online med hemleverans i Budbees leveransområde i Sverige. Så fungerar reservation, pall, leveranstid, ålderskontroll och kostnad.",
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
      body: {
        en: [
          "We deliver to your door anywhere in Budbee's delivery area in Sweden. You can check whether your address is covered by entering your postcode at checkout. Delivery takes place 1–2 weeks after the pallet has closed. On delivery, the courier checks your ID and you must be at least 20 years old. If you can't show valid ID, the wine won't be handed over. The shipping cost is shown at checkout before you pay.",
        ],
        sv: [
          "Vi levererar hem till dig i hela Budbees leveransområde i Sverige. Om din adress ingår ser du när du anger postnumret i kassan. Leveransen sker 1–2 veckor efter att pallen har stängt. Vid överlämningen kontrollerar budet din legitimation, och du måste vara minst 20 år. Om du inte kan visa giltig legitimation lämnas inte vinet ut. Fraktkostnaden visas i kassan innan du betalar.",
        ],
      },
    },
    {
      heading: {
        en: "How long does delivery take?",
        sv: "Hur lång tid tar leveransen?",
      },
      body: {
        en: [
          "Delivery normally takes place within 1 to 2 weeks after the pallet has closed. How long it takes before the pallet closes depends on how quickly it fills.",
        ],
        sv: [
          "Leveransen sker normalt inom 1 till 2 veckor efter att pallen stängt. Hur lång tid det tar innan pallen stänger beror på hur snabbt den fylls.",
        ],
      },
    },
    {
      heading: {
        en: "What does delivery cost?",
        sv: "Vad kostar leveransen?",
      },
      body: {
        en: ["Delivery costs SEK 99 per order, including VAT."],
        sv: ["Leveransen kostar 99 kr per order, inklusive moms."],
      },
    },
    {
      heading: {
        en: "If you are not at home",
        sv: "Om du inte är hemma",
      },
      body: {
        en: [
          "If the delivery cannot be completed, a new attempt is made the next day. After two attempts the wine is returned.",
        ],
        sv: [
          "Om leveransen inte kan genomföras görs ett nytt försök nästa dag. Efter två försök returneras vinet.",
        ],
      },
    },
    {
      heading: {
        en: "Payment",
        sv: "Betalning",
      },
      body: {
        en: [
          "You pay by card. The amount is charged once, when the pallet closes.",
        ],
        sv: [
          "Du betalar med kort. Beloppet dras vid ett enda tillfälle, när pallen stänger.",
        ],
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
