import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import {
  guideCopy,
  type GuideHubCard,
  type GuideHubSection,
} from "@/lib/guides/guide-copy";
import { guideHreflang, guidePath } from "@/lib/guides/guide-routes";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { getSiteConfig } from "@/lib/site-config";
import { recommendationIndexPath, listIssues } from "@/lib/systembolaget/recommendations";
import { cn } from "@/lib/utils";

function hubSectionId(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function orderHubCards(cards: GuideHubCard[]): GuideHubCard[] {
  const featured = cards.filter((card) => card.featured);
  const rest = cards.filter((card) => !card.featured);
  return [...featured, ...rest];
}

function isWeeklyRecommendationsHref(href: string): boolean {
  return (
    href === recommendationIndexPath("sv") ||
    href === recommendationIndexPath("en")
  );
}

/** Hide empty weekly archive from the hub until the first issue ships. */
function hubSectionsForDisplay(
  sections: GuideHubSection[],
  hasRecommendationIssues: boolean,
): GuideHubSection[] {
  if (hasRecommendationIssues) return sections;
  return sections
    .map((section) => ({
      ...section,
      cards: section.cards.filter(
        (card) => !isWeeklyRecommendationsHref(card.href),
      ),
    }))
    .filter((section) => section.cards.length > 0);
}

export async function buildGuideHubMetadata(
  locale: AppLocale,
): Promise<Metadata> {
  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const pageUrl = `${config.baseUrl}${guidePath("hub", locale)}`;
  const title = categoryPageTitle(copy.hubMetaTitle, config.siteName);

  return {
    title,
    description: copy.hubMetaDescription,
    alternates: {
      canonical: pageUrl,
      languages: guideHreflang("hub", config.baseUrl),
    },
    openGraph: {
      title,
      description: copy.hubMetaDescription,
      url: pageUrl,
      type: "website",
    },
  };
}

export async function renderGuideHubPage(locale: AppLocale) {
  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const issues = await listIssues();
  const hubSections = hubSectionsForDisplay(
    copy.hubSections,
    issues.length > 0,
  );

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: config.baseUrl },
    { name: copy.hubTitle },
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
            { label: copy.hubTitle },
          ]}
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          {copy.hubTitle}
        </h1>

        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          {copy.hubIntro}
        </p>

        <nav
          aria-label={copy.hubTitle}
          className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
        >
          {hubSections.map((section) => (
            <Link
              key={section.title}
              href={`#${hubSectionId(section.title)}`}
              className="hover:text-foreground"
            >
              {section.title}
            </Link>
          ))}
        </nav>

        <div>
          {hubSections.map((section) => {
            const sectionId = hubSectionId(section.title);
            const cards = orderHubCards(section.cards);

            return (
              <section key={section.title} className="mt-16">
                <h2
                  id={sectionId}
                  className="mb-6 scroll-mt-24 border-b border-border pb-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {section.title}
                </h2>
                <ul className="grid gap-y-6 md:grid-cols-2 md:gap-x-10">
                  {cards.map((guide) => {
                    const featured = Boolean(guide.featured);

                    return (
                      <li
                        key={guide.href}
                        className={cn(
                          "min-w-0 border-b border-border pb-6",
                          featured && "md:col-span-2",
                        )}
                      >
                        <Link href={guide.href} className="group block">
                          {guide.kicker ? (
                            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              {guide.kicker}
                            </span>
                          ) : null}
                          <h3
                            className={cn(
                              "font-semibold tracking-tight text-foreground/80 transition-colors group-hover:text-foreground",
                              featured ? "text-2xl" : "text-lg",
                              guide.kicker && "mt-1",
                            )}
                          >
                            {guide.title}
                          </h3>
                          <p
                            className={cn(
                              "mt-2 leading-relaxed text-muted-foreground",
                              featured ? "text-base" : "text-sm",
                            )}
                          >
                            {guide.description}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <Footer />
    </>
  );
}
