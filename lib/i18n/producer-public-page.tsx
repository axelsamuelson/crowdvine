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
import { getAppUrlForRequest, getInternalFetchHeaders } from "@/lib/app-url";
import type { AppLocale } from "@/lib/i18n/locale";
import { intlLocaleForAppLocale } from "@/lib/i18n/locale";
import {
  PACT_PUBLIC_ORIGIN,
  producerPagePath,
  producerPageUrls,
  type ProducerPathSegment,
} from "@/lib/i18n/localized-routes";
import { localizedPathsForLocale } from "@/lib/i18n/localized-paths";
import { translate } from "@/lib/i18n/messages";
import { getSiteConfig } from "@/lib/site-config";

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
};

type ProducerBySlugResponse = {
  producer: ProducerPayload;
  wines: WinePayload[];
};

export async function fetchProducerBySlugForLocale(
  slug: string,
  locale: AppLocale,
): Promise<ProducerBySlugResponse | null> {
  const base = await getAppUrlForRequest();
  const internalHeaders = getInternalFetchHeaders();

  try {
    const res = await fetch(
      `${base}/api/producers/by-slug/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        headers: {
          ...internalHeaders,
          "x-pact-locale": locale,
        },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as ProducerBySlugResponse;
  } catch {
    return null;
  }
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
  const [data, config] = await Promise.all([
    fetchProducerBySlugForLocale(slug, locale),
    getSiteConfig(),
  ]);

  if (!data?.producer) {
    return { title: `Producer | ${config.siteName}` };
  }

  const { name, region, bio_short } = data.producer;
  const regionLabel =
    region?.trim() || (locale === "sv" ? "producenten" : "the producer");
  const urls = producerPageUrls(slug);
  const canonical = `${PACT_PUBLIC_ORIGIN}${producerPagePath(slug, pathSegment)}`;

  return {
    title: `${name} — Naturvin direkt från ${regionLabel}`,
    description: bio_short?.slice(0, 155) ?? undefined,
    alternates: {
      canonical,
      languages: {
        sv: urls.sv,
        en: urls.en,
        "x-default": urls.xDefault,
      },
    },
    openGraph: {
      title: `${name} — Naturvin direkt från ${region} | ${config.siteName}`,
      description: bio_short?.slice(0, 155) ?? "",
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

  const producerJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: producer.name,
    url: producerPageUrl,
    jobTitle: "Vigneron",
    worksFor: {
      "@type": "Organization",
      name: producer.name,
      address: {
        "@type": "PostalAddress",
        addressRegion: producer.region ?? "Languedoc",
        addressCountry: "FR",
      },
    },
    knowsAbout: [
      "Natural wine",
      "Languedoc",
      producer.subregion,
      "Organic viticulture",
    ].filter((item): item is string => Boolean(item)),
    ...(producer.bio_short && { description: producer.bio_short }),
  };

  const pactJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.name,
    url: config.baseUrl,
    description: "Direktimport av naturvin från Languedoc till Stockholm.",
    areaServed: "Stockholm, Sweden",
    sameAs: ["https://www.instagram.com/pactwines"],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Shop",
        item: `${config.baseUrl}${paths.shop}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Producers",
        item: `${config.baseUrl}/producers`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: producer.name,
        item: producerPageUrl,
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
          __html: JSON.stringify(pactJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,35%)]">
        <div className="max-w-2xl px-6 py-12">
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

          <h2 className="mb-4 mt-10 text-xl font-semibold">{winesHeading}</h2>
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

        <div className="sticky top-0 flex h-screen items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950 max-lg:hidden">
          <span className="text-6xl font-bold text-white opacity-20">
            {producerInitials(producer.name)}
          </span>
        </div>
      </div>
      <Footer />
    </>
  );
}
