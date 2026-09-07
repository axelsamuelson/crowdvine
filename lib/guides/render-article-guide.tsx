import type { Metadata } from "next";

import { ArticleGuideShell } from "@/lib/guides/article-guide-shell";
import { ArticleShopCta } from "@/lib/guides/article-shop-cta";
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
import { getSiteConfig } from "@/lib/site-config";

function resolveArticleShopHref(
  content: GuideArticleContent,
  locale: AppLocale,
): string {
  if (content.shopCta?.href[locale]) return content.shopCta.href[locale];

  const shopLink = content.internalLinks.find((link) => {
    const href = link.href[locale] || "";
    return (
      href === "/wine" ||
      href === "/vin" ||
      href.startsWith("/wine/") ||
      href.startsWith("/vin/")
    );
  });
  if (shopLink) return shopLink.href[locale];

  return locale === "sv" ? "/vin/naturvin" : "/wine/natural-wine";
}

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
  const shopHref = resolveArticleShopHref(content, locale);
  const shopLabel =
    content.shopCta?.label?.[locale]?.trim() || copy.shopNaturalWine;

  const shopCta = (
    <ArticleShopCta
      href={shopHref}
      label={shopLabel}
      lead={copy.shopCtaLead}
    />
  );

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
          headingBadge: section.headingBadge?.[locale],
          paragraphs: articleParagraphs(section.body, locale),
        }))}
        afterFirstSection={
          content.sections.length >= 2 ? shopCta : undefined
        }
        afterSections={shopCta}
        furtherReadingHeading={content.furtherReadingHeading[locale]}
        internalLinks={content.internalLinks
          .filter((link) => link.label[locale].trim().length > 0)
          .map((link) => ({
            label: link.label[locale],
            href: link.href[locale],
          }))}
        breadcrumb={
          <GuideBreadcrumbs
            crumbs={[
              { label: copy.home, href: "/" },
              { label: copy.hubTitle, href: hubPath },
              { label: content.breadcrumbShort[locale] },
            ]}
          />
        }
      />
    </>
  );
}
