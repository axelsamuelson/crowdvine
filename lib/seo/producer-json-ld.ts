import {
  PACT_PUBLIC_ORIGIN,
  productPagePath,
  type ProductPathSegment,
} from "@/lib/i18n/localized-routes";

type ProducerJsonLdInput = {
  name: string;
  region: string | null;
  subregion: string | null;
  country: string | null;
  founded_year: number | null;
  bio_short: string | null;
  pageUrl: string;
};

type ProducerWineJsonLdInput = {
  wine_name: string;
  handle: string;
};

export function buildProducerWineryJsonLd(
  producer: ProducerJsonLdInput,
  wines: ProducerWineJsonLdInput[],
  productPathSegment: ProductPathSegment,
) {
  const address: Record<string, string> = {
    "@type": "PostalAddress",
    addressCountry: producer.country?.trim() || "FR",
  };
  if (producer.region?.trim()) {
    address.addressRegion = producer.region.trim();
  }
  if (producer.subregion?.trim()) {
    address.addressLocality = producer.subregion.trim();
  }

  const knowsAbout = [
    "Natural wine",
    "Languedoc",
    producer.subregion?.trim(),
    producer.region?.trim(),
  ].filter((item): item is string => Boolean(item));

  return {
    "@context": "https://schema.org",
    "@type": "Winery",
    name: producer.name,
    url: producer.pageUrl,
    ...(producer.bio_short && { description: producer.bio_short }),
    ...(producer.founded_year != null &&
      producer.founded_year > 0 && {
        foundingDate: String(producer.founded_year),
      }),
    address,
    knowsAbout,
    ...(wines.length > 0 && {
      makesOffer: wines.slice(0, 12).map((wine) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Product",
          name: wine.wine_name,
          url: `${PACT_PUBLIC_ORIGIN}${productPagePath(wine.handle, productPathSegment)}`,
        },
      })),
    }),
  };
}
