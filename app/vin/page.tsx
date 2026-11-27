import type { Metadata } from "next";
import { Suspense } from "react";

import {
  MainShopContent,
  shopSkeleton,
} from "@/app/vin/components/main-shop-content";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getPublicSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

// force-static + revalidate → CDN ISR. Do not await searchParams (dynamic).
export const dynamic = "force-static";
export const revalidate = 300;

export function generateMetadata(): Metadata {
  const config = getPublicSiteConfig();
  const pageUrl = `${PACT_PUBLIC_ORIGIN}/vin`;
  // Strip suffix so root layout title.template does not double "| PACT Wines".
  const title = categoryPageTitle(
    "Naturvin online från små producenter i Frankrike | PACT Wines",
    config.siteName,
  );
  const description =
    "Naturvin online från små producenter i hela Frankrike. Vi samlar köpen på delade pallar från Languedoc och levererar inom Sverige.";

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        "sv-SE": `${PACT_PUBLIC_ORIGIN}/vin`,
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

export default function VinPage() {
  return (
    <Suspense fallback={shopSkeleton}>
      <MainShopContent
        searchParams={Promise.resolve({})}
        locale="sv"
      />
    </Suspense>
  );
}
