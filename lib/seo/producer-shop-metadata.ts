import type { AppLocale } from "@/lib/i18n/locale";
import { producerDisplayName } from "@/lib/producer-display-name";

export function producerShopPageTitle(
  producerName: string,
  locale: AppLocale,
  displayName?: string | null,
): string {
  const name = producerDisplayName({
    name: producerName,
    display_name: displayName,
  });
  return locale === "sv"
    ? `${name} – naturviner | PACT`
    : `${name} – natural wines | PACT`;
}

export function producerShopEditorialHeading(
  producerName: string,
  locale: AppLocale,
  displayName?: string | null,
): string {
  const name = producerDisplayName({
    name: producerName,
    display_name: displayName,
  });
  return locale === "sv"
    ? `Köp viner från ${name}`
    : `Buy wines from ${name}`;
}

export function producerShopMetaDescription(
  locale: AppLocale,
  options: {
    producerName: string;
    displayName?: string | null;
    region?: string | null;
  },
): string {
  const legal = options.producerName.trim();
  const shown = producerDisplayName({
    name: legal,
    display_name: options.displayName,
  });
  const namesDiffer =
    shown.length > 0 &&
    legal.length > 0 &&
    shown.toLowerCase() !== legal.toLowerCase();
  const who = namesDiffer ? `${shown} (${legal})` : shown || legal;
  const region = options.region?.trim() ?? "";
  const place = region ? `, ${region}` : "";

  return locale === "sv"
    ? `Naturviner från ${who}${place}. Hemleverans i Stockholm.`
    : `Natural wines from ${who}${place}. Home delivery in Stockholm.`;
}
