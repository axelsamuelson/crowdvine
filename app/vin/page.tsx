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

// force-static + revalidate → CDN ISR. Avoid awaiting searchParams (dynamic).
// Filtered URLs hydrate filters client-side; SSR shell is the default catalog.
export const dynamic = "force-static";
export const revalidate = 300;

export function generateMetadata(): Metadata {
  const config = getPublicSiteConfig();
  const pageUrl = `${PACT_PUBLIC_ORIGIN}/vin`;
  const titleBase = "Naturvin: köp naturvin online";
  const title = `${titleBase} | ${config.siteName}`;
  const description =
    "Bläddra bland naturviner. Ekologiskt och biodynamiskt. Hemleverans i Stockholm.";

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
