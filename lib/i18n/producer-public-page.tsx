import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Footer } from "@/components/layout/footer";
import { ProducersDirectoryMapLazy } from "@/components/producer/producers-directory-map-lazy";
import { ProducerWineList } from "@/components/producer/producer-wine-list";
import { fetchIndexableProducersFromDb } from "@/lib/crowdvine/indexable-producers";
import { getProducerBySlugForLocale } from "@/lib/crowdvine/producer-by-slug-data";
import { fetchCollectionProductsData } from "@/lib/crowdvine/products-data";
import { isB2BHost } from "@/lib/b2b-site";
import { generateProducerSlug } from "@/lib/producer-handle";
import type { AppLocale } from "@/lib/i18n/locale";
import { intlLocaleForAppLocale } from "@/lib/i18n/locale";
import {
  PACT_PUBLIC_ORIGIN,
  producerPagePath,
  producerPageUrls,
  producerShopPathFromName,
  type ProducerPathSegment,
} from "@/lib/i18n/localized-routes";
import { localizedPathsForLocale } from "@/lib/i18n/localized-paths";
import { translate } from "@/lib/i18n/messages";
import {
  isCuratedGrape,
  parseGrapeVarieties,
  uniqueGrapesPreserveCasing,
} from "@/lib/curated-grape-categories";
import { getProducerGuideNote } from "@/lib/guides/producer-guide-notes";
import {
  instagramProfileUrl,
  websiteDisplayLabel,
} from "@/lib/producer-links";
import {
  formatProducerCertification,
  formatProducerCertificationLabels,
  formatProducerLapsedOrganicFarming,
  formatProducerOrganicAndBiodynamicFarming,
  producerCertificationRegistryUrl,
} from "@/lib/product/wine-enrichment";
import { isSeedLapsedOrganicProducer } from "@/lib/shop/verified-organic-producers";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { producerDisplayName } from "@/lib/producer-display-name";
import { buildProducerWineryJsonLd } from "@/lib/seo/producer-json-ld";
import {
  producerProfileMetaDescription,
  producerPublicDocumentTitle,
  producerPublicHeading,
  resolveProducerWinemakerForTitle,
} from "@/lib/seo/producer-profile-metadata";
import { getSiteConfig } from "@/lib/site-config-server";
import { getCategoryUrlForGrape } from "@/lib/wine-categories";

type ProducerPayload = {
  id: string;
  name: string;
  display_name: string | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  founded_year: number | null;
  certification: string | null;
  certification_verified_url: string | null;
  certification_in_conversion: boolean;
  certification_lapsed: boolean;
  contact_name: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  bio_short: string | null;
  bio_long: string | null;
  slug: string;
  lat: number | null;
  lon: number | null;
};

type WinePayload = {
  id: string;
  wine_name: string;
  vintage: string | null;
  handle: string;
  price_sek: number;
  summary: string | null;
  description?: string | null;
  color?: string | null;
  type?: string | null;
  grape_varieties?: string | null;
};

type ProducerBySlugResponse = {
  producer: ProducerPayload;
  wines: WinePayload[];
};

export async function fetchProducerBySlugForLocale(
  slug: string,
  locale: AppLocale,
): Promise<ProducerBySlugResponse | null> {
  return getProducerBySlugForLocale(slug, locale);
}

async function winesVisibleOnRequestHost<T extends { id: string }>(
  producerId: string,
  wines: T[],
): Promise<T[]> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!isB2BHost(host)) return wines;

  const visible = await fetchCollectionProductsData(producerId, {
    isB2BSite: true,
    limit: 5000,
  });
  const visibleIds = new Set(visible.map((product) => product.id));
  return wines.filter((wine) => visibleIds.has(wine.id));
}

function producerHasLapsedOrganicCertification(
  producer: Pick<ProducerPayload, "name" | "certification_lapsed">,
): boolean {
  return (
    producer.certification_lapsed === true ||
    isSeedLapsedOrganicProducer(producer.name)
  );
}

