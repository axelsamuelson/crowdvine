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
} from "@/lib/guides/guide-copy";
import { guideHreflang, guidePath } from "@/lib/guides/guide-routes";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getGuideSeoOwnership } from "@/lib/guides/guide-seo-ownership";
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

function GuideHubCardLink({ guide }: { guide: GuideHubCard }) {
  const featured = Boolean(guide.featured);

  return (
    <Link href={guide.href} className="group block h-full">
      {guide.kicker ? (
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {guide.kicker}
        </span>
      ) : null}
      <h3
        className={cn(
          "font-semibold tracking-tight text-foreground/80 transition-colors group-hover:text-foreground",
          featured ? "text-2xl md:text-3xl" : "text-base md:text-lg",
          guide.kicker && "mt-1",
        )}
      >
        {guide.title}
      </h3>
      <p
        className={cn(
          "mt-2 leading-relaxed text-muted-foreground",
          featured ? "text-base max-w-[68ch]" : "text-sm line-clamp-3",
        )}
      >
        {guide.description}
      </p>
    </Link>
  );
}

export async function buildGuideHubMetadata(
  locale: AppLocale,
): Promise<Metadata> {
  const { config, seoBaseUrl } = await getGuideSeoOwnership();
  const copy = guideCopy(locale);
  const pageUrl = `${seoBaseUrl}${guidePath("hub", locale)}`;
  const title = categoryPageTitle(copy.hubMetaTitle, config.siteName);

  return {
    title,
    description: copy.hubMetaDescription,
    alternates: {
      canonical: pageUrl,
      languages: guideHreflang("hub", seoBaseUrl),
    },
    openGraph: {
      title,
      description: copy.hubMetaDescription,
      url: pageUrl,
      type: "website",
      images: defaultOpenGraphImages(),
    },
    twitter: pageTwitterCard(title, copy.hubMetaDescription),
  };
}

export async function renderGuideHubPage(locale: AppLocale) {
  const { seoBaseUrl } = await getGuideSeoOwnership();
  const copy = guideCopy(locale);
  const hubSections = copy.hubSections;

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: seoBaseUrl },
    { name: copy.hubTitle },
  ]);

  const sectionNav = (
    <ul className="flex flex-col gap-0.5">
      {hubSections.map((section) => (
        <li key={section.title}>
          <Link
            href={`#${hubSectionId(section.title)}`}
            className="flex w-full text-left text-sm text-foreground/80 transition-all md:hover:translate-x-1 md:hover:opacity-80"
          >
            {section.title}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      <div className="pt-top-spacing pb-16">
        <div className="px-sides">
          <GuideBreadcrumbs
            crumbs={[
              { label: copy.home, href: "/" },
              { label: copy.hubTitle },
            ]}
          />
        </div>

        <div className="mt-6 flex flex-col md:grid md:grid-cols-12 md:gap-4">
          <aside
            aria-labelledby="guide-hub-nav-label"
            className="sticky top-top-spacing col-span-3 hidden max-h-[calc(100vh-var(--top-spacing))] min-h-0 w-full flex-col self-start pl-sides md:flex"
          >
            <p
              id="guide-hub-nav-label"
              className="shrink-0 pb-2 pl-2 text-xl font-semibold"
            >
              {copy.hubTitle}
            </p>
            <nav
              aria-label={copy.hubTitle}
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-4 pr-1 pl-2"
            >
              {sectionNav}
            </nav>
          </aside>

          <div className="col-span-9 flex flex-col px-sides md:px-0 md:pr-sides">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {copy.hubTitle}
            </h1>

            <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-muted-foreground">
              {copy.hubIntro}
            </p>

            <nav
              aria-label={copy.hubTitle}
              className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-b border-border pb-4 text-sm text-muted-foreground md:hidden"
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

            <div className="mt-10 md:mt-12">
              {hubSections.map((section) => {
                const sectionId = hubSectionId(section.title);
                const cards = orderHubCards(section.cards);

                return (
                  <section key={section.title} className="mt-12 first:mt-0 md:mt-16">
                    <h2
                      id={sectionId}
                      className="mb-6 scroll-mt-24 border-b border-border pb-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {section.title}
                    </h2>
                    <ul className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
                      {cards.map((guide) => {
                        const featured = Boolean(guide.featured);

                        return (
                          <li
                            key={guide.href}
                            className={cn(
                              "min-w-0 border-b border-border pb-6",
                              featured && "sm:col-span-2 xl:col-span-3",
                            )}
                          >
                            <GuideHubCardLink guide={guide} />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
