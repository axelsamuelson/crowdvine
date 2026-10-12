import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { GuideRankEntry } from "@/components/guides/guide-rank-entry";
import { GuideRankNumber } from "@/components/guides/guide-rank-number";
import { GuideRankTable } from "@/components/guides/guide-rank-table";
import { ProducerRankChange } from "@/components/guides/producer-rank-change";
import { SystembolagetBagIcon } from "@/components/guides/systembolaget-bag-icon";
import { SystembolagetProducerMark } from "@/components/guides/systembolaget-producer-mark";
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
import {
  ALL_PRODUCER_GUIDES,
  producerGuideHref,
  producerGuidePath,
  splitProducerBlurbMentions,
} from "@/lib/guides/producer-guide-links";
import {
  getSystembolagetProducerAvailability,
  systembolagetAvailabilityLabel,
  systembolagetRangeNote,
} from "@/lib/guides/systembolaget-producer-availability";
import {
  formatTop100ProducersUpdatedDate,
  TOP_100_PRODUCERS,
  TOP_100_PRODUCERS_DEPARTED,
  TOP_100_PRODUCERS_UPDATED_AT,
} from "@/lib/guides/top-100-producers";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getGuideSeoOwnership } from "@/lib/guides/guide-seo-ownership";
import {
  SYSTEMBOLAGET_BEST_UPLINK,
  SYSTEMBOLAGET_RANKED_LISTS,
} from "@/lib/guides/systembolaget-list-links";

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

function linkedProducerBlurb(
  text: string | undefined,
  locale: AppLocale,
): ReactNode | undefined {
  if (!text) return undefined;
  const parts = splitProducerBlurbMentions(text, locale);
  if (!parts.some((part) => part.href)) return text;
  return parts.map((part, index) =>
    part.href ? (
      <Link
        key={`${part.href}-${index}`}
        href={part.href}
        className="underline underline-offset-4 hover:text-foreground"
      >
        {part.text}
      </Link>
    ) : (
      <span key={`blurb-${index}`}>{part.text}</span>
    ),
  );
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
  const { config, seoBaseUrl } = await getGuideSeoOwnership();
  const copy = guideCopy(locale);
  const pageUrl = `${seoBaseUrl}${guidePath("producers", locale)}`;
  const title = categoryPageTitle(copy.producers.metaTitle, config.siteName);

  return {
    title,
    description: copy.producers.metaDescription,
    alternates: {
      canonical: pageUrl,
      languages: guideHreflang("producers", seoBaseUrl),
    },
    openGraph: {
      title,
      description: copy.producers.metaDescription,
      url: pageUrl,
      type: "article",
      images: defaultOpenGraphImages(),
    },
    twitter: pageTwitterCard(title, copy.producers.metaDescription),
  };
}

