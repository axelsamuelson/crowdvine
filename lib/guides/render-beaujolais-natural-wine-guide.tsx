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
import { beaujolaisNaturalWineGuide } from "@/lib/guides/beaujolais-natural-wine";
import { guideCopy } from "@/lib/guides/guide-copy";
import { guidePath } from "@/lib/guides/guide-routes";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { getSiteConfig } from "@/lib/site-config";

const PAGE_PATH = beaujolaisNaturalWineGuide.path;

export async function buildBeaujolaisNaturalWineGuideMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}${PAGE_PATH}`;
  const title = categoryPageTitle(
    beaujolaisNaturalWineGuide.metaTitle,
    config.siteName,
  );

  return {
    title,
    description: beaujolaisNaturalWineGuide.metaDescription,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: pageUrl,
        "x-default": pageUrl,
      },
    },
    openGraph: {
      title,
      description: beaujolaisNaturalWineGuide.metaDescription,
      url: pageUrl,
      type: "article",
      locale: "en_US",
    },
  };
}

export async function renderBeaujolaisNaturalWineGuidePage() {
  const config = await getSiteConfig();
  const copy = guideCopy("en");
  const hubPath = guidePath("hub", "en");
  const pageUrl = `${config.baseUrl}${PAGE_PATH}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: beaujolaisNaturalWineGuide.h1,
    description: beaujolaisNaturalWineGuide.metaDescription,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "PACT",
      url: config.baseUrl,
    },
    about: {
      "@type": "Place",
      name: "Beaujolais, France",
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
        name: beaujolaisNaturalWineGuide.breadcrumbShort,
        item: pageUrl,
      },
    ],
  };

  const openingSections = beaujolaisNaturalWineGuide.sections.slice(0, -1);
  const gangOfFourSection =
    beaujolaisNaturalWineGuide.sections[
      beaujolaisNaturalWineGuide.sections.length - 1
    ];

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
        h1={beaujolaisNaturalWineGuide.h1}
        lede={beaujolaisNaturalWineGuide.hubCard.description}
        sections={openingSections.map((section) => ({
          heading: section.heading,
          paragraphs: section.paragraphs,
        }))}
        afterSections={
          <>
            <section>
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>
                {gangOfFourSection.heading}
              </h2>
              <div className={ARTICLE_GUIDE_BODY_CLASS}>
                {gangOfFourSection.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
                {"cta" in gangOfFourSection && gangOfFourSection.cta ? (
                  <p>
                    <Link
                      href={gangOfFourSection.cta.href}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {gangOfFourSection.cta.label}
                    </Link>
                  </p>
                ) : null}
              </div>
            </section>

            <section>
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>
                {beaujolaisNaturalWineGuide.producersHeading}
              </h2>
              <p className="mb-8 text-[17px] leading-[1.75] text-foreground/80">
                {beaujolaisNaturalWineGuide.producersIntro}
              </p>
              <div className="space-y-8">
                {beaujolaisNaturalWineGuide.producers.map((producer) => (
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

            {beaujolaisNaturalWineGuide.closingSections.map((section) => (
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
        furtherReadingHeading={
          beaujolaisNaturalWineGuide.furtherReadingHeading
        }
        internalLinks={beaujolaisNaturalWineGuide.links}
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
                  {beaujolaisNaturalWineGuide.breadcrumbShort}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
    </>
  );
}
