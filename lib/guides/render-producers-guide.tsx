import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { GuideRankEntry } from "@/components/guides/guide-rank-entry";
import { GuideRankTable } from "@/components/guides/guide-rank-table";
import { Footer } from "@/components/layout/footer";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import {
  entryDescription,
  guideCopy,
} from "@/lib/guides/guide-copy";
import { countryLabel } from "@/lib/guides/guide-labels";
import {
  guideHreflang,
  guidePath,
} from "@/lib/guides/guide-routes";
import { filterLanguedocRoussillonEntries } from "@/lib/guides/languedoc-region";
import { producerGuideHref } from "@/lib/guides/producer-guide-links";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { getSiteConfig } from "@/lib/site-config";

function linkLanguedocMentions(
  text: string,
  locale: AppLocale,
): ReactNode {
  const href =
    locale === "sv"
      ? "/guider/naturvin-languedoc"
      : "/guides/languedoc-natural-wine";
  const parts = text.split("Languedoc");
  if (parts.length === 1) return text;
  return parts.flatMap((part, index) => {
    if (index === parts.length - 1) return [part];
    return [
      part,
      <Link
        key={`languedoc-${index}`}
        href={href}
        className="underline underline-offset-4 hover:text-foreground"
      >
        Languedoc
      </Link>,
    ];
  });
}

function ProducersLanguedocConnections({ locale }: { locale: AppLocale }) {
  const producerBase = locale === "sv" ? "/producenter" : "/producers";
  const linkClass = "underline underline-offset-4 hover:text-foreground";

  if (locale === "en") {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
        Two connections are especially direct. Axel Prüfer in Le
        Bousquet-d&apos;Orb (#38) is a neighbour of both{" "}
        <Link href={`${producerBase}/hors-saison`} className={linkClass}>
          Hors Saison
        </Link>{" "}
        and{" "}
        <Link
          href={`${producerBase}/le-bouc-a-trois-pattes`}
          className={linkClass}
        >
          Le Bouc à Trois Pattes
        </Link>
        , and helped Olga Ivanova and Antoine Monod get started when they
        founded Hors Saison in 2021. Didier Barral in Faugères (#71) taught
        Yannick Pelletier, whose domaine sits on the border between
        Saint-Chinian and Faugères.
      </p>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
      Två kopplingar är särskilt direkta. Axel Prüfer i Le
      Bousquet-d&apos;Orb (#38) är granne med både{" "}
      <Link href={`${producerBase}/hors-saison`} className={linkClass}>
        Hors Saison
      </Link>{" "}
      och{" "}
      <Link
        href={`${producerBase}/le-bouc-a-trois-pattes`}
        className={linkClass}
      >
        Le Bouc à Trois Pattes
      </Link>
      , och hjälpte Olga Ivanova och Antoine Monod igång när de startade Hors
      Saison 2021. Didier Barral i Faugères (#71) var lärare åt Yannick
      Pelletier, vars domän ligger på gränsen mellan Saint-Chinian och
      Faugères.
    </p>
  );
}

export async function buildProducersGuideMetadata(
  locale: AppLocale,
): Promise<Metadata> {
  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const pageUrl = `${config.baseUrl}${guidePath("producers", locale)}`;
  const title = categoryPageTitle(copy.producers.metaTitle, config.siteName);

  return {
    title,
    description: copy.producers.metaDescription,
    alternates: {
      canonical: pageUrl,
      languages: guideHreflang("producers", config.baseUrl),
    },
    openGraph: {
      title,
      description: copy.producers.metaDescription,
      url: pageUrl,
      type: "article",
    },
  };
}

export async function renderProducersGuidePage(locale: AppLocale) {
  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const winesPath = guidePath("wines", locale);
  const shopNatural =
    locale === "sv" ? "/vin/naturvin" : "/wine/natural-wine";

  const top10 = TOP_100_PRODUCERS.filter((p) => p.rank <= 10);
  const mid = TOP_100_PRODUCERS.filter((p) => p.rank >= 11 && p.rank <= 30);
  const rest = TOP_100_PRODUCERS.filter((p) => p.rank >= 31);
  const languedoc = filterLanguedocRoussillonEntries(TOP_100_PRODUCERS);

  const producerMetaLine = (entry: (typeof TOP_100_PRODUCERS)[number]) =>
    `${entry.region} · ${countryLabel(entry.country, locale)} · ${entry.grapes}`;

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: config.baseUrl },
    { name: copy.hubTitle, item: `${config.baseUrl}${hubPath}` },
    { name: copy.producers.breadcrumbShort },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.producers.h1,
    description: copy.producers.metaDescription,
    numberOfItems: 100,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: TOP_100_PRODUCERS.map((producer) => {
      const guideHref = producerGuideHref(producer.rank);
      return {
        "@type": "ListItem",
        position: producer.rank,
        name: producer.name,
        ...(guideHref
          ? { url: `${config.baseUrl}${guideHref}` }
          : {}),
      };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd),
        }}
      />

      <div className="mx-auto max-w-3xl px-6 pt-top-spacing pb-16">
        <GuideBreadcrumbs
          crumbs={[
            { label: copy.home, href: "/" },
            { label: copy.hubTitle, href: hubPath },
            { label: copy.producers.breadcrumbShort },
          ]}
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          {copy.producers.h1}
        </h1>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
          {copy.producers.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>
              {linkLanguedocMentions(paragraph, locale)}
            </p>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.top10}
          </h2>
          <div>
            {top10.map((producer) => (
              <GuideRankEntry
                key={producer.rank}
                rank={producer.rank}
                title={producer.name}
                meta={producerMetaLine(producer)}
                description={entryDescription(producer, locale)}
                href={producerGuideHref(producer.rank)}
              />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.mid}
          </h2>
          <div>
            {mid.map((producer) => (
              <GuideRankEntry
                key={producer.rank}
                rank={producer.rank}
                title={producer.name}
                meta={producerMetaLine(producer)}
                description={entryDescription(producer, locale)}
                href={producerGuideHref(producer.rank)}
                compact
              />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.rest}
          </h2>
          <GuideRankTable
            columns={[
              { key: "rank", label: copy.rank, className: "w-14 tabular-nums" },
              { key: "name", label: copy.name },
              { key: "region", label: copy.region },
              { key: "country", label: copy.country },
              { key: "grapes", label: copy.grapes },
            ]}
            rows={rest.map((producer) => ({
              rank: producer.rank,
              name: producer.name,
              region: producer.region,
              country: countryLabel(producer.country, locale),
              grapes: producer.grapes,
            }))}
          />
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.languedocHeading}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            {linkLanguedocMentions(copy.producers.languedocBeforeLinks, locale)}
          </p>
          <ProducersLanguedocConnections locale={locale} />
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {languedoc.map((producer) => (
              <li key={producer.rank}>
                <span className="font-medium tabular-nums text-foreground">
                  #{producer.rank}
                </span>{" "}
                {producer.name}
                <span className="text-muted-foreground/80">
                  {" "}
                  — {producer.region}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <nav className="mt-14 space-y-3 border-t border-border pt-8 text-sm">
          <p>
            <Link
              href={winesPath}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {copy.producers.crossLinkWines}
            </Link>
          </p>
          <p>
            <Link
              href={shopNatural}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {copy.shopNaturalWine}
            </Link>
          </p>
        </nav>
      </div>

      <Footer />
    </>
  );
}
