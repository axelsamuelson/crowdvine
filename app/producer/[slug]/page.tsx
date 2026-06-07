import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Footer } from "@/components/layout/footer";
import { getAppUrlForRequest, getInternalFetchHeaders } from "@/lib/app-url";
import { ProducerWineCard } from "@/components/producer/producer-wine-card";
import { translate } from "@/lib/i18n/messages";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";

export const dynamic = "force-dynamic";

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

async function fetchProducerBySlug(
  slug: string,
): Promise<ProducerBySlugResponse | null> {
  const base = await getAppUrlForRequest();
  const cookieStore = await cookies();
  const locale = cookieStore.get("pact_locale")?.value ?? "sv";
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
  locale: string,
): string | null {
  if (!cert) return null;
  const map: Record<string, Record<string, string>> = {
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
  locale: string,
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

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await fetchProducerBySlug(slug);
  if (!data?.producer) {
    return { title: "Producer | PACT" };
  }

  const { name, region, bio_short } = data.producer;
  const regionLabel = region?.trim() || "producenten";

  return {
    title: `${name} — Naturvin direkt från ${regionLabel} | PACT`,
    description: bio_short?.slice(0, 155) ?? undefined,
  };
}

export default async function ProducerPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const data = await fetchProducerBySlug(slug);
  if (!data?.producer) notFound();

  const { producer, wines } = data;
  const shopping = await getShoppingContextFromRequest({ skipUser: true });
  const locale = shopping.locale;
  const t = (key: string) => translate(locale, key);

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

  return (
    <>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,35%)]">
        <div className="max-w-2xl px-6 py-12">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/shop">Shop</Link>
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

          {producer.bio_long ? (
            <details className="mt-6 group">
              <summary className="cursor-pointer text-sm font-medium text-foreground underline-offset-2 hover:underline">
                Läs mer om {producer.name}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {producer.bio_long}
              </p>
            </details>
          ) : null}

          <h2 className="mb-4 mt-10 text-xl font-semibold">
            Viner från {producer.name}
          </h2>
          {wines.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {wines.map((wine) => (
                <ProducerWineCard
                  key={wine.id}
                  wine={wine}
                  intlLocale={shopping.intlLocale}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Inga publicerade viner just nu.
            </p>
          )}
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