export async function renderProducersGuidePage(locale: AppLocale) {
  const [{ seoBaseUrl }, availability] = await Promise.all([
    getGuideSeoOwnership(),
    getSystembolagetProducerAvailability(),
  ]);
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const winesPath = guidePath("wines", locale);
  const shopNatural =
    locale === "sv" ? "/vin/naturvin" : "/wine/natural-wine";
  const bestList = SYSTEMBOLAGET_RANKED_LISTS.find(
    (list) => list.category === "best",
  );

  const byRank = [...TOP_100_PRODUCERS].sort((a, b) => a.rank - b.rank);
  const rangeNote = systembolagetRangeNote(locale);
  const systembolagetHref = bestList?.href[locale] ?? null;
  const systembolagetMark = (rank: number) => {
    if (!systembolagetHref) return null;
    const label = systembolagetAvailabilityLabel(
      availability[rank] ?? 0,
      locale,
    );
    if (!label) return null;
    return <SystembolagetProducerMark label={label} href={systembolagetHref} />;
  };
  const top10 = byRank.filter((p) => p.rank <= 10);
  const mid = byRank.filter((p) => p.rank >= 11 && p.rank <= 30);
  const rest = byRank.filter((p) => p.rank >= 31);
  const languedoc = filterLanguedocRoussillonEntries(TOP_100_PRODUCERS);

  const producerMetaLine = (entry: (typeof TOP_100_PRODUCERS)[number]) =>
    `${entry.region} · ${countryLabel(entry.country, locale)} · ${entry.grapes}`;

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: seoBaseUrl },
    { name: copy.hubTitle, item: `${seoBaseUrl}${hubPath}` },
    { name: copy.producers.breadcrumbShort },
  ]);

  const pageUrl = `${seoBaseUrl}${guidePath("producers", locale)}`;
  const updatedDate = formatTop100ProducersUpdatedDate(locale);
  const updatedLine =
    locale === "sv"
      ? `Listan uppdaterades senast ${updatedDate}`
      : `List last updated ${updatedDate}`;
  const departedNames = TOP_100_PRODUCERS_DEPARTED.map((producer) => {
    const note = locale === "sv" ? producer.noteSv : producer.noteEn;
    return note ? `${producer.name} (${note})` : producer.name;
  }).join(", ");
  const departedLine =
    departedNames.length > 0
      ? locale === "sv"
        ? `Lämnade listan ${updatedDate}: ${departedNames}`
        : `Left the list ${updatedDate}: ${departedNames}`
      : null;
  const changeLegend =
    locale === "sv"
      ? "Pilarna visar förändring sedan föregående uppdatering."
      : "Arrows show the change since the previous update.";
  const extensionHeading =
    locale === "sv"
      ? "Fler producenter att känna till (plats 101-116)"
      : "More producers worth knowing (ranks 101-116)";

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: copy.producers.h1,
    url: pageUrl,
    dateModified: TOP_100_PRODUCERS_UPDATED_AT,
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.producers.h1,
    description: copy.producers.metaDescription,
    numberOfItems: byRank.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: byRank.map((producer) => {
      const guideHref = producerGuideHref(producer.rank, locale);
      return {
        "@type": "ListItem",
        position: producer.rank,
        name: producer.name,
        ...(guideHref
          ? { url: `${seoBaseUrl}${guideHref}` }
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
          __html: JSON.stringify(pageJsonLd),
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
        <p className="mt-3 text-sm text-muted-foreground">{updatedLine}</p>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
          {copy.producers.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>
              {linkLanguedocMentions(paragraph, locale)}
            </p>
          ))}
        </div>

        {bestList ? (
          <p className="mt-8 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <SystembolagetBagIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              {rangeNote.before}
              <Link
                href={bestList.href[locale]}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {rangeNote.link}
              </Link>
              {rangeNote.after}
            </span>
          </p>
        ) : null}

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.top10}
          </h2>
          <div>
            {top10.map((producer) => (
              <GuideRankEntry
                key={producer.rank}
                rank={producer.rank}
                rankNote={
                  <ProducerRankChange
                    rank={producer.rank}
                    previousRank={producer.previousRank}
                    locale={locale}
                  />
                }
                title={producer.name}
                meta={producerMetaLine(producer)}
                description={linkedProducerBlurb(
                  entryDescription(producer, locale),
                  locale,
                )}
                href={producerGuideHref(producer.rank, locale)}
                rankAdornment={systembolagetMark(producer.rank)}
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
                rankNote={
                  <ProducerRankChange
                    rank={producer.rank}
                    previousRank={producer.previousRank}
                    locale={locale}
                  />
                }
                title={producer.name}
                meta={producerMetaLine(producer)}
                description={linkedProducerBlurb(
                  entryDescription(producer, locale),
                  locale,
                )}
                href={producerGuideHref(producer.rank, locale)}
                rankAdornment={systembolagetMark(producer.rank)}
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
              {
                key: "rankDisplay",
                label: copy.rank,
                className: "w-[4.5rem]",
              },
              {
                key: "change",
                label: locale === "sv" ? "Förändring" : "Change",
                className: "w-16",
                srOnlyLabel: true,
              },
              { key: "name", label: copy.name },
              { key: "region", label: copy.region },
              { key: "country", label: copy.country },
              { key: "grapes", label: copy.grapes },
            ]}
            dividerBeforeRank={101}
            dividerLabel={extensionHeading}
            rows={rest.map((producer) => ({
              rank: producer.rank,
              rankDisplay: (
                <GuideRankNumber
                  rank={producer.rank}
                  adornment={systembolagetMark(producer.rank)}
                />
              ),
              change: (
                <ProducerRankChange
                  rank={producer.rank}
                  previousRank={producer.previousRank}
                  locale={locale}
                />
              ),
              name: producer.name,
              region: producer.region,
              country: countryLabel(producer.country, locale),
              grapes: producer.grapes,
            }))}
          />
          <div className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>{changeLegend}</p>
            {departedLine ? <p>{departedLine}</p> : null}
          </div>
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

        <section className="mt-14">
          <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
            {copy.producers.allGuidesHeading}
          </h2>
          <ul className="space-y-2 text-base">
            {ALL_PRODUCER_GUIDES.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={producerGuidePath(guide.slug, locale)}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {guide.name[locale]}
                </Link>
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
          {bestList ? (
            <p>
              <Link
                href={bestList.href[locale]}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {SYSTEMBOLAGET_BEST_UPLINK.anchor[locale]} →
              </Link>
            </p>
          ) : null}
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
