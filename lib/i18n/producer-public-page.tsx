import type { Metadata } from "next";
import Link from "next/link";
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
import { ProducerWineCard } from "@/components/producer/producer-wine-card";
import { getProducerBySlugForLocale } from "@/lib/crowdvine/producer-by-slug-data";
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
import { buildProducerWineryJsonLd } from "@/lib/seo/producer-json-ld";
import {
  producerProfileMetaDescription,
  producerProfilePageTitle,
  resolveProducerWinemakerForTitle,
} from "@/lib/seo/producer-profile-metadata";
import { getSiteConfig } from "@/lib/site-config";
import { getCategoryUrlForGrape } from "@/lib/wine-categories";

type ProducerPayload = {
  id: string;
  name: string;
  region: string | null;
  subregion: string | null;
  country: string | null;
  founded_year: number | null;
  certification: string | null;
  contact_name: string | null;
  bio_short: string | null;
  bio_long: string | null;
  slug: string;
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

function producerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatCertification(
  cert: string | null,
  locale: AppLocale,
): string | null {
  if (!cert) return null;
  const map: Record<string, Record<AppLocale, string>> = {
    organic_certified: {
      sv: "Ekologisk certifierad",
      en: "Organic Certified",
    },
    biodynamic_certified: {
      sv: "Biodynamisk",
      en: "Biodynamic Certified",
    },
    natural: { sv: "Naturvin", en: "Natural" },
    sustainable: { sv: "Hållbar odling", en: "Sustainable" },
    conventional: { sv: "Konventionell", en: "Conventional" },
  };
  return map[cert]?.[locale] ?? cert;
}

function heroMetaParts(
  producer: ProducerPayload,
  locale: AppLocale,
): string[] {
  const parts: string[] = [];
  if (producer.region?.trim()) parts.push(producer.region.trim());
  if (producer.subregion?.trim()) parts.push(producer.subregion.trim());
  const cert = formatCertification(producer.certification, locale);
  if (cert) parts.push(cert);
  return parts;
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

export async function buildProducerPublicMetadata(
  slug: string,
  locale: AppLocale,
  pathSegment: ProducerPathSegment,
): Promise<Metadata> {
  const data = await fetchProducerBySlugForLocale(slug, locale);

  if (!data?.producer) {
    notFound();
  }

  const { name, region, bio_short, contact_name } = data.producer;
  const urls = producerPageUrls(slug);
  const canonical = `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, pathSegment)}`;
  const winemakerName = resolveProducerWinemakerForTitle(slug, contact_name);
  const pageTitle = producerProfilePageTitle(name, locale, region, {
    winemakerName,
  });
  const pageDescription = producerProfileMetaDescription(locale, {
    producerName: name,
    bioShort: bio_short,
  });

  return {
    title: pageTitle,
    description: pageDescription,
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
    },
  };
}

export async function renderProducerPublicPage(options: {
  slug: string;
  locale: AppLocale;
  pathSegment: ProducerPathSegment;
}) {
  const { slug, locale, pathSegment } = options;
  const [data, config] = await Promise.all([
    fetchProducerBySlugForLocale(slug, locale),
    getSiteConfig(),
  ]);

  if (!data?.producer) notFound();

  const { producer, wines } = data;
  const t = (key: string) => translate(locale, key);
  const intlLocale = intlLocaleForAppLocale(locale);
  const paths = localizedPathsForLocale(locale);

  const heroParts = heroMetaParts(producer, locale);
  const foundedLabel =
    producer.founded_year != null && producer.founded_year > 0
      ? String(producer.founded_year)
      : null;

  const specEntries = [
    {
      id: "region",
      label: locale === "sv" ? "Region" : "Region",
      value: producer.region,
    },
    {
      id: "certification",
      label: locale === "sv" ? "Certifiering" : "Certification",
      value: formatCertification(producer.certification, locale),
    },
    { id: "subregion", label: "Subregion", value: producer.subregion },
    {
      id: "founded",
      label: locale === "sv" ? "Grundat" : "Founded",
      value: foundedLabel,
    },
  ].filter((entry): entry is typeof entry & { value: string } =>
    Boolean(entry.value?.trim()),
  );

  const producerPageUrl = `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, pathSegment)}`;
  const productPathSegment = pathSegment === "producer" ? "product" : "produkt";

  const producerJsonLd = buildProducerWineryJsonLd(
    { ...producer, pageUrl: producerPageUrl },
    wines,
    productPathSegment,
  );

  const producerWinesLabel =
    locale === "sv"
      ? `${producer.name} viner`
      : `${producer.name} wines`;
  const producerShopLinkLabel =
    locale === "sv"
      ? `Köp ${producer.name}s viner →`
      : `Shop ${producer.name}'s wines →`;
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
        item: `${config.baseUrl}/producers`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: producer.name,
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
      ? `Viner från ${producer.name}`
      : `Wines from ${producer.name}`;
  const noWinesMessage =
    locale === "sv"
      ? "Inga publicerade viner just nu."
      : "No published wines at the moment.";

  const producerGrapes = uniqueGrapesPreserveCasing(
    wines.flatMap((wine) => parseGrapeVarieties(wine.grape_varieties)),
  );

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
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,35%)]">
        <div className="max-w-2xl px-6 pb-12 pt-top-spacing">
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
                  <Link href="/producers">{t("shop.producers")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{producer.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="mt-6 text-3xl font-bold">{producer.name}</h1>
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

          {specEntries.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {specEntries.map(({ id, label, value }) => (
                <SpecCell key={id} label={label} value={value} />
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
          {wines.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {wines.map((wine) => (
                <ProducerWineCard
                  key={wine.id}
                  wine={wine}
                  intlLocale={intlLocale}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{noWinesMessage}</p>
          )}

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
                  ? `Om ${producer.name}`
                  : `About ${producer.name}`}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {producer.bio_long}
              </p>
            </section>
          ) : null}
        </div>

        <div className="sticky top-top-spacing flex h-[calc(100vh-var(--top-spacing))] items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950 max-lg:hidden">
          <span className="text-6xl font-bold text-white opacity-20">
            {producerInitials(producer.name)}
          </span>
        </div>
      </div>
      <Footer />
    </>
  );
}