function producerCertificationOptions(
  producer: Pick<
    ProducerPayload,
    | "name"
    | "certification_verified_url"
    | "certification_in_conversion"
    | "certification_lapsed"
  >,
) {
  return {
    certificationVerifiedUrl: producer.certification_verified_url,
    certificationInConversion: producer.certification_in_conversion,
    certificationLapsed: producerHasLapsedOrganicCertification(producer),
  };
}

function heroMetaParts(
  producer: ProducerPayload,
  locale: AppLocale,
): string[] {
  const parts: string[] = [];
  if (producer.region?.trim()) parts.push(producer.region.trim());
  if (producer.subregion?.trim()) parts.push(producer.subregion.trim());
  if (producerHasLapsedOrganicCertification(producer)) {
    parts.push(formatProducerLapsedOrganicFarming(locale));
  } else {
    const cert = formatProducerCertification(
      producer.certification,
      locale,
      producerCertificationOptions(producer),
    );
    if (cert) parts.push(cert);
  }
  return parts;
}

function SpecCell({
  label,
  value,
  href,
  className,
}: {
  label: string;
  value: string;
  href?: string;
  /** Extra grid span classes (e.g. full-width certification on mobile). */
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-background px-4 py-3${className ? ` ${className}` : ""}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="mt-1 flex min-h-[44px] items-center text-sm text-foreground underline underline-offset-4"
        >
          {value}
        </a>
      ) : (
        <p className="mt-1 text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}

export async function buildProducerPublicMetadata(
  slug: string,
  locale: AppLocale,
  pathSegment: ProducerPathSegment,
): Promise<Metadata> {
  const [data, config] = await Promise.all([
    fetchProducerBySlugForLocale(slug, locale),
    getSiteConfig(),
  ]);

  if (!data?.producer) {
    notFound();
  }

  const { name, display_name, region, bio_short, contact_name } = data.producer;
  const urls = producerPageUrls(slug);
  const canonical = `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, pathSegment)}`;
  const winemakerName = resolveProducerWinemakerForTitle(slug, contact_name);
  const pageTitle = categoryPageTitle(
    producerPublicDocumentTitle(name, locale, region, {
      winemakerName,
      displayName: display_name,
    }),
    config.siteName,
  );
  const pageDescription = producerProfileMetaDescription(locale, {
    producerName: producerDisplayName({ name, display_name }),
    bioShort: bio_short,
    region,
  });

  const visibleWines = await winesVisibleOnRequestHost(
    data.producer.id,
    data.wines,
  );

  return {
    title: pageTitle,
    description: pageDescription,
    ...(visibleWines.length === 0
      ? {
          robots: {
            index: false,
            follow: true,
          },
        }
      : {}),
    alternates: {
      canonical,
      languages: {
        sv: urls.sv,
        en: urls.en,
        "x-default": urls.xDefault,
      },
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: canonical,
      type: "website",
      images: defaultOpenGraphImages({ siteName: config.siteName }),
    },
    twitter: pageTwitterCard(pageTitle, pageDescription),
  };
}

export async function renderProducerPublicPage(options: {
  slug: string;
  locale: AppLocale;
  pathSegment: ProducerPathSegment;
}) {
  const { slug, locale, pathSegment } = options;
  const [data, config, producersForMapRaw] = await Promise.all([
    fetchProducerBySlugForLocale(slug, locale),
    getSiteConfig(),
    fetchIndexableProducersFromDb(
      "id, name, region, subregion, lat, lon",
    ),
  ]);

  if (!data?.producer) notFound();

  const visibleWines = await winesVisibleOnRequestHost(
    data.producer.id,
    data.wines,
  );
  const { producer } = data;
  const wines = visibleWines;
  const t = (key: string) => translate(locale, key);
  const intlLocale = intlLocaleForAppLocale(locale);
  const paths = localizedPathsForLocale(locale);

  const mapProducers = (
    producersForMapRaw as Array<{
      id: string;
      name: string;
      region: string | null;
      subregion: string | null;
      lat: number | null;
      lon: number | null;
    }>
  ).map((row) => {
    const rowSlug = generateProducerSlug(row.name);
    return {
      id: row.id,
      name: row.name,
      href: paths.producer(rowSlug),
      lat: row.lat,
      lon: row.lon,
      region: row.region,
      subregion: row.subregion,
    };
  });

  const heroParts = heroMetaParts(producer, locale);
  const foundedLabel =
    producer.founded_year != null && producer.founded_year > 0
      ? String(producer.founded_year)
      : null;

  const farmingLabel = locale === "sv" ? "Odling" : "Farming";
  const certificationLabel =
    locale === "sv" ? "Certifiering" : "Certification";
  const hasOrganicRegistry = Boolean(
    producerCertificationRegistryUrl(producer.certification_verified_url),
  );
  const certificationEntries = producerHasLapsedOrganicCertification(producer)
    ? [
        {
          id: "farming",
          label: farmingLabel,
          value: formatProducerLapsedOrganicFarming(locale),
          href: undefined as string | undefined,
          wideOnMobile: true,
        },
      ]
    : producer.certification?.trim() === "biodynamic_certified" &&
        !hasOrganicRegistry
      ? [
          {
            id: "farming",
            label: farmingLabel,
            value: formatProducerOrganicAndBiodynamicFarming(locale),
            href: undefined as string | undefined,
            wideOnMobile: true,
          },
        ]
      : formatProducerCertificationLabels(
          producer.certification,
          locale,
          producerCertificationOptions(producer),
        ).map((label, index) => ({
          id: `certification-${index}`,
          label: certificationLabel,
          value: label.text,
          href: label.href ?? undefined,
          wideOnMobile: true,
        }));

  const specEntries = [
    {
      id: "region",
      label: locale === "sv" ? "Region" : "Region",
      value: producer.region,
    },
    ...certificationEntries,
    { id: "subregion", label: "Subregion", value: producer.subregion },
    {
      id: "founded",
      label: locale === "sv" ? "Grundat" : "Founded",
      value: foundedLabel,
    },
  ].filter((entry): entry is typeof entry & { value: string } =>
    Boolean(entry.value?.trim()),
  );

  const websiteLabel = producer.website_url
    ? websiteDisplayLabel(producer.website_url)
    : null;
  const instagramUrl = instagramProfileUrl(producer.instagram_handle);
  const linkEntries = [
    websiteLabel && producer.website_url
      ? {
          id: "website",
          label: locale === "sv" ? "Webbplats" : "Website",
          value: websiteLabel,
          href: producer.website_url,
        }
      : null,
    instagramUrl && producer.instagram_handle
      ? {
          id: "instagram",
          label: "Instagram",
          value: `@${producer.instagram_handle}`,
          href: instagramUrl,
        }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const factEntries = [
    ...specEntries.map((entry) => ({
      ...entry,
      href:
        "href" in entry && typeof entry.href === "string"
          ? entry.href
          : undefined,
      wideOnMobile:
        "wideOnMobile" in entry && entry.wideOnMobile === true,
    })),
    ...linkEntries.map((entry) => ({
      ...entry,
      wideOnMobile: false,
    })),
  ];

  const producerPageUrl = `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, pathSegment)}`;
  const productPathSegment = pathSegment === "producers" ? "product" : "produkt";

  const shownProducerName = producerDisplayName(producer);
  const producerJsonLd = buildProducerWineryJsonLd(
    { ...producer, name: shownProducerName, pageUrl: producerPageUrl },
    wines,
    productPathSegment,
  );

  const producerWinesLabel =
    locale === "sv"
      ? `${shownProducerName} viner`
      : `${shownProducerName} wines`;
  const producerShopLinkLabel =
    locale === "sv"
      ? `Köp ${shownProducerName}s viner →`
      : `Shop ${shownProducerName}'s wines →`;
  const producerShopUrl = `${config.baseUrl}${producerShopPathFromName(producer.name, locale)}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "sv" ? "Alla viner" : "Shop",
        item: `${config.baseUrl}${paths.shop}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t("shop.producers"),
        item: `${config.baseUrl}${paths.producers}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: shownProducerName,
        item: producerPageUrl,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: producerWinesLabel,
        item: producerShopUrl,
      },
    ],
  };

  const winesHeading =
    locale === "sv"
      ? `Viner från ${shownProducerName}`
      : `Wines from ${shownProducerName}`;
  const noWinesMessage =
    locale === "sv"
      ? "Inga publicerade viner just nu."
      : "No published wines at the moment.";

  const producerGrapes = uniqueGrapesPreserveCasing(
    wines.flatMap((wine) => parseGrapeVarieties(wine.grape_varieties)),
  );
  const guideNote = getProducerGuideNote(slug, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(producerJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <div className="grid min-h-screen grid-cols-1 pt-top-spacing lg:grid-cols-2">
        <div className="w-full px-6 pb-12 lg:px-10 xl:px-14">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={paths.shop}>Shop</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={paths.producers}>{t("shop.producers")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{shownProducerName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="mt-6 text-3xl font-medium tracking-[-0.02em]">
            {producerPublicHeading(producer.name, producer.display_name)}
          </h1>
          {heroParts.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {heroParts.join(" · ")}
            </p>
          ) : null}

          {producer.bio_short ? (
            <div className="mt-6 rounded-xl border bg-white p-6">
              <p className="text-sm leading-relaxed text-foreground">
                {producer.bio_short}
              </p>
            </div>
          ) : null}

          {guideNote ? (
            <p className="mt-4 text-sm text-stone-500">
              {guideNote.beforeLink}
              <Link
                href={guideNote.href}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {guideNote.linkLabel}
              </Link>
            </p>
          ) : null}

          {factEntries.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {factEntries.map(({ id, label, value, href, wideOnMobile }) => (
                <SpecCell
                  key={id}
                  label={label}
                  value={value}
                  href={href}
                  className={
                    wideOnMobile ? "col-span-2 sm:col-span-1" : undefined
                  }
                />
              ))}
            </div>
          ) : null}

          <div className="mb-4 mt-10 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold">{winesHeading}</h2>
            <Link
              href={producerShopPathFromName(producer.name, locale)}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {producerShopLinkLabel}
            </Link>
          </div>
          <ProducerWineList
            wines={wines}
            locale={locale}
            intlLocale={intlLocale}
            emptyMessage={noWinesMessage}
          />

          {producerGrapes.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold">
                {locale === "sv"
                  ? "Druvor vi arbetar med"
                  : "Grapes we work with"}
              </h2>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-stone-600">
                {producerGrapes.map((grape) => (
                  <span key={grape}>
                    {isCuratedGrape(grape) ? (
                      <Link
                        href={getCategoryUrlForGrape(grape, locale)}
                        className="underline underline-offset-4 hover:text-foreground"
                      >
                        {grape}
                      </Link>
                    ) : (
                      grape
                    )}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {producer.bio_long ? (
            <section className="mt-12 border-t pt-10">
              <h2 className="text-xl font-semibold">
                {locale === "sv"
                  ? `Om ${shownProducerName}`
                  : `About ${shownProducerName}`}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {producer.bio_long}
              </p>
            </section>
          ) : null}

          <nav className="mt-12 space-y-3 border-t border-border pt-8 text-sm">
            <Link
              href={locale === "sv" ? "/guider" : "/guides"}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {locale === "sv"
                ? "Utforska alla våra naturvinsguider →"
                : "Explore all our natural wine guides →"}
            </Link>
          </nav>
        </div>

        <div className="sticky top-top-spacing h-[calc(100vh-var(--top-spacing))] max-lg:hidden">
          <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-950">
            <ProducersDirectoryMapLazy
              producers={mapProducers}
              highlightedProducerId={producer.id}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
