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
import {
  extractWineText,
  type WineLocale,
} from "@/lib/i18n/wine-locale";
import { fetchIndexableProducersFromDb } from "@/lib/crowdvine/indexable-producers";
import { localizedPathsForLocale } from "@/lib/i18n/localized-paths";
import { generateProducerSlug } from "@/lib/producer-handle";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { getSiteConfig } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const producersUrl = `${config.baseUrl}/producers`;
  const title =
    "Naturvinsproducenter i Languedoc — direktimport via PACT Wines";
  const description =
    "Möt producenterna bakom PACTs sortiment. Småskaliga vinmakare i Languedoc som odlar ekologiskt och vinifierar utan tillsatser.";
  return {
    title,
    description,
    alternates: {
      canonical: producersUrl,
    },
    openGraph: {
      title,
      description,
      url: producersUrl,
      type: "website",
    },
  };
}

export const dynamic = "force-dynamic";

type ProducerListRow = {
  id: string;
  name: string;
  region: string | null;
  subregion: string | null;
  certification: string | null;
  short_description: Record<string, string> | string | null;
};

function producerInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function ProducersPage() {
  const shopping = await getShoppingContextFromRequest({ skipUser: true });
  const locale: WineLocale = shopping.locale === "en" ? "en" : "sv";
  const paths = localizedPathsForLocale(locale);

  const producersRaw = await fetchIndexableProducersFromDb(
    "id, name, region, subregion, certification, short_description",
  );

  const producers = producersRaw as ProducerListRow[];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Shop",
        item: `https://pactwines.com${paths.shop}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Producers",
        item: "https://pactwines.com/producers",
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
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={paths.shop}>Shop</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Producers</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="mb-2 mt-6 text-3xl font-bold">Producers</h1>
      <p className="mb-10 text-muted-foreground">
        {producers.length} producers från Languedoc
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {producers.map((producer) => {
          const slug = generateProducerSlug(producer.name);
          const bio = extractWineText(producer.short_description, locale);
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
    </>
  );
}
