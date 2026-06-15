import type { Metadata } from "next";
import { Suspense } from "react";

import {
  MainShopContent,
  shopSkeleton,
} from "@/app/vin/components/main-shop-content";
import { shopSearchParamsRobots } from "@/lib/seo/shop-search-robots";
import { getSiteConfig } from "@/lib/site-config";

export const revalidate = 300;

export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}/wine`;
  const title = "Natural Wine Online — Buy Direct from Languedoc | PACT Wines";
  const description =
    "Browse 60+ natural wines directly imported from Languedoc. Organic, biodynamic and without additives. Home delivery in Stockholm.";

  return {
    title: { absolute: title },
    description,
    robots: shopSearchParamsRobots(searchParams),
    alternates: {
      canonical: pageUrl,
      languages: {
        sv: `${config.baseUrl}/vin`,
        en: `${config.baseUrl}/wine`,
        "x-default": `${config.baseUrl}/vin`,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
    },
  };
}

export default function WinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={shopSkeleton}>
      <MainShopContent searchParams={searchParams} locale="en" />
    </Suspense>
  );
}
