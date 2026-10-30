import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import {
  ARTICLE_GUIDE_BODY_CLASS,
  ARTICLE_GUIDE_H2_CLASS,
  renderArticleRichText,
} from "@/lib/guides/article-guide-shell";
import { buildArticleGuideMeta } from "@/lib/guides/guide-article-seo";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import { guideHomeAbsoluteUrl } from "@/lib/guides/guide-article-crumbs";
import { guideCopy } from "@/lib/guides/guide-copy";
import { isGuideHrefVisibleFrom } from "@/lib/guides/guide-publication";
import { guidePath } from "@/lib/guides/guide-routes";
import { homePathForLocale } from "@/lib/i18n/localized-routes";
import { SystembolagetGuideNav } from "@/components/guides/systembolaget-guide-nav";
import {
  SYSTEMBOLAGET_BY_STYLE_HEADING,
  SYSTEMBOLAGET_GUIDE_NAV_LABEL,
  siblingSystembolagetLists,
  systembolagetGuideNavItems,
  systembolagetListHref,
  systembolagetListLabel,
} from "@/lib/guides/systembolaget-list-links";
import {
  articleParagraphs,
  articlePath,
  isGuideArticlePublished,
  type GuideArticleContent,
} from "@/lib/guides/guide-types";
import type { AppLocale } from "@/lib/i18n/locale";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import { getGuideSeoOwnership } from "@/lib/guides/guide-seo-ownership";
import { resolveRankTokens } from "@/lib/guides/resolve-rank-tokens";
import {
  formatPlacementBadge,
  formatSyncedAtLabel,
  freshestSyncedAt,
  getGuideWines,
  limitedAvailabilityLabel,
  primaryStyleLabel,
  systembolagetImageUrl,
  systembolagetProductUrl,
  type GuideWineCategory,
  type SystembolagetGuideWine,
} from "@/lib/systembolaget/guide-wines";
import type { Metadata } from "next";

const BOTTLE_WIDTH_MOBILE = 64;
const BOTTLE_HEIGHT_MOBILE = 120;
/** md+ display size (~2.5× mobile), same 8:15 aspect. */
const BOTTLE_WIDTH_DESKTOP = 160;
const BOTTLE_HEIGHT_DESKTOP = 300;

function isDuplicateOfProducer(
  part: string | null | undefined,
  producer: string,
): boolean {
  const value = part?.trim();
  if (!value || !producer) return false;
  const a = value.toLocaleLowerCase("sv-SE");
  const b = producer.toLocaleLowerCase("sv-SE");
  return a === b || b.includes(a);
}

/** Producer as emphasis; wine name as secondary (deduped). */
export function wineNameParts(wine: SystembolagetGuideWine): {
  producer: string;
  secondary: string | null;
} {
  const producer = wine.producer_name?.trim() || "Unknown producer";
  const thin = wine.name_thin?.trim() || null;
  const bold = wine.name_bold?.trim() || null;

  const usableThin =
    thin && !isDuplicateOfProducer(thin, producer) ? thin : null;
  const usableBold =
    bold && !isDuplicateOfProducer(bold, producer) ? bold : null;

  let secondary: string | null = null;
  if (usableBold && usableThin) {
    secondary = `${usableBold} ${usableThin}`;
  } else {
    secondary = usableThin || usableBold;
  }

  return { producer, secondary };
}

function wineListName(wine: SystembolagetGuideWine): string {
  const { producer, secondary } = wineNameParts(wine);
  return secondary ? `${producer} ${secondary}` : producer;
}

/** Bottle size for the meta line; omit standard 750 ml to keep the line short. */
export function formatBottleVolume(
  volumeMl: number | null | undefined,
  locale: AppLocale,
): string | null {
  if (volumeMl == null || !Number.isFinite(volumeMl) || volumeMl <= 0) {
    return null;
  }
  const ml = Math.round(volumeMl);
  if (ml === 750) return null;
  if (ml === 1000) return locale === "sv" ? "1 liter" : "1 litre";
  if (ml >= 1000 && ml % 1000 === 0) {
    const litres = ml / 1000;
    return locale === "sv" ? `${litres} liter` : `${litres} litres`;
  }
  return `${ml} ml`;
}

