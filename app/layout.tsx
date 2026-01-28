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
import { Header } from "../components/layout/header";
import { ConditionalHeader } from "../components/layout/header/conditional-header";
import dynamic from "next/dynamic";
import { V0Provider } from "@/lib/context";
import { MobileMenuProvider } from "../components/layout/header/mobile-menu-context";
import { MembershipProvider } from "@/lib/context/membership-context";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { B2BProvider } from "@/lib/context/b2b-context";
import { cn } from "../lib/utils";

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

  return (
    <html lang="en">
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "antialiased min-h-screen",
          { "is-v0": isV0 },
        )}
        suppressHydrationWarning
      >
        <V0Provider isV0={isV0}>
          <MobileMenuProvider>
            <CartProvider>
              <MembershipProvider>
                <B2BProvider>
                  <OnboardingProvider>
                    <NuqsAdapter>
                      <main data-vaul-drawer-wrapper="true">
                        <ConditionalHeader collections={collections} />
                        {children}
                      </main>
                      {isDevelopment && <DebugGrid />}
                      <Toaster closeButton position="bottom-right" />
                    </NuqsAdapter>
                  </OnboardingProvider>
                </B2BProvider>
              </MembershipProvider>
            </CartProvider>
          </MobileMenuProvider>
          {isV0 && <V0Setup />}
        </V0Provider>
      </body>
    </html>
  );
}
