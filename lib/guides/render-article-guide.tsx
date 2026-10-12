import type { Metadata } from "next";

import {
  ArticleGuideShell,
  type ArticleGuideShellBlock,
} from "@/lib/guides/article-guide-shell";
import { ArticleShopCta } from "@/lib/guides/article-shop-cta";
import { buildArticleGuideMeta } from "@/lib/guides/guide-article-seo";
import {
  articleGuideCrumbs,
  articleGuideJsonLdItems,
} from "@/lib/guides/guide-article-crumbs";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import { guideCopy } from "@/lib/guides/guide-copy";
import { isIndexableGuideHref } from "@/lib/guides/guide-publication";
import { guidePath } from "@/lib/guides/guide-routes";
import {
  articleLinkText,
  articleParagraphs,
  articlePath,
  isGuideArticlePublished,
  type GuideArticleContent,
  type GuideArticleSection,
} from "@/lib/guides/guide-types";
import type { AppLocale } from "@/lib/i18n/locale";
import { getGuideSeoOwnership } from "@/lib/guides/guide-seo-ownership";

function resolveArticleShopHref(
  content: GuideArticleContent,
  locale: AppLocale,
): string | null {
  if (content.shopCta === null) return null;
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
  const { config, seoBaseUrl } = await getGuideSeoOwnership();
  return buildArticleGuideMeta(
    content,
    locale,
    seoBaseUrl,
    config.siteName,
    isGuideArticlePublished(content)
      ? undefined
      : { noindex: true, nofollow: true },
  );
}

function shellBlocks(
  section: GuideArticleSection,
  locale: AppLocale,
): ArticleGuideShellBlock[] | undefined {
  if (!section.blocks) return undefined;
  const blocks: ArticleGuideShellBlock[] = [];
  for (const block of section.blocks) {
    if (block.type === "paragraphs") {
      for (const text of articleParagraphs(block.body, locale)) {
        blocks.push({ type: "paragraph", text });
      }
    } else {
      blocks.push({
        type: "list",
        ordered: block.ordered,
        label: block.label?.[locale],
        items: block.items[locale],
      });
    }
  }
  return blocks;
}

export async function renderArticleGuidePage(
  content: GuideArticleContent,
  locale: AppLocale,
) {
  const { seoBaseUrl } = await getGuideSeoOwnership();
  const copy = guideCopy(locale);
  const hubPath = guidePath("hub", locale);
  const pagePath = articlePath(content, locale);
  const pageUrl = `${seoBaseUrl}${pagePath}`;
  const shopHref = resolveArticleShopHref(content, locale);
  const shopLabel =
    content.shopCta?.label?.[locale]?.trim() || copy.shopNaturalWine;

  const shopCta =
    shopHref === null ? null : (
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
      url: seoBaseUrl,
    },
    about,
    ...(content.updated ? { dateModified: content.updated } : {}),
  };

  const faqs = (content.faqs ?? []).map((faq) => ({
    question: faq.question[locale],
    answer: faq.answer[locale],
  }));
  const faqJsonLd =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: articleLinkText(faq.answer),
            },
          })),
        }
      : null;

  const breadcrumbCrumbs = articleGuideCrumbs({
    locale,
    homeLabel: copy.home,
    hubLabel: copy.hubTitle,
    hubPath,
    pageLabel: content.breadcrumbShort[locale],
    slug: content.slug.en,
  });
  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd(
    articleGuideJsonLdItems(breadcrumbCrumbs, seoBaseUrl),
  );

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
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd),
          }}
        />
      ) : null}

      <ArticleGuideShell
        h1={content.h1[locale]}
        lede={content.lede?.[locale] ?? content.hubCard.description[locale]}
        sections={content.sections.map((section) => ({
          heading: section.heading?.[locale],
          headingBadge: section.headingBadge?.[locale],
          paragraphs: section.blocks
            ? []
            : articleParagraphs(section.body, locale),
          blocks: shellBlocks(section, locale),
        }))}
        afterFirstSection={
          content.sections.length >= 2 && shopCta ? shopCta : undefined
        }
        afterSections={shopCta ?? undefined}
        faqs={faqs}
        faqHeading={locale === "sv" ? "Vanliga frågor" : "Frequently asked questions"}
        furtherReadingHeading={content.furtherReadingHeading[locale]}
        internalLinks={content.internalLinks
          .filter((link) => link.label[locale].trim().length > 0)
          .map((link) => ({
            label: link.label[locale],
            href: link.href[locale],
          }))
          .filter((link) => isIndexableGuideHref(link.href))}
        breadcrumb={<GuideBreadcrumbs crumbs={breadcrumbCrumbs} />}
      />
    </>
  );
}
