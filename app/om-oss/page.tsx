import type { Metadata } from "next";
import { AboutPageView } from "@/components/about/about-page-view";
import {
  aboutPageContentForLocale,
  aboutPageUrls,
} from "@/lib/i18n/about-page-content";
import { getSiteConfig } from "@/lib/site-config";

const content = aboutPageContentForLocale("sv");

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const urls = aboutPageUrls(config.baseUrl);
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
    },
  };
}

export default async function OmOssPage() {
  const config = await getSiteConfig();
  const urls = aboutPageUrls(config.baseUrl);

  return (
    <AboutPageView
      content={content}
      pageUrl={urls.sv}
      siteName={config.name}
    />
  );
}
