import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CartProvider } from "@/components/cart/cart-context";
import { DebugGrid } from "@/components/debug-grid";
import { isDevelopment } from "@/lib/constants";
import { getCachedShopCollections } from "@/lib/shop/cached-layout-data";
import { ConditionalHeaderServer } from "../components/layout/header/conditional-header-server";
import { VaulDrawerAttributeSync } from "@/components/layout/vaul-drawer-attribute-sync";
import { VAUL_DRAWER_WRAPPER_ID } from "@/lib/vaul-drawer-routes";
import { V0Provider } from "@/lib/context";
import { MobileMenuProvider } from "../components/layout/header/mobile-menu-context";
import { MembershipProvider } from "@/lib/context/membership-context";
import { PortalProvider } from "@/lib/context/portal-context";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { cn } from "../lib/utils";
import V0SetupLoader from "@/components/v0-setup-loader";
import { RootAnalyticsDeferred } from "@/components/analytics/root-analytics-deferred";

const isV0 = process.env["VERCEL_URL"]?.includes("vusercontent.net") ?? false;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { getSiteContentByKey } from "@/lib/actions/content";
import { B2BModeProvider } from "@/lib/context/b2b-mode-context";
import { ShoppingContextProvider } from "@/lib/context/shopping-context-provider";
import { WineSettingsProvider } from "@/lib/context/wine-settings-context";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { SiteLogoProvider } from "@/lib/context/site-logo-provider";
import { getCachedWineFewLeftThreshold } from "@/lib/wine-settings-cache";
import { type SiteConfig } from "@/lib/site-config";
import { getPublicSiteConfig } from "@/lib/site-config-server";
import {
  buildRootTwitterMetadata,
  defaultOpenGraphImages,
} from "@/lib/seo/default-social";

function buildRootOpenGraph(config: SiteConfig): Metadata["openGraph"] {
  return {
    siteName: config.siteName,
    locale: "sv_SE",
    alternateLocale: ["en_US"],
    type: "website",
    images: defaultOpenGraphImages({ siteName: config.siteName, locale: "sv" }),
  };
}

function buildRootMetadata(
  config: SiteConfig,
  overrides?: { title?: string; description?: string },
): Metadata {
  return {
    metadataBase: new URL(config.baseUrl),
    title: {
      default: overrides?.title ?? config.defaultTitle,
      template: `%s | ${config.siteName}`,
    },
    description: overrides?.description ?? config.defaultDescription,
    openGraph: buildRootOpenGraph(config),
    twitter: buildRootTwitterMetadata(config.siteName, config.twitterHandle),
  };
}

/**
 * Root metadata stays host-neutral (PACT) so the layout can stay ISR-cacheable.
 * Dirtywine title/description hydrate via client branding; page-level metadata
 * on dynamic admin routes can still call getSiteConfig().
 */
export async function generateMetadata(): Promise<Metadata> {
  const config = getPublicSiteConfig();

  try {
    const hasAdminCreds =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!hasAdminCreds) {
      return buildRootMetadata(config);
    }

    const [rawTitle, rawDescription] = await Promise.all([
      getSiteContentByKey("site_title"),
      getSiteContentByKey("site_description"),
    ]);

    return buildRootMetadata(config, {
      title: rawTitle || config.defaultTitle,
      description: rawDescription || config.defaultDescription,
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    return buildRootMetadata(config);
  }
}

/**
 * Root Layout — request-free shell for public ISR.
 *
 * Pathname, host/site, locale cookie, and shopping prefs are resolved in
 * middleware + client providers (or nested Suspense), never via headers()/cookies()
 * here. That keeps /, /vin, /produkt/* eligible for CDN cache for anonymous visitors.
 * Membership, cart, and portal stay client-fetched so personal data is never shared.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [collections, fewLeftThreshold] = await Promise.all([
    getCachedShopCollections().catch((error) => {
      console.warn("Failed to fetch collections in root layout:", error);
      return [] as Awaited<ReturnType<typeof getCachedShopCollections>>;
    }),
    getCachedWineFewLeftThreshold().catch((error) => {
      console.warn("Failed to resolve wine few-left threshold:", error);
      return 5;
    }),
  ]);

  // Swedish-first default; ShoppingContextProvider syncs <html lang> + locale from path.
  const shoppingContext = fallbackShoppingContext("sv");

  return (
    <html lang="sv" suppressHydrationWarning>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "antialiased min-h-screen",
          { "is-v0": isV0 },
        )}
        suppressHydrationWarning
      >
        <NuqsAdapter>
        <B2BModeProvider isB2B={false}>
          <WineSettingsProvider fewLeftThreshold={fewLeftThreshold}>
          <SiteLogoProvider
            initialLogos={{ headerLogo: null, footerLogo: null }}
            fetchOnMount
          >
          <ShoppingContextProvider initialContext={shoppingContext}>
          <CartProvider>
            <OnboardingProvider>
              <V0Provider isV0={isV0}>
                <MobileMenuProvider>
                  <PortalProvider>
                    <MembershipProvider>
                      {/*
                        Use a div (not <main>) here: many routes render their own
                        <main>, and nested mains make the browser rewrite the DOM
                        before hydration (seen as div vs script mismatches).
                      */}
                      <div>
                        <div
                          id={VAUL_DRAWER_WRAPPER_ID}
                          suppressHydrationWarning
                          data-vaul-drawer-wrapper="true"
                        >
                          <VaulDrawerAttributeSync />
                          <ConditionalHeaderServer collections={collections} />
                          {children}
                        </div>
                      </div>
                      {isDevelopment && <DebugGrid />}
                      <RootAnalyticsDeferred />
                    </MembershipProvider>
                  </PortalProvider>
                </MobileMenuProvider>
                {isV0 && <V0SetupLoader />}
              </V0Provider>
            </OnboardingProvider>
          </CartProvider>
          </ShoppingContextProvider>
          </SiteLogoProvider>
          </WineSettingsProvider>
        </B2BModeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
