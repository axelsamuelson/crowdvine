import type { Metadata } from "next";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Footer } from "@/components/layout/footer";
import { ProducersDirectoryMap } from "@/components/producer/producers-directory-map";
import { fetchIndexableProducersFromDb } from "@/lib/crowdvine/indexable-producers";
import type { AppLocale } from "@/lib/i18n/locale";
import { localizedPathsForLocale } from "@/lib/i18n/localized-paths";
import {
  producersDirectoryContentForLocale,
  producersDirectoryPathForLocale,
  producersDirectoryUrls,
} from "@/lib/i18n/producers-directory";
import {
  extractWineText,
  type WineLocale,
} from "@/lib/i18n/wine-locale";
import { generateProducerSlug } from "@/lib/producer-handle";
import { getSiteConfig } from "@/lib/site-config";

type ProducerListRow = {
  id: string;
  name: string;
  region: string | null;
  subregion: string | null;
  certification: string | null;
  short_description: Record<string, string> | string | null;
  lat: number | null;
  lon: number | null;
};

function producerInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export async function buildProducersDirectoryMetadata(
  locale: AppLocale,
): Promise<Metadata> {
  const config = await getSiteConfig();
  const content = producersDirectoryContentForLocale(locale);
  const urls = producersDirectoryUrls(config.baseUrl);
  const canonical = locale === "sv" ? urls.sv : urls.en;

  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical,
      languages: {
        en: urls.en,
        sv: urls.sv,
        "x-default": urls.xDefault,
      },
    },
    openGraph: {
      title: `${content.title} | ${config.siteName}`,
      description: content.description,
      url: canonical,
      type: "website",
    },
  };
}

export async function renderProducersDirectoryPage(locale: AppLocale) {
  const content = producersDirectoryContentForLocale(locale);
  const paths = localizedPathsForLocale(locale);
  const directoryPath = producersDirectoryPathForLocale(locale);
  const wineLocale: WineLocale = locale === "en" ? "en" : "sv";

  const producersRaw = await fetchIndexableProducersFromDb(
    "id, name, region, subregion, certification, short_description, lat, lon",
  );

  const producers = producersRaw as ProducerListRow[];

  const mapProducers = producers.map((producer) => {
    const slug = generateProducerSlug(producer.name);
    return {
      id: producer.id,
      name: producer.name,
      href: paths.producer(slug),
      lat: producer.lat,
      lon: producer.lon,
      region: producer.region,
      subregion: producer.subregion,
    };
  });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: content.shopLabel,
        item: `https://pactwines.com${paths.shop}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: content.breadcrumbLabel,
        item: `https://pactwines.com${directoryPath}`,
      },
    ],
  };

  return (
    <>
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
                  <Link href={paths.shop}>{content.shopLabel}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{content.breadcrumbLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="mb-2 mt-6 text-3xl font-bold">{content.heading}</h1>
          <p className="mb-10 text-muted-foreground">
            {content.countLabel(producers.length)}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {producers.map((producer) => {
              const slug = generateProducerSlug(producer.name);
              const bio = extractWineText(
                producer.short_description,
                wineLocale,
              );
              const initials = producerInitials(producer.name);

              return (
                <Link
                  key={producer.id}
                  href={paths.producer(slug)}
                  className="group overflow-hidden rounded-xl border bg-white transition-colors hover:border-zinc-400"
                >
                  <div className="flex h-24 items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                    <span className="text-2xl font-bold text-white opacity-30">
                      {initials}
                    </span>
                  </div>

                  <div className="p-4">
                    <h2 className="text-base font-semibold group-hover:underline">
                      {producer.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {producer.region}
                      {producer.subregion ? ` · ${producer.subregion}` : ""}
                    </p>
                    {bio ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {bio}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="sticky top-top-spacing h-[calc(100vh-var(--top-spacing))] max-lg:hidden">
          <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-950">
            <ProducersDirectoryMap
              producers={mapProducers}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
