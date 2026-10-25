import type { Metadata } from "next";
import { Suspense } from "react";

import {
  MainShopContent,
  shopSkeleton,
} from "@/app/vin/components/main-shop-content";
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
  const title = `Naturvin online | Köp naturvin hos ${config.siteName}`;
  const description =
    config.baseUrl === DIRTY_WINE_CONFIG.baseUrl
      ? "Naturvin. Ekologiskt och biodynamiskt. För restauranger i Stockholm."
      : "Bläddra bland 60+ naturviner. Ekologiskt och biodynamiskt. Hemleverans i Stockholm.";

  return {
    title: { absolute: title },
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
      images: defaultOpenGraphImages({ siteName: config.siteName }),
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
