import type { Metadata } from "next";

import { GuideHubBrowse } from "@/components/guides/guide-hub-browse";
import { Footer } from "@/components/layout/footer";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import { guideCopy } from "@/lib/guides/guide-copy";
import { guideHreflang, guidePath } from "@/lib/guides/guide-routes";
import type { AppLocale } from "@/lib/i18n/locale";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getGuideSeoOwnership } from "@/lib/guides/guide-seo-ownership";

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

  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd([
    { name: copy.home, item: seoBaseUrl },
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

      <div className="pt-top-spacing pb-16">
        <div className="px-sides">
          <GuideBreadcrumbs
            crumbs={[
              { label: copy.home, href: "/" },
              { label: copy.hubTitle },
            ]}
          />
        </div>

        <GuideHubBrowse
          hubTitle={copy.hubTitle}
          hubIntro={copy.hubIntro}
          sections={copy.hubSections}
          labels={{
            searchPlaceholder: copy.hubSearchPlaceholder,
            searchAria: copy.hubSearchAria,
            clearSearch: copy.hubClearSearch,
            clear: copy.hubClear,
            all: copy.hubAll,
            filter: copy.hubFilter,
            noResults: copy.hubNoResults,
          }}
        />
      </div>

      <Footer />
    </>
  );
}