function wineMetaParts(
  wine: SystembolagetGuideWine,
  locale: AppLocale,
): string[] {
  const rawOrigin =
    wine.origin_level_1?.trim() || wine.country?.trim() || null;
  const origin = rawOrigin ? localizePlaceName(rawOrigin, locale) : null;
  return [
    wine.vintage != null ? String(wine.vintage) : null,
    origin,
    formatBottleVolume(wine.volume, locale),
  ].filter((part): part is string => Boolean(part));
}

/** Systembolaget product geography is Swedish; map common labels for EN UI. */
function localizePlaceName(name: string, locale: AppLocale): string {
  if (locale === "sv") return name;
  const map: Record<string, string> = {
    Österrike: "Austria",
    Sydafrika: "South Africa",
    Italien: "Italy",
    Frankrike: "France",
    Spanien: "Spain",
    Tyskland: "Germany",
    Portugal: "Portugal",
    Georgien: "Georgia",
    Grekland: "Greece",
    Ungern: "Hungary",
    Slovenien: "Slovenia",
    Kroatien: "Croatia",
    Australien: "Australia",
    "Nya Zeeland": "New Zealand",
    USA: "USA",
    Chile: "Chile",
    Argentina: "Argentina",
  };
  return map[name] ?? name;
}

/** Assortment channel as a quiet label (not part of the meta line). */
function assortmentLabel(
  assortmentText: string | null,
  locale: AppLocale,
): string | null {
  const raw = assortmentText?.trim();
  if (!raw) return null;
  const lower = raw.toLocaleLowerCase("sv-SE");

  // SV keeps the existing uppercase labels; EN uses Systembolaget's English terms.
  if (lower.startsWith("ordervar")) {
    return locale === "sv" ? "ORDERVARA" : "Order range";
  }
  if (lower.includes("tillfälligt")) {
    return locale === "sv" ? "TILLFÄLLIGT SORTIMENT" : "Temporary range";
  }
  if (lower.startsWith("fast ")) {
    return locale === "sv" ? "FAST SORTIMENT" : "Fixed range";
  }
  if (lower.startsWith("webblansering")) {
    return locale === "sv" ? "WEBBLANSERINGAR" : "Online release";
  }
  if (lower.includes("lokalt") && lower.includes("småskaligt")) {
    return locale === "sv" ? "LOKALT & SMÅSKALIGT" : "Local & Small-scale";
  }
  if (lower.startsWith("säsong") || lower === "sasong") {
    return locale === "sv" ? "SÄSONG" : "Seasonal";
  }

  return locale === "sv"
    ? raw.toLocaleUpperCase("sv-SE")
    : raw;
}

function formatPrice(price: number | null): string | null {
  if (price === null || price === undefined) return null;
  return `${price} kr`;
}

function formatAmount(price: number): string {
  const asInt = Math.round(price);
  if (Math.abs(price - asInt) < 0.001) return String(asInt);
  return String(price);
}

