import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CartProvider } from "@/components/cart/cart-context";
import { DebugGrid } from "@/components/debug-grid";
import { isDevelopment } from "@/lib/constants";
import { getCollections } from "@/lib/shopify";
import { ConditionalHeaderServer } from "../components/layout/header/conditional-header-server";
import { VaulDrawerWrapper } from "@/components/layout/vaul-drawer-wrapper";
import { headers } from "next/headers";
import dynamic from "next/dynamic";
import { V0Provider } from "@/lib/context";
import { MobileMenuProvider } from "../components/layout/header/mobile-menu-context";
import { MembershipProvider } from "@/lib/context/membership-context";
import { PortalProvider } from "@/lib/context/portal-context";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { cn } from "../lib/utils";
import { B2BThemeEffect } from "../components/layout/b2b-theme-effect";

const V0Setup = dynamic(() => import("@/components/v0-setup"));

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
import { isPublicAppPath } from "@/lib/auth/public-paths";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const hasAdminCreds =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!hasAdminCreds) {
      return {
        title: "CrowdVine",
        description: "Premium Wine Community",
        generator: "v0.app",
      };
    }

    const siteTitle = (await getSiteContentByKey("site_title")) || "CrowdVine";
    const siteDescription =
      (await getSiteContentByKey("site_description")) ||
      "Premium Wine Community";

    return {
      title: siteTitle,
      description: siteDescription,
      generator: "v0.app",
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "CrowdVine",
      description: "Premium Wine Community",
      generator: "v0.app",
    };
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
  // Fetch collections for header/navigation
  let collections = [];
  try {
    collections = await getCollections();
  } catch (error) {
    console.warn("Failed to fetch collections in root layout:", error);
    collections = [];
  }

  const isDirtywineSite = await getIsDirtywineSiteFromHeaders();
  const requestHeaders = await headers();
  const ssrPathname = requestHeaders.get("x-pathname")?.trim() || "/";
  let shoppingContext = fallbackShoppingContext();
  try {
    shoppingContext = await getShoppingContextFromRequest({
      skipUser: isPublicAppPath(ssrPathname),
    });
  } catch (error) {
    console.warn("Failed to resolve shopping context in layout:", error);
  }

  return (
    <html lang={shoppingContext.locale}>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "antialiased min-h-screen",
          { "is-v0": isV0 },
        )}
        suppressHydrationWarning
      >
        <B2BModeProvider isB2B={isDirtywineSite}>
          <ShoppingContextProvider initialContext={shoppingContext}>
          <CartProvider>
            <OnboardingProvider>
              <V0Provider isV0={isV0}>
                <MobileMenuProvider>
                  <PortalProvider>
                    <MembershipProvider>
                      <NuqsAdapter>
                      <main>
                        <VaulDrawerWrapper ssrPathname={ssrPathname}>
                          <ConditionalHeaderServer collections={collections} />
                          {children}
                        </VaulDrawerWrapper>
                      </main>
                      {isDevelopment && <DebugGrid />}
                      <Toaster closeButton position="bottom-right" />
                      </NuqsAdapter>
                    </MembershipProvider>
                  </PortalProvider>
                </MobileMenuProvider>
                {isV0 && <V0Setup />}
              </V0Provider>
            </OnboardingProvider>
          </CartProvider>
          </ShoppingContextProvider>
        </B2BModeProvider>
      </body>
    </html>
  );
}
