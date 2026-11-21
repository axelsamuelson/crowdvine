import type { Metadata } from "next";
import { Suspense } from "react";

import {
  MainShopContent,
  shopSkeleton,
} from "@/app/vin/components/main-shop-content";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { shopSearchParamsRobots } from "@/lib/seo/shop-search-robots";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { DIRTY_WINE_CONFIG } from "@/lib/site-config";
import { getSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

export const revalidate = 300;

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const config = await getSiteConfig();
  const pageUrl = `${PACT_PUBLIC_ORIGIN}/vin`;
  // Strip suffix so root layout title.template does not double "| PACT Wines".
  const title = categoryPageTitle(
    "Naturvin online från små producenter i Frankrike | PACT Wines",
    config.siteName,
  );
  const description =
    config.baseUrl === DIRTY_WINE_CONFIG.baseUrl
      ? "Naturvin. Ekologiskt och biodynamiskt. För restauranger i Stockholm."
      : "Naturvin online från små producenter i hela Frankrike. Vi samlar köpen på delade pallar från Languedoc och levererar inom Sverige.";

  return {
    title,
    description,
    robots: shopSearchParamsRobots(searchParams),
    alternates: {
      canonical: pageUrl,
      languages: {
        sv: `${PACT_PUBLIC_ORIGIN}/vin`,
        en: `${PACT_PUBLIC_ORIGIN}/wine`,
        "x-default": `${PACT_PUBLIC_ORIGIN}/wine`,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      locale: "sv_SE",
      images: defaultOpenGraphImages({
        siteName: config.siteName,
        locale: "sv",
      }),
    },
    twitter: pageTwitterCard(title, description),
  };
}

export default function VinPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={shopSkeleton}>
      <MainShopContent searchParams={searchParams} locale="sv" />
    </Suspense>
  );
}
