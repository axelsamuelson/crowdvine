import type { AppLocale } from "@/lib/i18n/locale";

export type ProducersDirectoryContent = {
  title: string;
  description: string;
  heading: string;
  countLabel: (count: number) => string;
  shopLabel: string;
  breadcrumbLabel: string;
};

const CONTENT_EN: ProducersDirectoryContent = {
  title: "Natural wine producers in Languedoc — all our producers",
  description:
    "Meet the small producers behind PACT’s natural wines — from Faugères to Saint-Chinian. Organic and biodynamic farming, no additives.",
  heading: "Producers",
  countLabel: (count) => `${count} producers from Languedoc`,
  shopLabel: "Shop",
  breadcrumbLabel: "Producers",
};

const CONTENT_SV: ProducersDirectoryContent = {
  title: "Naturvinproducenter i Languedoc — alla våra producenter",
  description:
    "Möt småproducenterna bakom PACTs naturviner — från Faugères till Saint-Chinian. Ekologisk och biodynamisk odling, inga tillsatser.",
  heading: "Producenter",
  countLabel: (count) => `${count} producenter från Languedoc`,
  shopLabel: "Shop",
  breadcrumbLabel: "Producenter",
};

export function producersDirectoryPathForLocale(
  locale: AppLocale,
): "/producers" | "/producenter" {
  return locale === "sv" ? "/producenter" : "/producers";
}

export function producersDirectoryContentForLocale(
  locale: AppLocale,
): ProducersDirectoryContent {
  return locale === "sv" ? CONTENT_SV : CONTENT_EN;
}

export function producersDirectoryUrls(baseUrl: string): {
  en: string;
  sv: string;
  xDefault: string;
} {
  return {
    en: `${baseUrl}/producers`,
    sv: `${baseUrl}/producenter`,
    xDefault: `${baseUrl}/producenter`,
  };
}

export function switchProducersDirectoryPath(
  pathname: string,
  newLocale: AppLocale,
): string | null {
  if (pathname === "/producers" && newLocale === "sv") return "/producenter";
  if (pathname === "/producenter" && newLocale === "en") return "/producers";
  return null;
}
