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
import { getSiteConfig } from "@/lib/site-config";

const content = aboutPageContentForLocale("en");

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const urls = aboutPageUrls(config.baseUrl);
  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: urls.en,
      languages: {
        en: urls.en,
        sv: urls.sv,
        "x-default": urls.xDefault,
      },
    },
    openGraph: {
      title: content.title,
      description: content.description,
      url: urls.en,
      type: "website",
      images: defaultOpenGraphImages(),
    },
    twitter: pageTwitterCard(content.title, content.description),
  };
}

export default async function AboutPage() {
  const config = await getSiteConfig();
  const urls = aboutPageUrls(config.baseUrl);

  return (
    <AboutPageView
      content={content}
      pageUrl={urls.en}
      siteName={config.name}
    />
  );
}
