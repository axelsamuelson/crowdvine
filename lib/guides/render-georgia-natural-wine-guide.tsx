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
import {
  ARTICLE_GUIDE_BODY_CLASS,
  ARTICLE_GUIDE_H2_CLASS,
  ARTICLE_GUIDE_H3_CLASS,
  ArticleGuideShell,
} from "@/lib/guides/article-guide-shell";
import { georgiaNaturalWineGuide } from "@/lib/guides/georgia-natural-wine";
import { guideCopy } from "@/lib/guides/guide-copy";
import { guidePath } from "@/lib/guides/guide-routes";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { getSiteConfig } from "@/lib/site-config";

const PAGE_PATH = georgiaNaturalWineGuide.path;

export async function buildGeorgiaNaturalWineGuideMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}${PAGE_PATH}`;
  const title = categoryPageTitle(
    georgiaNaturalWineGuide.metaTitle,
    config.siteName,
  );

  return {
    title,
    description: georgiaNaturalWineGuide.metaDescription,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: pageUrl,
        "x-default": pageUrl,
      },
    },
    openGraph: {
      title,
      description: georgiaNaturalWineGuide.metaDescription,
      url: pageUrl,
      type: "article",
      locale: "en_US",
    },
  };
}

export async function renderGeorgiaNaturalWineGuidePage() {
  const config = await getSiteConfig();
  const copy = guideCopy("en");
  const hubPath = guidePath("hub", "en");
  const pageUrl = `${config.baseUrl}${PAGE_PATH}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: georgiaNaturalWineGuide.h1,
    description: georgiaNaturalWineGuide.metaDescription,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "PACT",
      url: config.baseUrl,
    },
    about: {
      "@type": "Place",
      name: "Georgia",
    },
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
        name: georgiaNaturalWineGuide.breadcrumbShort,
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
        h1={georgiaNaturalWineGuide.h1}
        lede={georgiaNaturalWineGuide.hubCard.description}
        sections={georgiaNaturalWineGuide.sections}
        afterSections={
          <>
            <section>
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>
                {georgiaNaturalWineGuide.producersHeading}
              </h2>
              <p className="mb-8 text-[17px] leading-[1.75] text-foreground/80">
                {georgiaNaturalWineGuide.producersIntro}
              </p>
              <div className="space-y-8">
                {georgiaNaturalWineGuide.producers.map((producer) => (
                  <div key={producer.name}>
                    <h3 className={ARTICLE_GUIDE_H3_CLASS}>
                      <Link
                        href={producer.href}
                        className="underline underline-offset-4 hover:text-foreground"
                      >
                        #{producer.rank} {producer.name}
                      </Link>
                    </h3>
                    <div className={`mt-2 ${ARTICLE_GUIDE_BODY_CLASS}`}>
                      {producer.paragraphs.map((paragraph) => (
                        <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {georgiaNaturalWineGuide.closingSections.map((section) => (
              <section key={section.heading}>
                <h2 className={ARTICLE_GUIDE_H2_CLASS}>{section.heading}</h2>
                <div className={ARTICLE_GUIDE_BODY_CLASS}>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </>
        }
        furtherReadingHeading={georgiaNaturalWineGuide.furtherReadingHeading}
        internalLinks={georgiaNaturalWineGuide.links}
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
                  {georgiaNaturalWineGuide.breadcrumbShort}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
    </>
  );
}
