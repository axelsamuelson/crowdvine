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
import { ArticleGuideShell } from "@/lib/guides/article-guide-shell";
import { buildArticleGuideMeta } from "@/lib/guides/guide-article-seo";
import { guideCopy } from "@/lib/guides/guide-copy";
import { guidePath } from "@/lib/guides/guide-routes";
import {
  articleParagraphs,
  articlePath,
  type GuideArticleContent,
} from "@/lib/guides/guide-types";
import type { AppLocale } from "@/lib/i18n/locale";
import { getSiteConfig } from "@/lib/site-config";

export async function buildArticleGuideMetadata(
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

export async function renderArticleGuidePage(
  content: GuideArticleContent,
  locale: AppLocale,
) {
  const config = await getSiteConfig();
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const pagePath = articlePath(content, locale);
  const pageUrl = `${config.baseUrl}${pagePath}`;

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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: copy.home,
        item: config.baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: copy.hubTitle,
        item: `${config.baseUrl}${hubPath}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: content.breadcrumbShort[locale],
        item: pageUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      <ArticleGuideShell
        h1={content.h1[locale]}
        lede={content.lede?.[locale] ?? content.hubCard.description[locale]}
        sections={content.sections.map((section) => ({
          heading: section.heading?.[locale],
          paragraphs: articleParagraphs(section.body, locale),
        }))}
        furtherReadingHeading={content.furtherReadingHeading[locale]}
        internalLinks={content.internalLinks
          .filter((link) => link.label[locale].trim().length > 0)
          .map((link) => ({
            label: link.label[locale],
            href: link.href[locale],
          }))}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">{copy.home}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={hubPath}>{copy.hubTitle}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {content.breadcrumbShort[locale]}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
    </>
  );
}