/** Fill {min}/{max} from rendered wine prices. Empty lists keep a range-free answer. */
export function answerWithPriceRange(
  template: string,
  wines: readonly Pick<SystembolagetGuideWine, "price">[],
  locale: AppLocale,
): string {
  if (!template.includes("{min}") && !template.includes("{max}")) return template;
  const prices: number[] = [];
  for (const wine of wines) {
    if (wine.price == null) continue;
    const value = Number(wine.price);
    if (Number.isFinite(value)) prices.push(value);
  }
  if (prices.length === 0) {
    return locale === "sv"
      ? "Prisintervallet visas när listan har viner."
      : "The price range appears when the list has wines.";
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return template
    .replaceAll("{min}", formatAmount(min))
    .replaceAll("{max}", formatAmount(max));
}

function BottleImage({
  wine,
  priority,
  size,
}: {
  wine: SystembolagetGuideWine;
  priority: boolean;
  size: 100 | 200 | 400;
}) {
  const { producer, secondary } = wineNameParts(wine);
  const alt = [producer, secondary].filter(Boolean).join(" ");
  const src =
    systembolagetImageUrl(wine.image_url, size) ?? DEFAULT_WINE_IMAGE_PATH;

  return (
    <div className="flex h-[120px] w-16 shrink-0 items-center justify-center md:h-[300px] md:w-40">
      <Image
        src={src}
        alt={alt}
        width={BOTTLE_WIDTH_DESKTOP}
        height={BOTTLE_HEIGHT_DESKTOP}
        className="block h-full w-full object-contain object-top"
        sizes="(min-width: 768px) 160px, 64px"
        priority={priority}
        loading={priority ? undefined : "lazy"}
      />
    </div>
  );
}

export function RankedWineRow({
  wine,
  rank,
  locale,
  priority,
  showRank = true,
  showMovement = true,
  showPrice = true,
  launchLabel,
  limitedLabelText,
}: {
  wine: SystembolagetGuideWine;
  rank: number;
  locale: AppLocale;
  priority: boolean;
  /** Rank number. Ranked lists leave this on. */
  showRank?: boolean;
  /**
   * Up/down or "Ny" under the rank, compared with the previous visible place.
   * The release calendar turns this off.
   */
  showMovement?: boolean;
  /**
   * Systembolaget shelf price on the card. The release calendar turns this off
   * — we must not compare or display Systembolaget prices there.
   */
  showPrice?: boolean;
  /** Release-calendar date, e.g. "Släpps 6 nov". Omitted on ranked lists. */
  launchLabel?: string | null;
  /**
   * Replaces the default limited-availability label.
   * undefined keeps today's label. null hides it.
   */
  limitedLabelText?: string | null;
}) {
  const { producer, secondary } = wineNameParts(wine);
  const badge = showMovement
    ? formatPlacementBadge(rank, wine.previous_rank, locale)
    : null;
  const showRankBadge = Boolean(badge);
  const meta = wineMetaParts(wine, locale);
  const assortment = assortmentLabel(wine.assortment_text, locale);
  const limitedLabel =
    limitedLabelText !== undefined
      ? limitedLabelText
      : limitedAvailabilityLabel(wine.availability_state, locale);
  const styleLabel = primaryStyleLabel(wine.primary_style, locale);
  const price = showPrice ? formatPrice(wine.price) : null;
  const note =
    locale === "en"
      ? wine.editorial_note_en?.trim() || wine.editorial_note_sv.trim()
      : wine.editorial_note_sv.trim();
  const rawProducerNote =
    locale === "en"
      ? wine.producer_note_en?.trim() || wine.producer_note_sv?.trim() || null
      : wine.producer_note_sv?.trim() || null;
  const producerNote = resolveRankTokens(
    rawProducerNote,
    wine.top_100_producer_name,
  );
  const url = systembolagetProductUrl(wine.product_number);
  const linkLabel =
    locale === "sv" ? "Visa på Systembolaget →" : "View at Systembolaget →";

  return (
    <article className="border-b border-border py-6 last:border-b-0 md:min-h-[calc(300px+3rem)]">
      <div
        className={
          showRank
            ? "grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 md:gap-x-4"
            : "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 md:gap-x-4"
        }
      >
        {showRank ? (
        <div className="row-start-1 flex flex-col items-center gap-1.5 md:pt-0 pt-0.5">
          <span
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-foreground px-2.5 text-sm font-semibold tabular-nums leading-none text-background md:h-10 md:min-w-10 md:text-base"
            aria-label={locale === "sv" ? `Plats ${rank}` : `Rank ${rank}`}
          >
            {rank}
          </span>
          {showRankBadge ? (
            <span className="text-xs text-muted-foreground">{badge}</span>
          ) : null}
        </div>
        ) : null}

        <div className="row-start-1 self-start">
          <BottleImage
            wine={wine}
            priority={priority}
            size={showRank ? (rank <= 3 ? 400 : 200) : priority ? 400 : 200}
          />
        </div>

        {/*
          Mobile: `contents` lets header stay in col 3 and body span full width.
          md+: one flex column beside the bottle so the note sits under the label,
          not under the image bottom edge.
        */}
        <div className="contents md:row-start-1 md:flex md:min-w-0 md:flex-col md:self-start md:pt-0">
          <div className={showRank ? "col-start-3 min-w-0 md:col-auto" : "col-start-2 min-w-0 md:col-auto"}>
            {launchLabel ? (
              <p className="mb-1 text-xs text-muted-foreground">{launchLabel}</p>
            ) : null}
            {styleLabel ? (
              <p className="mb-1 text-xs text-muted-foreground">{styleLabel}</p>
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <h2 className="m-0 min-w-0 text-lg leading-none tracking-tight break-words md:leading-none">
                <span className="font-semibold text-foreground">{producer}</span>
                {secondary ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    {secondary}
                  </span>
                ) : null}
              </h2>
              {price ? (
                <p className="shrink-0 pt-0.5 text-base font-medium tabular-nums text-foreground md:hidden">
                  {price}
                </p>
              ) : null}
            </div>

            {meta.length > 0 || price ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {meta.join(" · ")}
                {price ? (
                  <span className="hidden md:inline">
                    {meta.length > 0 ? " · " : null}
                    <span className="text-foreground tabular-nums">{price}</span>
                  </span>
                ) : null}
              </p>
            ) : null}

            {assortment ? (
              <p
                className={
                  locale === "sv"
                    ? "mt-1 text-xs uppercase tracking-[0.08em] text-muted-foreground"
                    : "mt-1 text-xs tracking-[0.02em] text-muted-foreground"
                }
              >
                {assortment}
              </p>
            ) : null}

            {limitedLabel ? (
              <p className="mt-1 text-xs font-medium text-amber-800">
                {limitedLabel}
              </p>
            ) : null}
          </div>

          <div className={showRank ? "col-span-3 min-w-0 md:col-auto md:mt-4" : "col-span-2 min-w-0 md:col-auto md:mt-4"}>
            {note ? (
              <p className="text-[15px] leading-relaxed text-foreground/80">
                {note}
              </p>
            ) : null}

            {producerNote ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {producerNote}
              </p>
            ) : null}

            <p className={note || producerNote ? "mt-4" : undefined}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex min-h-[44px] items-center text-sm underline underline-offset-4 hover:text-foreground"
              >
                {linkLabel}
              </a>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}


/**
 * ItemList only. Do not nest Product/Offer pointing at systembolaget.se —
 * that mis-signals commerce ownership and risks rejected rich results.
 */
export function buildItemListJsonLd(
  wines: SystembolagetGuideWine[],
  pageUrl: string,
  name: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: pageUrl,
    numberOfItems: wines.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: wines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: wineListName(wine),
      url: systembolagetProductUrl(wine.product_number),
    })),
  };
}

