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
import { Footer } from "@/components/layout/footer";
import { guideCopy } from "@/lib/guides/guide-copy";
import { guidePath } from "@/lib/guides/guide-routes";
import { marcelLapierreGuide } from "@/lib/guides/marcel-lapierre";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { getSiteConfig } from "@/lib/site-config";

const PAGE_PATH = marcelLapierreGuide.path;

export async function buildMarcelLapierreGuideMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}${PAGE_PATH}`;
  const title = categoryPageTitle(
    marcelLapierreGuide.metaTitle,
    config.siteName,
  );

  return {
    title,
    description: marcelLapierreGuide.metaDescription,
    alternates: {
      canonical: pageUrl,
      languages: {
        en: pageUrl,
        "x-default": pageUrl,
      },
    },
    openGraph: {
      title,
      description: marcelLapierreGuide.metaDescription,
      url: pageUrl,
      type: "article",
      locale: "en_US",
    },
  };
}

export async function renderMarcelLapierreGuidePage() {
  const config = await getSiteConfig();
  const copy = guideCopy("en");
  const hubPath = guidePath("hub", "en");
  const pageUrl = `${config.baseUrl}${PAGE_PATH}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: marcelLapierreGuide.h1,
    description: marcelLapierreGuide.metaDescription,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "PACT",
      url: config.baseUrl,
    },
    about: {
      "@type": "Person",
      name: "Marcel Lapierre",
      jobTitle: "Vigneron",
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
        name: marcelLapierreGuide.breadcrumbShort,
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

      <div className="mx-auto max-w-3xl px-6 py-16">
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
                {marcelLapierreGuide.breadcrumbShort}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          {marcelLapierreGuide.h1}
        </h1>

        {marcelLapierreGuide.sections.map((section) => (
          <section key={section.heading} className="mt-14">
            <h2 className="mb-4 border-b border-border pb-3 text-xl font-semibold">
              {section.heading}
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <nav className="mt-14 space-y-3 border-t border-border pt-8 text-sm">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            {marcelLapierreGuide.furtherReadingHeading}
          </h2>
          {marcelLapierreGuide.links.map((link) => (
            <p key={link.href}>
              <Link
                href={link.href}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {link.label}
              </Link>
            </p>
          ))}
        </nav>
      </div>

      <Footer />
    </>
  );
}
