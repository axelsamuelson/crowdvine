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
import { guideHreflang, guidePath } from "@/lib/guides/guide-routes";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { getSiteConfig } from "@/lib/site-config";

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
  const hubPath = guidePath("hub", locale);

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
    ],
  };

  return (
    <>
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
              <BreadcrumbPage>{copy.hubTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          {copy.hubTitle}
        </h1>

        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          {copy.hubIntro}
        </p>

        <ul className="mt-10 space-y-4">
          {copy.hubCards.map((guide) => (
            <li key={guide.href}>
              <Link
                href={guide.href}
                className="block rounded-xl border border-border bg-background px-5 py-5 transition-colors hover:border-foreground/30"
              >
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {guide.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {guide.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <Footer />
    </>
  );
}
