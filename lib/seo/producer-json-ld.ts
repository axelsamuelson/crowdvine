import {
  PACT_PUBLIC_ORIGIN,
  productPagePath,
  type ProductPathSegment,
} from "@/lib/i18n/localized-routes";
import {
  instagramProfileUrl,
  websiteDisplayLabel,
} from "@/lib/producer-links";

type ProducerJsonLdInput = {
  name: string;
  region: string | null;
  subregion: string | null;
  country: string | null;
  founded_year: number | null;
  bio_short: string | null;
  pageUrl: string;
  website_url?: string | null;
  instagram_handle?: string | null;
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

  const sameAs = [
    producer.website_url && websiteDisplayLabel(producer.website_url)
      ? producer.website_url
      : null,
    instagramProfileUrl(producer.instagram_handle),
  ].filter((url): url is string => Boolean(url));

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
    ...(sameAs.length > 0 && { sameAs }),
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