export async function buildSystembolagetRankedListMetadata(
  content: GuideArticleContent,
  locale: AppLocale,
  options?: { noindex?: boolean },
): Promise<Metadata> {
  const { config, seoBaseUrl } = await getGuideSeoOwnership();
  const unpublished = !isGuideArticlePublished(content);
  return buildArticleGuideMeta(
    content,
    locale,
    seoBaseUrl,
    config.siteName,
    // Systembolaget demand is Sweden-first. Prefer SV as the unmatched default.
    {
      xDefault: "sv",
      noindex: options?.noindex || unpublished,
      nofollow: unpublished,
    },
  );
}

/**
 * Ranked Systembolaget guide: intro → wine rows → synced → editorial below.
 */
export async function renderSystembolagetRankedListPage(
  content: GuideArticleContent,
  locale: AppLocale,
  category: GuideWineCategory,
) {
  const wines = await getGuideWines(category, "recommended");
  const avoidWines = await getGuideWines(category, "avoid");
  const { seoBaseUrl } = await getGuideSeoOwnership();
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const pagePath = articlePath(content, locale);
  const pageUrl = `${seoBaseUrl}${pagePath}`;
  const intro =
    content.lede?.[locale] ?? content.hubCard.description[locale];
  const syncedAt = freshestSyncedAt(wines);
  const syncedLabel = formatSyncedAtLabel(syncedAt, locale);
  const dateModified = (() => {
    let best: string | null = content.updated ?? null;
    if (syncedAt && (!best || syncedAt > best)) best = syncedAt;
    for (const wine of wines) {
      const reviewed = wine.last_reviewed_at;
      if (!reviewed) continue;
      if (!best || reviewed > best) best = reviewed;
    }
    return best;
  })();

  const about =
    content.jsonLdAbout.type === "Person"
      ? {
          "@type": "Person" as const,
          name: content.jsonLdAbout.name,
          ...(content.jsonLdAbout.jobTitle
            ? { jobTitle: content.jsonLdAbout.jobTitle }
            : {}),
        }
      : content.jsonLdAbout.type === "Place"
        ? {
            "@type": "Place" as const,
            name: content.jsonLdAbout.name,
          }
        : {
            "@type": "Thing" as const,
            name: content.jsonLdAbout.name,
          };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: content.h1[locale],
    headline: content.h1[locale],
    description: content.meta[locale],
    url: pageUrl,
    inLanguage: locale === "sv" ? "sv-SE" : "en-GB",
    isPartOf: {
      "@type": "WebSite",
      name: "PACT",
      url: seoBaseUrl,
    },
    about,
    ...(dateModified ? { dateModified } : {}),
  };

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: guideHomeAbsoluteUrl(seoBaseUrl, locale) },
    { name: copy.hubTitle, item: `${seoBaseUrl}${hubPath}` },
    { name: content.breadcrumbShort[locale] },
  ]);

  const itemListJsonLd = buildItemListJsonLd(
    wines,
    pageUrl,
    content.h1[locale],
  );

  const faqs = (content.faqs ?? []).map((faq) => ({
    ...faq,
    answer: {
      en: answerWithPriceRange(faq.answer.en, wines, "en"),
      sv: answerWithPriceRange(faq.answer.sv, wines, "sv"),
    },
  }));
  const faqJsonLd =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          name: content.h1[locale],
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question[locale],
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer[locale],
            },
          })),
        }
      : null;

  const isParentList = category === "best";
  const styleLists = isParentList ? siblingSystembolagetLists(category) : [];
  const siblingLists = isParentList ? [] : siblingSystembolagetLists(category);
  const guideNavItems = systembolagetGuideNavItems(locale);
  const siblingHeading =
    locale === "sv"
      ? "Fler Systembolaget-listor"
      : "More Systembolaget lists";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd),
        }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <div className="mx-auto max-w-3xl px-6 pt-top-spacing pb-16">
        <GuideBreadcrumbs
          crumbs={[
            { label: copy.home, href: homePathForLocale(locale) },
            { label: copy.hubTitle, href: hubPath },
            { label: content.breadcrumbShort[locale] },
          ]}
        />

        <div className="max-w-[68ch]">
          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
            {content.h1[locale]}
          </h1>

          <SystembolagetGuideNav
            label={SYSTEMBOLAGET_GUIDE_NAV_LABEL[locale]}
            items={guideNavItems}
            active={category}
          />

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {intro}
          </p>

          <div className="mt-10">
            {wines.length === 0 ? (
              <p className="text-[17px] leading-[1.75] text-foreground/80">
                {locale === "sv"
                  ? "Vi uppdaterar just nu listan mot Systembolagets aktuella sortiment."
                  : "We are currently updating this list against Systembolaget's current assortment."}
              </p>
            ) : (
              <ol className="list-none p-0">
                {wines.map((wine, index) => (
                  <li key={wine.id}>
                    <RankedWineRow
                      wine={wine}
                      rank={index + 1}
                      locale={locale}
                      priority={index < 3}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>

          {syncedLabel ? (
            <p className="mt-6 text-sm text-muted-foreground">{syncedLabel}</p>
          ) : null}

          {styleLists.length > 0 ? (
            <nav className="mt-14 border-t border-border pt-14" aria-label={SYSTEMBOLAGET_BY_STYLE_HEADING[locale]}>
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>
                {SYSTEMBOLAGET_BY_STYLE_HEADING[locale]}
              </h2>
              <div className="space-y-3 text-base">
                {styleLists.map((list) => (
                  <p key={list.category}>
                    <Link
                      href={systembolagetListHref(list, locale)}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {list.h1[locale]}
                    </Link>
                  </p>
                ))}
              </div>
            </nav>
          ) : null}

          <div className="mt-14 space-y-14 border-t border-border pt-14">
            {content.sections.map((section, sectionIndex) => (
              <section key={section.heading?.[locale] ?? `section-${sectionIndex}`}>
                {section.heading ? (
                  <h2 className={ARTICLE_GUIDE_H2_CLASS}>
                    {section.heading[locale]}
                  </h2>
                ) : null}
                <div className={ARTICLE_GUIDE_BODY_CLASS}>
                  {articleParagraphs(section.body, locale).map(
                    (paragraph, paragraphIndex) => (
                      <p key={`${sectionIndex}-${paragraphIndex}`}>
                        {renderArticleRichText(
                          paragraph,
                          `s${sectionIndex}p${paragraphIndex}`,
                        )}
                      </p>
                    ),
                  )}
                </div>
                {section.heading?.en === "What we don't list" &&
                avoidWines.length > 0 ? (
                  <ul className="mt-6 space-y-4">
                    {avoidWines.map((wine) => {
                      const { producer, secondary } = wineNameParts(wine);
                      const note =
                        locale === "en"
                          ? wine.editorial_note_en?.trim() ||
                            wine.editorial_note_sv.trim()
                          : wine.editorial_note_sv.trim();
                      return (
                        <li key={wine.id} className="text-[15px] leading-relaxed">
                          <p className="font-medium text-foreground">
                            {producer}
                            {secondary ? (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                {secondary}
                              </span>
                            ) : null}
                            {wine.price != null ? (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                · {wine.price} kr
                              </span>
                            ) : null}
                          </p>
                          {note ? (
                            <p className="mt-1 text-foreground/80">{note}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            ))}

            {faqs.length > 0 ? (
              <section>
                <h2 className={ARTICLE_GUIDE_H2_CLASS}>
                  {locale === "sv" ? "Vanliga frågor" : "Frequently asked questions"}
                </h2>
                <div className="mt-6 space-y-8">
                  {faqs.map((faq) => (
                    <div key={faq.question[locale]}>
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {faq.question[locale]}
                      </h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">
                        {faq.answer[locale]}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>

        {siblingLists.length > 0 ? (
          <nav className="mt-16 space-y-3 border-t border-border pt-8 text-sm">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {siblingHeading}
            </h2>
            {siblingLists.map((list) => (
              <p key={list.category}>
                <Link
                  href={systembolagetListHref(list, locale)}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {systembolagetListLabel(list, locale)}
                </Link>
              </p>
            ))}
          </nav>
        ) : null}

        {content.furtherReadingHeading ? (
          <nav className="mt-16 space-y-3 border-t border-border pt-8 text-sm">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {content.furtherReadingHeading[locale]}
            </h2>
            {content.internalLinks
              .filter(
                (link) =>
                  link.label[locale].trim().length > 0 &&
                  isGuideHrefVisibleFrom(content, link.href[locale]),
              )
              .map((link) => (
                <p key={`${link.href[locale]}-${link.label[locale]}`}>
                  <Link
                    href={link.href[locale]}
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {link.label[locale]}
                  </Link>
                </p>
              ))}
          </nav>
        ) : null}
      </div>

      <Footer />
    </>
  );
}
