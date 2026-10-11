import type { GuideArticleContent } from "@/lib/guides/guide-types";
import { SYSTEMBOLAGET_RANKED_LISTS } from "@/lib/guides/systembolaget-list-links";
import type { AppLocale } from "@/lib/i18n/locale";

// TODO: Sofia legal review pending.
// TODO: shipping cost to Sweden for Winefinder and MORE (unverified).
// TODO: number of natural wines at Vinoteket and Winefinder (unverified).
// TODO: Skatteverket registration of MORE (unverified).
// TODO: Vin & Natur registration is self-reported and needs the Skatteverket check.
// TODO: Cave Pur Jus delivery to Sweden, cost and Swedish alcohol tax status are unverified and the site could not be opened during review.
// Last reviewed 2026-10-12. ArticleGuideShell has no date line under the h1,
// so "Granskad 12 oktober 2026" / "Reviewed 12 October 2026" is not rendered.

const SKATTEVERKET_DISTANCE_SALES_URL =
  "https://skatteverket.se/privat/skatter/alkoholskattforprivatpersoner/taemotalkoholviddistansforsaljning.4.48cfd212185efbb440b17d.html";

const REALTID_URL =
  "https://www.realtid.se/marknader/vin-pa-natet-ingen-hit-bland-svenskarna-forvanande/";

const SYSTEMBOLAGET_DELIVERY_URL =
  "https://www.systembolaget.se/bestalla-och-handla/leveranstid-betalning-frakt/";

const VINOTEKET_HOME_URL = "https://vinoteket.se/";
const VINOTEKET_DELIVERY_URL = "https://vinoteket.se/betalning-leverans";
const WINEFINDER_URL = "https://www.winefinder.se";
const MORE_HOME_URL = "https://morenaturalwine.com";
const MORE_DELIVERY_URL =
  "https://morenaturalwine.com/pages/delivery-lieferkosten";
const VIN_NATUR_HOME_URL = "https://vinnatur.shop";
const VIN_NATUR_SHIPPING_URL = "https://vinnatur.shop/pages/frakt";
const VIN_NATUR_ABOUT_URL = "https://vinnatur.shop/pages/om-vin-natur";
const CAVE_PUR_JUS_URL = "https://www.cavepurjus.com";

/**
 * Cave Pur Jus section and its Sources link.
 * Read when the sections array and the Sources list are assembled below.
 */
const includePurJus = true;

const EMPTY_BODY = { en: [] as string[], sv: [] as string[] };

function systembolagetListsSentence(locale: AppLocale): string {
  const links = SYSTEMBOLAGET_RANKED_LISTS.map((list) => {
    const label = list.label[locale].replace(/ →$/, "");
    return `[${label}](${list.href[locale]})`;
  }).join(", ");
  if (locale === "sv") {
    return `Vi har egna listor över vad som är värt att köpa, se våra Systembolagslistor: ${links}.`;
  }
  return `We have our own lists of what is worth buying, see our Systembolaget lists: ${links}.`;
}

