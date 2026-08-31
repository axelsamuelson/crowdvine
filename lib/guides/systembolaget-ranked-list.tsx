import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import {
  ARTICLE_GUIDE_BODY_CLASS,
  ARTICLE_GUIDE_H2_CLASS,
} from "@/lib/guides/article-guide-shell";
import { buildArticleGuideMeta } from "@/lib/guides/guide-article-seo";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import { guideCopy } from "@/lib/guides/guide-copy";
import { guidePath } from "@/lib/guides/guide-routes";
import {
  articleParagraphs,
  articlePath,
  type GuideArticleContent,
} from "@/lib/guides/guide-types";
import type { AppLocale } from "@/lib/i18n/locale";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import { getSiteConfig } from "@/lib/site-config";
import {
  formatRankBadge,
  formatSyncedAtLabel,
  freshestSyncedAt,
  getGuideWines,
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

function wineMetaParts(wine: SystembolagetGuideWine): string[] {
  const origin =
    wine.origin_level_1?.trim() || wine.country?.trim() || null;
  return [
    wine.vintage != null ? String(wine.vintage) : null,
    origin,
  ].filter((part): part is string => Boolean(part));
}

/** Assortment channel as a quiet label (not part of the meta line). */
function assortmentLabel(assortmentText: string | null): string | null {
  const raw = assortmentText?.trim();
  if (!raw) return null;
  const lower = raw.toLocaleLowerCase("sv-SE");
  if (lower.startsWith("ordervar")) return "ORDERVARA";
  if (lower.includes("tillfälligt")) return "TILLFÄLLIGT SORTIMENT";
  return raw.toLocaleUpperCase("sv-SE");
}

function formatPrice(price: number | null): string | null {
  if (price === null || price === undefined) return null;
  return `${price} kr`;
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

function RankedWineRow({
  wine,
  rank,
  locale,
  priority,
}: {
  wine: SystembolagetGuideWine;
  rank: number;
  locale: AppLocale;
  priority: boolean;
}) {
  const { producer, secondary } = wineNameParts(wine);
  const badge = formatRankBadge(wine, locale);
  // Only show movement badges when a prior list position exists to compare against.
  // First-edition rows are all "new" with null previous_sort_order — hiding avoids
  // a meaningless "Ny" under every number.
  const showRankBadge = wine.previous_sort_order != null && Boolean(badge);
  const meta = wineMetaParts(wine);
  const assortment = assortmentLabel(wine.assortment_text);
  const price = formatPrice(wine.price);
  const note =
    locale === "en"
      ? wine.editorial_note_en?.trim() || wine.editorial_note_sv.trim()
      : wine.editorial_note_sv.trim();
  const producerNote =
    locale === "en"
      ? wine.producer_note_en?.trim() || wine.producer_note_sv?.trim() || null
      : wine.producer_note_sv?.trim() || null;
  const url = systembolagetProductUrl(wine.product_number);
  const linkLabel =
    locale === "sv" ? "Visa på Systembolaget →" : "View at Systembolaget →";

  return (
    <article className="border-b border-border py-6 last:border-b-0 md:min-h-[calc(300px+3rem)]">
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 md:gap-x-4">
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

        <div className="row-start-1 self-start">
          <BottleImage
            wine={wine}
            priority={priority}
            size={rank <= 3 ? 400 : 200}
          />
        </div>

        {/*
          Mobile: `contents` lets header stay in col 3 and body span full width.
          md+: one flex column beside the bottle so the note sits under the label,
          not under the image bottom edge.
        */}
        <div className="contents md:row-start-1 md:flex md:min-w-0 md:flex-col md:self-start md:pt-0">
          <div className="col-start-3 min-w-0 md:col-auto">
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
              <p className="mt-1 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                {assortment}
              </p>
            ) : null}
          </div>

          <div className="col-span-3 min-w-0 md:col-auto md:mt-4">
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


function buildItemListJsonLd(
  wines: SystembolagetGuideWine[],
  pageUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    url: pageUrl,
    numberOfItems: wines.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: wines.map((wine, index) => {
      const name = wineListName(wine);
      const url = systembolagetProductUrl(wine.product_number);
      const image =
        systembolagetImageUrl(wine.image_url, index < 3 ? 400 : 200) ??
        undefined;
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name,
          ...(image ? { image } : {}),
          url,
          ...(wine.price != null
            ? {
                offers: {
                  "@type": "Offer",
                  price: wine.price,
                  priceCurrency: "SEK",
                  url,
                  availability: "https://schema.org/InStock",
                },
              }
            : {}),
        },
      };
    }),
  };
}

export async function buildSystembolagetRankedListMetadata(
  content: GuideArticleContent,
  locale: AppLocale,
): Promise<Metadata> {
  const config = await getSiteConfig();
  return buildArticleGuideMeta(
    content,
    locale,
    config.baseUrl,
    config.siteName,
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
  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const pagePath = articlePath(content, locale);
  const pageUrl = `${config.baseUrl}${pagePath}`;
  const intro =
    content.lede?.[locale] ?? content.hubCard.description[locale];
  const syncedLabel = formatSyncedAtLabel(freshestSyncedAt(wines), locale);

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
    headline: content.h1[locale],
    description: content.meta[locale],
    url: pageUrl,
    inLanguage: locale === "sv" ? "sv-SE" : "en-GB",
    isPartOf: {
      "@type": "WebSite",
      name: "PACT",
      url: config.baseUrl,
    },
    about,
  };

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: config.baseUrl },
    { name: copy.hubTitle, item: `${config.baseUrl}${hubPath}` },
    { name: content.breadcrumbShort[locale] },
  ]);

  const itemListJsonLd =
    wines.length > 0 ? buildItemListJsonLd(wines, pageUrl) : null;

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
      {itemListJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemListJsonLd),
          }}
        />
      ) : null}

      <div className="mx-auto max-w-3xl px-6 pt-top-spacing pb-16">
        <GuideBreadcrumbs
          crumbs={[
            { label: copy.home, href: "/" },
            { label: copy.hubTitle, href: hubPath },
            { label: content.breadcrumbShort[locale] },
          ]}
        />

        <div className="max-w-[68ch]">
          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
            {content.h1[locale]}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
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

          <div className="mt-14 space-y-14 border-t border-border pt-14">
            {content.sections.map((section, sectionIndex) => (
              <section key={section.heading?.[locale] ?? `section-${sectionIndex}`}>
                {section.heading ? (
                  <h2 className={ARTICLE_GUIDE_H2_CLASS}>
                    {section.heading[locale]}
                  </h2>
                ) : null}
                <div className={ARTICLE_GUIDE_BODY_CLASS}>
                  {articleParagraphs(section.body, locale).map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {content.furtherReadingHeading ? (
          <nav className="mt-16 space-y-3 border-t border-border pt-8 text-sm">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {content.furtherReadingHeading[locale]}
            </h2>
            {content.internalLinks
              .filter((link) => link.label[locale].trim().length > 0)
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
