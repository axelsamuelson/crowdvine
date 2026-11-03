import type { AppLocale } from "@/lib/i18n/locale";

export type AboutPageContent = {
  title: string;
  description: string;
  h1: string;
  heroSubtitle: string;
  cards: [string, string, string, string];
  philosophyTitle: string;
  philosophyBody: string[];
  impactTitle: string;
  impactBody: string[];
  impactClosing?: string;
  howItWorksTitle: string;
  steps: Array<{ title: string; body: string }>;
  differenceTitle: string;
  differenceItems: Array<{ label: string; detail?: string }>;
  differenceTagline: string;
  differenceSubtagline: string;
  ctaTitle: string;
  ctaBody: string;
  ctaButton: string;
};

const ABOUT_CONTENT_EN: AboutPageContent = {
  title: "How PACT works – natural wine by the pallet",
  description:
    "Reserve natural wine online and get it delivered to your door in Stockholm. How PACT works.",
  h1: "About",
  heroSubtitle: "A smarter way to buy wine together.",
  cards: [
    "We believe the way wine is bought and sold is long overdue for change. Too many hands between producer and drinker.",
    "Our model is simple — and transparent. Private consumers reserve wines from small producers in France. When enough bottles are reserved to fill a pallet, the wines are shipped together.",
    "No warehouses. No distributors. No unnecessary transport. Just real connection between the people who make wine and the people who love it.",
    "We call it crowdsourcing wine — a smarter, cleaner, and more human way to enjoy what's in your glass.",
  ],
  philosophyTitle: "Our philosophy",
  philosophyBody: [
    "We work exclusively with natural winemakers who farm organically and produce without additives.",
    "Every bottle reflects a person, a place, and a philosophy — not a production line.",
    "Transparency is at the heart of everything we do: from pricing to logistics to the winemakers we feature.",
  ],
  impactTitle: "Why it matters",
  impactBody: [
    "By pooling orders, bottles share one pallet.",
    "By removing warehouses and unnecessary shipping, we reduce waste and carbon footprint.",
    "By connecting people directly, we make wine more personal, more sustainable, and more honest.",
  ],
  impactClosing: "This isn't just a new platform. It's a new relationship with wine.",
  howItWorksTitle: "How It Works",
  steps: [
    {
      title: "Discover & Reserve",
      body: "Explore curated natural wines from independent producers. Reserve the bottles you want — your order joins a shared pallet with others.",
    },
    {
      title: "Collective Shipping",
      body: "When the pallet is full, the wines are shipped together. No warehouses of our own.",
    },
    {
      title: "Transparent Logistics",
      body: "Track your pallet from reservation to delivery. Every step is visible — efficient logistics.",
    },
    {
      title: "Receive & Enjoy",
      body: "Your wines arrive from small producers in France, untouched and traceable. Pure wine, transparent process.",
    },
  ],
  differenceTitle: "The Difference",
  differenceItems: [
    { label: "No warehouses.", detail: "Wines stay with the winemaker until shipped." },
    { label: "No waste.", detail: "Collective shipping means lower emissions." },
  ],
  differenceTagline: "Crowdsource your wine.",
  differenceSubtagline: "Wine from small producers in France.",
  ctaTitle: "Ready to join?",
  ctaBody:
    "Request access to start your wine journey, or ask an existing member for an invitation.",
  ctaButton: "Request Access",
};

const ABOUT_CONTENT_SV: AboutPageContent = {
  title: "Så fungerar PACT – naturvin per pall",
  description:
    "Reservera naturvin online och få det levererat till din dörr i Stockholm. Så fungerar PACT.",
  h1: "Om PACT",
  heroSubtitle: "Ett smartare sätt att köpa naturvin tillsammans.",
  cards: [
    "Vi tror att sättet vin köps och säljs på är moget för förändring. Traditionell vinimport innebär lager och mellanhänder.",
    "Vår modell är enkel. Privatpersoner reserverar viner de vill ha. När tillräckligt många beställningar samlats för att fylla en pall skickas vinerna från små producenter i Frankrike till Stockholm.",
    "Inga lager. Inga distributörer. Varje flaska kommer från små producenter i Frankrike.",
    "Vi kallar det crowdsourcad vinimport. Tillsammans gör vi det som ingen enskild konsument kan göra på egen hand: importerar naturvin från små producenter i Frankrike.",
  ],
  philosophyTitle: "Vår filosofi",
  philosophyBody: [
    "Vi arbetar med naturvinsproducenter — små gårdar i Frankrike som odlar ekologiskt eller biodynamiskt och gör vin utan tillsatser. Varje flaska speglar en person, en plats och en årgång. Transparens är inte ett marknadsföringsord för oss, det är själva affärsmodellen.",
  ],
  impactTitle: "Varför det spelar roll",
  impactBody: [
    "Genom att samla beställningar på en pall delas frakten. Du får veta exakt var vinet kommer ifrån, vem som gjort det och hur det tagit sig till din dörr. Det är en ny relation till vin.",
  ],
  howItWorksTitle: "Så fungerar det",
  steps: [
    {
      title: "Upptäck & reservera",
      body: "Utforska vårt urval av naturviner från små producenter i Frankrike och reservera de du vill ha. Din beställning är med och fyller en gemensam pall.",
    },
    {
      title: "Kollektiv frakt",
      body: "När pallen är full skickas den till Stockholm. Inga egna lager.",
    },
    {
      title: "Transparent logistik",
      body: "Följ pallens status i realtid — från reservation till att den fylls och skickas. Du vet alltid var din beställning befinner sig.",
    },
    {
      title: "Ta emot & njut",
      body: "Vinet levereras hem till dig i Stockholm från små producenter i Frankrike.",
    },
  ],
  differenceTitle: "Skillnaden",
  differenceItems: [
    { label: "Inga lager." },
    { label: "Inget svinn." },
  ],
  differenceTagline: "Crowdsourca ditt vin.",
  differenceSubtagline: "Vin från små producenter i Frankrike.",
  ctaTitle: "Redo att gå med?",
  ctaBody: "Ansök om tillgång och bli en del av PACT.",
  ctaButton: "Ansök om tillgång",
};

export function aboutPathForLocale(locale: AppLocale): "/about" | "/om-oss" {
  return locale === "sv" ? "/om-oss" : "/about";
}

export function aboutPageContentForLocale(locale: AppLocale): AboutPageContent {
  return locale === "sv" ? ABOUT_CONTENT_SV : ABOUT_CONTENT_EN;
}

export function aboutPageUrls(baseUrl: string): {
  en: string;
  sv: string;
  xDefault: string;
} {
  return {
    en: `${baseUrl}/about`,
    sv: `${baseUrl}/om-oss`,
    xDefault: `${baseUrl}/about`,
  };
}

export function switchAboutPath(
  pathname: string,
  newLocale: AppLocale,
): string | null {
  if (pathname === "/about" && newLocale === "sv") return "/om-oss";
  if (pathname === "/om-oss" && newLocale === "en") return "/about";
  return null;
}
