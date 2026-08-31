import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CartProvider } from "@/components/cart/cart-context";
import { DebugGrid } from "@/components/debug-grid";
import { isDevelopment } from "@/lib/constants";
import { getCachedShopCollections } from "@/lib/shop/cached-layout-data";
import { ConditionalHeaderServer } from "../components/layout/header/conditional-header-server";
import { VaulDrawerAttributeSync } from "@/components/layout/vaul-drawer-attribute-sync";
import {
  pathnameNeedsVaulDrawerWrapper,
  VAUL_DRAWER_WRAPPER_ID,
} from "@/lib/vaul-drawer-routes";
import { headers } from "next/headers";
import { V0Provider } from "@/lib/context";
import { MobileMenuProvider } from "../components/layout/header/mobile-menu-context";
import { MembershipProvider } from "@/lib/context/membership-context";
import { PortalProvider } from "@/lib/context/portal-context";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { cn } from "../lib/utils";
import { B2BThemeEffect } from "../components/layout/b2b-theme-effect";
import V0SetupLoader from "@/components/v0-setup-loader";

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
import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";
import { B2BModeProvider } from "@/lib/context/b2b-mode-context";
import { ShoppingContextProvider } from "@/lib/context/shopping-context-provider";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import {
  isPublicAppPath,
  publicPathUsesUserShoppingContext,
} from "@/lib/auth/public-paths";
import { SiteLogoProvider } from "@/lib/context/site-logo-provider";
import { resolveSiteLogosFromRequest } from "@/lib/site-logos-server";
import { getCachedShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { getSiteConfig, type SiteConfig } from "@/lib/site-config";
import { Analytics } from "@vercel/analytics/react";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { InternalDeviceMarker } from "@/components/analytics/internal-device-marker";

const defaultOpenGraphImages: NonNullable<
  Metadata["openGraph"]
>["images"] = [
  {
    url: "https://pactwines.com/pact-og-uploaded.jpg",
    width: 1200,
    height: 630,
    alt: "PACT Wines — Naturvin direkt från Languedoc",
  },
];

function buildRootOpenGraph(config: SiteConfig): Metadata["openGraph"] {
  return {
    siteName: config.siteName,
    locale: "sv_SE",
    type: "website",
    images: defaultOpenGraphImages,
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
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();

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
 * Root Layout Component for ACME Store
 *
 * This is the main layout component that wraps the entire application.
 * It provides essential providers and global functionality including:
 * - Shopify e-commerce integration with cart management
 * - Font configuration with Geist Sans and Mono
 * - Toast notifications for user feedback
 * - URL state management with nuqs
 * - Development debugging tools
 * - v0 environment detection and setup
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const ssrPathname = requestHeaders.get("x-pathname")?.trim() || "/";
  const needsVaulDrawerWrapper = pathnameNeedsVaulDrawerWrapper(ssrPathname);
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  const [collections, isDirtywineSite, shoppingContext, siteLogos] =
    await Promise.all([
      getCachedShopCollections().catch((error) => {
        console.warn("Failed to fetch collections in root layout:", error);
        return [] as Awaited<ReturnType<typeof getCachedShopCollections>>;
      }),
      getIsDirtywineSiteFromHeaders(),
      getCachedShoppingContextFromRequest({
        skipUser:
          isPublicAppPath(ssrPathname) &&
          !publicPathUsesUserShoppingContext(ssrPathname),
      }).catch((error) => {
        console.warn("Failed to resolve shopping context in layout:", error);
        return fallbackShoppingContext();
      }),
      resolveSiteLogosFromRequest({ host }).catch((error) => {
        console.warn("Failed to resolve site logos in layout:", error);
        return {
          headerLogo: null as string | null,
          footerLogo: null as string | null,
        };
      }),
    ]);

  return (
    <html lang={shoppingContext.locale} suppressHydrationWarning>
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
        <B2BModeProvider isB2B={isDirtywineSite}>
          <SiteLogoProvider initialLogos={siteLogos}>
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
                          {...(needsVaulDrawerWrapper
                            ? { "data-vaul-drawer-wrapper": "true" }
                            : {})}
                        >
                          <VaulDrawerAttributeSync ssrPathname={ssrPathname} />
                          <ConditionalHeaderServer
                            collections={collections}
                            ssrPathname={ssrPathname}
                            initialLogos={siteLogos}
                          />
                          {children}
                        </div>
                      </div>
                      {isDevelopment && <DebugGrid />}
                      <Toaster closeButton position="bottom-right" />
                      <InternalDeviceMarker />
                      <PageViewTracker />
                      <Analytics />
                    </MembershipProvider>
                  </PortalProvider>
                </MobileMenuProvider>
                {isV0 && <V0SetupLoader />}
              </V0Provider>
            </OnboardingProvider>
          </CartProvider>
          </ShoppingContextProvider>
          </SiteLogoProvider>
        </B2BModeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
