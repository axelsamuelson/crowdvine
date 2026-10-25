import type { Metadata } from "next";
import { AboutPageView } from "@/components/about/about-page-view";
import {
  aboutPageContentForLocale,
  aboutPageUrls,
} from "@/lib/i18n/about-page-content";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

const content = aboutPageContentForLocale("sv");

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const urls = aboutPageUrls(PACT_PUBLIC_ORIGIN);
  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: urls.sv,
      languages: {
        en: urls.en,
        sv: urls.sv,
        "x-default": urls.xDefault,
      },
    },
    openGraph: {
      title: content.title,
      description: content.description,
      url: urls.sv,
      type: "website",
      images: defaultOpenGraphImages({ siteName: config.siteName }),
    },
    twitter: pageTwitterCard(content.title, content.description),
  };
}

export default async function OmOssPage() {
  const config = await getSiteConfig();
  const urls = aboutPageUrls(PACT_PUBLIC_ORIGIN);

  return (
    <AboutPageView
      content={content}
      pageUrl={urls.sv}
      siteName={config.name}
    />
  );
}
