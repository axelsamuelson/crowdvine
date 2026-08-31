import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import {
  ARTICLE_GUIDE_BODY_CLASS,
  ARTICLE_GUIDE_H2_CLASS,
} from "@/lib/guides/article-guide-shell";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import { guideCopy } from "@/lib/guides/guide-copy";
import { guidePath } from "@/lib/guides/guide-routes";
import type { AppLocale } from "@/lib/i18n/locale";
import { getSiteConfig } from "@/lib/site-config";
import {
  getRecommendationIssue,
  listIssues,
  parseRecommendationIssueSlug,
  recommendationIndexPath,
  recommendationIssuePath,
  recommendationWineDisplayName,
  recommendationWineMetaLine,
  systembolagetProductUrl,
  type RecommendationIssueSummary,
  type SystembolagetRecommendationWine,
} from "@/lib/systembolaget/recommendations";

function issueTitle(week: number, year: number, locale: AppLocale): string {
  return locale === "sv"
    ? `Rekommenderade naturviner — vecka ${week}, ${year}`
    : `Recommended natural wines — week ${week}, ${year}`;
}

function issueMeta(week: number, year: number, locale: AppLocale): string {
  return locale === "sv"
    ? `PACT:s oberoende urval av naturviner på Systembolaget för vecka ${week}, ${year}.`
    : `PACT's independent picks of natural wines at Systembolaget for week ${week}, ${year}.`;
}

function formatIssueDate(iso: string, locale: AppLocale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function buildRecommendationIssueMetadata(
  slug: string,
  locale: AppLocale,
): Promise<Metadata> {
  const parsed = parseRecommendationIssueSlug(slug);
  if (!parsed) {
    return { title: "Not found" };
  }

  const wines = await getRecommendationIssue(parsed.year, parsed.week);
  if (wines.length === 0) {
    return { title: "Not found" };
  }

  const config = await getSiteConfig();
  const title = `${issueTitle(parsed.week, parsed.year, locale)} | PACT Wines`;
  const description = issueMeta(parsed.week, parsed.year, locale);
  const path = recommendationIssuePath(parsed.year, parsed.week, locale);
  const alternateSv = recommendationIssuePath(parsed.year, parsed.week, "sv");
  const alternateEn = recommendationIssuePath(parsed.year, parsed.week, "en");

  return {
    title,
    description,
    alternates: {
      canonical: `${config.baseUrl}${path}`,
      languages: {
        sv: `${config.baseUrl}${alternateSv}`,
        en: `${config.baseUrl}${alternateEn}`,
        "x-default": `${config.baseUrl}${alternateSv}`,
      },
    },
  };
}

export async function buildRecommendationIndexMetadata(
  locale: AppLocale,
): Promise<Metadata> {
  const config = await getSiteConfig();
  const path = recommendationIndexPath(locale);
  const issues = await listIssues();
  const hasIssues = issues.length > 0;
  const title =
    locale === "sv"
      ? "Rekommenderade naturviner | PACT Wines"
      : "Recommended natural wines | PACT Wines";
  const description =
    locale === "sv"
      ? "Veckans oberoende urval av naturviner på Systembolaget — arkiv över alla publicerade nummer."
      : "Weekly independent picks of natural wines at Systembolaget — archive of all published issues.";

  return {
    title,
    description,
    ...(hasIssues
      ? {}
      : {
          robots: {
            index: false,
            follow: true,
          },
        }),
    alternates: {
      canonical: `${config.baseUrl}${path}`,
      languages: {
        sv: `${config.baseUrl}${recommendationIndexPath("sv")}`,
        en: `${config.baseUrl}${recommendationIndexPath("en")}`,
        "x-default": `${config.baseUrl}${recommendationIndexPath("sv")}`,
      },
    },
  };
}

function WineBlock({
  wine,
  locale,
}: {
  wine: SystembolagetRecommendationWine;
  locale: AppLocale;
}) {
  const note =
    locale === "en"
      ? wine.editorial_note_en?.trim() || wine.editorial_note_sv.trim()
      : wine.editorial_note_sv.trim();
  const meta = recommendationWineMetaLine(wine);
  const url = systembolagetProductUrl(wine.product_number);

  return (
    <section>
      <h2 className={ARTICLE_GUIDE_H2_CLASS}>
        {recommendationWineDisplayName(wine)}
      </h2>
      <div className={ARTICLE_GUIDE_BODY_CLASS}>
        {meta ? <p>{meta}</p> : null}
        {note ? <p>{note}</p> : null}
        <p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {url}
          </a>
        </p>
      </div>
    </section>
  );
}

export async function renderRecommendationIssuePage(
  slug: string,
  locale: AppLocale,
) {
  const parsed = parseRecommendationIssueSlug(slug);
  if (!parsed) notFound();

  const wines = await getRecommendationIssue(parsed.year, parsed.week);
  if (wines.length === 0) notFound();

  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const indexPath = recommendationIndexPath(locale);
  const pagePath = recommendationIssuePath(parsed.year, parsed.week, locale);
  const h1 = issueTitle(parsed.week, parsed.year, locale);
  const publishedAt = wines[0]?.published_at ?? null;

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: config.baseUrl },
    { name: copy.hubTitle, item: `${config.baseUrl}${hubPath}` },
    {
      name:
        locale === "sv"
          ? "Rekommenderade naturviner"
          : "Recommended natural wines",
      item: `${config.baseUrl}${indexPath}`,
    },
    { name: h1 },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <div className="mx-auto max-w-3xl px-6 pt-top-spacing pb-16">
        <GuideBreadcrumbs
          crumbs={[
            { label: copy.home, href: "/" },
            { label: copy.hubTitle, href: hubPath },
            {
              label:
                locale === "sv"
                  ? "Rekommenderade naturviner"
                  : "Recommended natural wines",
              href: indexPath,
            },
            { label: h1 },
          ]}
        />

        <div className="max-w-[68ch]">
          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
            {h1}
          </h1>
          <p className="mt-4 text-xl leading-relaxed text-muted-foreground">
            {locale === "sv"
              ? "Oberoende urval från Systembolagets sortiment — inga provisionslänkar, ingen egenintresse."
              : "Independent picks from Systembolaget's assortment — no affiliate links, no conflict of interest."}
          </p>
          {publishedAt ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {locale === "sv" ? "Publicerad" : "Published"}{" "}
              {formatIssueDate(publishedAt, locale)}
            </p>
          ) : null}

          <div className="mt-20 flex flex-col gap-14">
            {wines.map((wine) => (
              <WineBlock key={wine.id} wine={wine} locale={locale} />
            ))}
          </div>

          <nav className="mt-16 space-y-3 border-t border-border pt-8 text-sm">
            <p>
              <Link
                href={indexPath}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {locale === "sv"
                  ? "Alla rekommendationer →"
                  : "All recommendations →"}
              </Link>
            </p>
            <p className="text-muted-foreground">{pagePath}</p>
          </nav>
        </div>
      </div>
      <Footer />
    </>
  );
}

