import type { Metadata } from "next";
import { Suspense } from "react";

import {
  MainShopContent,
  shopSkeleton,
} from "@/app/vin/components/main-shop-content";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getPublicSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

export const dynamic = "force-static";
export const revalidate = 300;

export function generateMetadata(): Metadata {
  const config = getPublicSiteConfig();
  const pageUrl = `${PACT_PUBLIC_ORIGIN}/wine`;
  const titleBase = "Natural Wine: Buy Natural Wine Online";
  const title = `${titleBase} | ${config.siteName}`;
  const description =
    "Browse natural wines. Organic and biodynamic. Home delivery in Stockholm.";

  return {
    title: { absolute: title },
    description,
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
      locale: "en_US",
      images: defaultOpenGraphImages({
        siteName: config.siteName,
        locale: "en",
      }),
    },
    twitter: pageTwitterCard(title, description),
  };
}

export default function WinePage() {
  return (
    <Suspense fallback={shopSkeleton}>
      <MainShopContent
        searchParams={Promise.resolve({})}
        locale="en"
      />
    </Suspense>
  );
}