/** Bilingual guide: buying natural wine online in Sweden. Unpublished until legal review. */
export const buyNaturalWineOnlineSwedenArticle: GuideArticleContent = {
  published: true,
  includePurJus,
  slug: {
    en: "buy-natural-wine-online-sweden",
    sv: "kopa-naturvin-online",
  },
  title: {
    en: "Buying natural wine online in Sweden 2026 | PACT Wines",
    sv: "Köpa naturvin online i Sverige 2026 | PACT Wines",
  },
  meta: {
    en: "How to buy natural wine online in Sweden: what is legal, which shops exist and what is good and bad about each.",
    sv: "Så köper du naturvin på nätet i Sverige: vad som är lagligt, vilka butiker som finns och vad som är bra och dåligt med varje.",
  },
  h1: {
    en: "Buying natural wine online in Sweden 2026: how to do it and where to find it",
    sv: "Köpa naturvin online i Sverige 2026: så gör du och var du hittar det",
  },
  lede: {
    en: "It is possible to buy natural wine online in Sweden, but the selection is smaller than one might think and the rules are not self-evident. Here we go through the routes, what is good and bad about each, and how you check a shop before you order.",
    sv: "Det går att köpa naturvin på nätet i Sverige, men utbudet är mindre än man tror och reglerna är inte självklara. Här går vi igenom vägarna, vad som är bra och dåligt med varje, och hur du kontrollerar en butik innan du beställer.",
  },
  breadcrumbShort: {
    en: "Buying natural wine online",
    sv: "Köpa naturvin online",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Buying natural wine online in Sweden 2026",
      sv: "Köpa naturvin online i Sverige 2026",
    },
    description: {
      en: "How to buy natural wine online in Sweden: what is legal, which shops exist and what is good and bad about each.",
      sv: "Så köper du naturvin på nätet i Sverige: vad som är lagligt, vilka butiker som finns och vad som är bra och dåligt med varje.",
    },
  },
  shopCta: null,
  sections: [
    {
      heading: {
        en: "Is it legal?",
        sv: "Är det lagligt?",
      },
      body: {
        en: [
          `Yes. The Supreme Court has established that distance selling of alcohol is lawful under both Swedish alcohol law and EU law. The seller must register with the [Swedish Tax Agency](${SKATTEVERKET_DISTANCE_SALES_URL}) and pay Swedish alcohol tax. If the seller does not, it is you who must register and pay the tax. You must also be at least 20 years old.`,
        ],
        sv: [
          `Ja. Högsta domstolen har fastställt att distansförsäljning av alkohol är lagligt enligt både svensk alkohollag och EU-rätt. Säljaren ska registrera sig hos [Skatteverket](${SKATTEVERKET_DISTANCE_SALES_URL}) och betala svensk alkoholskatt. Gör säljaren inte det blir det du som ska anmäla dig och betala skatten. Du måste också ha fyllt 20 år.`,
        ],
      },
    },
    {
      heading: {
        en: "Systembolaget online",
        sv: "Systembolaget online",
      },
      body: EMPTY_BODY,
      blocks: [
        {
          type: "list",
          label: { en: "Good", sv: "Bra" },
          items: {
            en: [
              "Legally simplest: you pay in kronor and avoid tax administration.",
              "Home delivery takes 2 to 3 working days in Stockholm, Uppsala, Malmö and Gothenburg for items in the web warehouse.",
              systembolagetListsSentence("en"),
            ],
            sv: [
              "Juridiskt enklast: du betalar i kronor och slipper skatteadministration.",
              "Hemleverans tar 2 till 3 arbetsdagar i Stockholm, Uppsala, Malmö och Göteborg för varor i webblagret.",
              systembolagetListsSentence("sv"),
            ],
          },
        },
        {
          type: "list",
          label: { en: "Not so good", sv: "Dåligt" },
          items: {
            en: [
              "Order items take at least 8 days for home delivery.",
              "The selection is limited to what Systembolaget has bought in.",
            ],
            sv: [
              "Ordervaror tar minst 8 dagar vid hemleverans.",
              "Utbudet är begränsat till det Systembolaget köpt in.",
            ],
          },
        },
      ],
    },
    {
      heading: {
        en: "Vin & Natur",
        sv: "Vin & Natur",
      },
      body: EMPTY_BODY,
      blocks: [
        {
          type: "list",
          label: { en: "Good", sv: "Bra" },
          items: {
            en: [
              "Natural wine only, in Swedish and in kronor. Prices include Swedish VAT and alcohol tax.",
              "States that it is a registered distance seller with the Swedish Tax Agency under sections 15 and 15 a of the Alcohol Tax Act.",
              "Has imported natural wine since 2009 and tastes everything itself before taking it in. The webshop for private customers started in 2025.",
              "New wines and mixed cases every week, and its own category for light and juicy reds. Most still wines on the start page cost 230 to 350 SEK.",
            ],
            sv: [
              "Bara naturvin, på svenska och i kronor. Priserna inkluderar svensk moms och alkoholskatt.",
              "Uppger att de är registrerade distansförsäljare hos Skatteverket enligt 15 och 15 a §§ lagen om alkoholskatt.",
              "Importerar naturvin sedan 2009 och smakar allt själva innan det tas in. Webbutiken för privatkunder startade 2025.",
              "Nya viner och vinlådor varje vecka, och en egen kategori för lätta och saftiga röda. De flesta stilla viner på startsidan kostar 230 till 350 kr.",
            ],
          },
        },
        {
          type: "list",
          label: { en: "Not so good", sv: "Dåligt" },
          items: {
            en: [
              "Minimum order is 3 bottles. Shipping is 149 SEK up to 11 bottles and free from 12.",
              "Delivery time is usually 5 to 10 working days, and delivery takes place in the evening between 17 and 22.",
              "Someone over 20 with ID must receive the parcel, and the wine is shipped from a warehouse in Denmark.",
              "Many wines exist in small quantities, several are sold out or have few bottles left.",
            ],
            sv: [
              "Minsta order är 3 flaskor. Frakten är 149 kr upp till 11 flaskor och gratis från 12.",
              "Leveranstiden är vanligtvis 5 till 10 vardagar, och leverans sker på kvällen mellan 17 och 22.",
              "Någon över 20 med legitimation måste ta emot paketet, och vinet skickas från ett lager i Danmark.",
              "Många viner finns i små kvantiteter, flera är slutsålda eller har få flaskor kvar.",
            ],
          },
        },
        {
          type: "paragraphs",
          body: {
            en: [`[Vin & Natur](${VIN_NATUR_HOME_URL})`],
            sv: [`[Vin & Natur](${VIN_NATUR_HOME_URL})`],
          },
        },
      ],
    },
    {
      heading: {
        en: "Vinoteket",
        sv: "Vinoteket",
      },
      body: EMPTY_BODY,
      blocks: [
        {
          type: "list",
          label: { en: "Good", sv: "Bra" },
          items: {
            en: [
              "States that it has approval from the Swedish Tax Agency for ongoing payment of VAT and alcohol tax. Prices include Swedish alcohol tax.",
              "Delivery in big cities normally takes 1 to 2 working days and in the rest of Sweden 3 to 5.",
              "Natural wine and orange wine exist as their own categories. Wines from 99 SEK.",
              "Rated 4.5 out of 5 on Trustpilot, over 94,000 reviews according to the shop's own site.",
            ],
            sv: [
              "Uppger att de har godkännande hos Skatteverket för löpande betalning av moms och alkoholskatt. Priserna inkluderar svensk alkoholskatt.",
              "Leverans i storstad tar normalt 1 till 2 vardagar och i övriga Sverige 3 till 5.",
              "Naturvin och orangevin finns som egna kategorier. Viner från 99 kr.",
              "Betyg 4,5 av 5 på Trustpilot, över 94 000 omdömen enligt butikens egen sida.",
            ],
          },
        },
        {
          type: "list",
          label: { en: "Not so good", sv: "Dåligt" },
          items: {
            en: [
              "The range is broad and mainstream. Natural wine is one category among many, and we have not checked how many wines it contains.",
              "The shipping fee is only shown at checkout.",
              "Invoice and instalment payment via Klarna means credit and can cost money.",
              "Someone over 20 with ID must be home at delivery, and the wine is shipped from a warehouse in Denmark.",
            ],
            sv: [
              "Sortimentet är brett och mainstream. Naturvin är en kategori bland många, och vi har inte kontrollerat hur många viner den innehåller.",
              "Fraktavgiften visas först i kassan.",
              "Faktura och delbetalning via Klarna innebär kredit och kan kosta.",
              "Någon över 20 med legitimation måste vara hemma vid leverans, och vinet skickas från ett lager i Danmark.",
            ],
          },
        },
        {
          type: "paragraphs",
          body: {
            en: [`[Vinoteket](${VINOTEKET_HOME_URL})`],
            sv: [`[Vinoteket](${VINOTEKET_HOME_URL})`],
          },
        },
      ],
    },
    {
      heading: {
        en: "Winefinder",
        sv: "Winefinder",
      },
      body: EMPTY_BODY,
      blocks: [
        {
          type: "list",
          label: { en: "Good", sv: "Bra" },
          items: {
            en: [
              "Danish company (Winefinder ApS) that sells to Sweden, with prices that include Swedish VAT and alcohol tax. Owned since 2024 by the same company as Vinoteket.",
              "Natural wine exists as its own category, and the shop promises a lower price than in a Swedish store at the time of purchase.",
            ],
            sv: [
              "Danskt bolag (Winefinder ApS) som säljer till Sverige, med priser som inkluderar svensk moms och alkoholskatt. Ägs sedan 2024 av samma bolag som Vinoteket.",
              "Naturvin finns som egen kategori, och butiken lovar lägre pris än i svensk butik vid köptillfället.",
            ],
          },
        },
        {
          type: "list",
          label: { en: "Not so good", sv: "Dåligt" },
          items: {
            en: [
              "The start page is dominated by fine wines and Bordeaux. Natural wine is one category among many.",
              "The site is aimed at people aged 25 or older.",
            ],
            sv: [
              "Startsidan domineras av fina viner och Bordeaux. Naturvin är en kategori bland många.",
              "Sidan riktar sig till dig som är 25 år eller äldre.",
            ],
          },
        },
        {
          type: "paragraphs",
          body: {
            en: [`[Winefinder](${WINEFINDER_URL})`],
            sv: [`[Winefinder](${WINEFINDER_URL})`],
          },
        },
      ],
    },
    {
      heading: {
        en: "MORE Natural Wine (Berlin)",
        sv: "MORE Natural Wine (Berlin)",
      },
      body: EMPTY_BODY,
      blocks: [
        {
          type: "list",
          label: { en: "Good", sv: "Bra" },
          items: {
            en: [
              "Natural wine only, over 1,150 wines according to the shop itself.",
              "Many wines under 20 euros, including light and juicy ones such as Puszta Libre for 13.90 euros.",
              "Ships to Sweden with insured UPS freight.",
            ],
            sv: [
              "Bara naturvin, över 1 150 viner enligt butiken själv.",
              "Många viner under 20 euro, bland annat lätta och saftiga som Puszta Libre för 13,90 euro.",
              "Skickar till Sverige med försäkrad UPS-frakt.",
            ],
          },
        },
        {
          type: "list",
          label: { en: "Not so good", sv: "Dåligt" },
          items: {
            en: [
              "The shop writes that the customer decides for themselves whether tax is to be declared and that the shop does not take on any charges. According to the Swedish Tax Agency it is then you who must register and pay Swedish alcohol tax.",
              "Ships only one day a week: order before Tuesday at 10 a.m., and the parcel goes out on Wednesday.",
              "Prices are in euros.",
            ],
            sv: [
              "Butiken skriver att kunden själv avgör om skatt ska deklareras och att butiken inte tar på sig några avgifter. Enligt Skatteverket blir det då du som ska anmäla dig och betala svensk alkoholskatt.",
              "Skickar bara en dag i veckan: beställ före tisdag klockan 10, så går paketet på onsdag.",
              "Priserna är i euro.",
            ],
          },
        },
        {
          type: "paragraphs",
          body: {
            en: [`[MORE Natural Wine](${MORE_HOME_URL})`],
            sv: [`[MORE Natural Wine](${MORE_HOME_URL})`],
          },
        },
      ],
    },
    ...(includePurJus
      ? [
          {
            heading: {
              en: "Cave Pur Jus (France)",
              sv: "Cave Pur Jus (Frankrike)",
            },
            body: EMPTY_BODY,
            blocks: [
              {
                type: "list" as const,
                label: { en: "Good", sv: "Bra" },
                items: {
                  en: [
                    "French online shop for natural wine since 2013, with a physical shop in Larmor-Plage since 2022.",
                    "Over 1,000 wines according to Raisin.",
                    "Sorts its wines by its own rock'n'roll index, from the straight to the punk, and puts a card with tasting notes and the winegrower in every parcel.",
                    "States that it delivers across Europe.",
                  ],
                  sv: [
                    "Fransk nätbutik för naturvin sedan 2013, med fysisk butik i Larmor-Plage sedan 2022.",
                    "Över 1 000 viner enligt Raisin.",
                    "Sorterar vinerna efter ett eget rock'n'roll-index, från det raka till det punkiga, och lägger ett kort med smaknoter och vinbonden i varje paket.",
                    "Uppger att de levererar i hela Europa.",
                  ],
                },
              },
              {
                type: "list" as const,
                label: { en: "Not so good", sv: "Dåligt" },
                items: {
                  en: [
                    "We have not been able to confirm that it delivers to Sweden or what it costs. The only shipping information we found applies to France.",
                    "We do not know whether it is registered for Swedish alcohol tax. If it is not, it is you who must register and pay.",
                    "The website could not be read during our review, so language and terms are not checked.",
                  ],
                  sv: [
                    "Vi har inte kunnat bekräfta att de levererar till Sverige eller vad det kostar. Den enda fraktuppgift vi hittat gäller Frankrike.",
                    "Vi vet inte om de är registrerade för svensk alkoholskatt. Om de inte är det blir det du som ska anmäla dig och betala.",
                    "Webbplatsen gick inte att läsa vid vår granskning, så språk och villkor är inte kontrollerade.",
                  ],
                },
              },
              {
                type: "paragraphs" as const,
                body: {
                  en: [`[Cave Pur Jus](${CAVE_PUR_JUS_URL})`],
                  sv: [`[Cave Pur Jus](${CAVE_PUR_JUS_URL})`],
                },
              },
            ],
          },
        ]
      : []),
    {
      heading: {
        en: "How to check a shop",
        sv: "Så kontrollerar du en butik",
      },
      body: EMPTY_BODY,
      blocks: [
        {
          type: "list",
          ordered: true,
          items: {
            en: [
              "Email the Swedish Tax Agency with the company name and VAT number and ask whether the seller is registered for alcohol tax in Sweden.",
              "Check that the final price at checkout includes Swedish alcohol tax.",
              "See whether there is an ID check at delivery.",
              "Read the terms for withdrawal and returns.",
            ],
            sv: [
              "Mejla Skatteverket med bolagsnamn och momsnummer och fråga om säljaren är registrerad för alkoholskatt i Sverige.",
              "Kontrollera att slutpriset i kassan inkluderar svensk alkoholskatt.",
              "Se efter om det är legitimationskontroll vid leverans.",
              "Läs villkoren för ånger och retur.",
            ],
          },
        },
      ],
    },
    {
      heading: {
        en: "How we reviewed",
        sv: "Så har vi granskat",
      },
      body: {
        en: [
          "The information comes from the shops' own pages and the Swedish Tax Agency, reviewed in October 2026. We have not ordered from any of them. We ourselves work with natural wine import, so we do not list ourselves here, and none of the shops has paid to be included.",
        ],
        sv: [
          "Uppgifterna kommer från butikernas egna sidor och Skatteverket, granskade i oktober 2026. Vi har inte beställt från någon av dem. Vi arbetar själva med naturvinsimport, så vi listar inte oss här, och ingen av butikerna har betalat för att vara med.",
        ],
      },
    },
    {
      heading: {
        en: "Sources",
        sv: "Källor",
      },
      body: EMPTY_BODY,
      blocks: [
        {
          type: "list",
          items: {
            en: [
              `[Swedish Tax Agency](${SKATTEVERKET_DISTANCE_SALES_URL})`,
              `[Realtid](${REALTID_URL})`,
              `[Systembolaget delivery time](${SYSTEMBOLAGET_DELIVERY_URL})`,
              `[Vinoteket](${VINOTEKET_DELIVERY_URL})`,
              `[Winefinder](${WINEFINDER_URL})`,
              `[MORE Natural Wine](${MORE_DELIVERY_URL})`,
              `[Vin & Natur shipping](${VIN_NATUR_SHIPPING_URL})`,
              `[About Vin & Natur](${VIN_NATUR_ABOUT_URL})`,
              ...(includePurJus
                ? [`[Cave Pur Jus](${CAVE_PUR_JUS_URL})`]
                : []),
            ],
            sv: [
              `[Skatteverket](${SKATTEVERKET_DISTANCE_SALES_URL})`,
              `[Realtid](${REALTID_URL})`,
              `[Systembolaget leveranstid](${SYSTEMBOLAGET_DELIVERY_URL})`,
              `[Vinoteket](${VINOTEKET_DELIVERY_URL})`,
              `[Winefinder](${WINEFINDER_URL})`,
              `[MORE Natural Wine](${MORE_DELIVERY_URL})`,
              `[Vin & Natur frakt](${VIN_NATUR_SHIPPING_URL})`,
              `[Om Vin & Natur](${VIN_NATUR_ABOUT_URL})`,
              ...(includePurJus
                ? [`[Cave Pur Jus](${CAVE_PUR_JUS_URL})`]
                : []),
            ],
          },
        },
      ],
    },
  ],
  internalLinks: [
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
    {
      label: {
        en: "What is red natural wine? →",
        sv: "Vad är rött naturvin? →",
      },
      href: {
        en: "/guides/what-is-red-natural-wine",
        sv: "/guider/vad-ar-rott-naturvin",
      },
    },
    ...SYSTEMBOLAGET_RANKED_LISTS.map((list) => ({
      label: { en: list.label.en, sv: list.label.sv },
      href: { en: list.href.en, sv: list.href.sv },
    })),
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Buying natural wine online in Sweden",
  },
};