export async function renderRecommendationIndexPage(locale: AppLocale) {
  const issues = await listIssues();
  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const h1 =
    locale === "sv"
      ? "Rekommenderade naturviner"
      : "Recommended natural wines";

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: config.baseUrl },
    { name: copy.hubTitle, item: `${config.baseUrl}${hubPath}` },
    { name: h1 },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <div className="mx-auto max-w-3xl px-6 pt-top-spacing pb-16">
        <GuideBreadcrumbs
          crumbs={[
            { label: copy.home, href: "/" },
            { label: copy.hubTitle, href: hubPath },
            { label: h1 },
          ]}
        />

        <div className="max-w-[68ch]">
          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
            {h1}
          </h1>
          <p className="mt-4 text-xl leading-relaxed text-muted-foreground">
            {locale === "sv"
              ? "Veckans oberoende urval av naturviner på Systembolaget. Nyaste numret först."
              : "Weekly independent picks of natural wines at Systembolaget. Newest issue first."}
          </p>

          <div className="mt-14">
            {issues.length === 0 ? (
              <div className={`${ARTICLE_GUIDE_BODY_CLASS} space-y-6`}>
                <p>
                  {locale === "sv"
                    ? "Vi har inte publicerat något veckonummer ännu. Under tiden finns våra kurerade listor över naturvin på Systembolaget:"
                    : "We have not published a weekly issue yet. In the meantime, explore our curated Systembolaget natural wine lists:"}
                </p>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href={
                        locale === "sv"
                          ? "/guider/basta-roda-naturviner-systembolaget"
                          : "/guides/best-red-natural-wines-systembolaget"
                      }
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {locale === "sv"
                        ? "Bästa röda naturviner på Systembolaget →"
                        : "Best red natural wines at Systembolaget →"}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={
                        locale === "sv"
                          ? "/guider/basta-orange-naturviner-systembolaget"
                          : "/guides/best-orange-natural-wines-systembolaget"
                      }
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {locale === "sv"
                        ? "Bästa orange naturviner på Systembolaget →"
                        : "Best orange natural wines at Systembolaget →"}
                    </Link>
                  </li>
                </ul>
              </div>
            ) : (
              <ul className="space-y-4">
                {issues.map((issue) => (
                  <IssueIndexRow
                    key={`${issue.year}-${issue.week}`}
                    issue={issue}
                    locale={locale}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function IssueIndexRow({
  issue,
  locale,
}: {
  issue: RecommendationIssueSummary;
  locale: AppLocale;
}) {
  const href = recommendationIssuePath(issue.year, issue.week, locale);
  const label =
    locale === "sv"
      ? `Vecka ${issue.week}, ${issue.year}`
      : `Week ${issue.week}, ${issue.year}`;
  const countLabel =
    locale === "sv"
      ? `${issue.wineCount} ${issue.wineCount === 1 ? "vin" : "viner"}`
      : `${issue.wineCount} ${issue.wineCount === 1 ? "wine" : "wines"}`;

  return (
    <li>
      <Link
        href={href}
        className="group block underline-offset-4 hover:underline"
      >
        <span className="text-lg font-semibold tracking-tight text-foreground">
          {label}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {formatIssueDate(issue.published_at, locale)} · {countLabel}
        </span>
      </Link>
    </li>
  );
}
