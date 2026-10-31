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
import { getPublicSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

export const revalidate = 300;

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const config = getPublicSiteConfig();
  const pageUrl = `${PACT_PUBLIC_ORIGIN}/vin`;
  const titleBase = "Naturvin: köp naturvin online";
  const title = `${titleBase} | ${config.siteName}`;
  const description =
    "Bläddra bland naturviner. Ekologiskt och biodynamiskt. Hemleverans i Stockholm.";

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
