import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { DebugGrid } from "@/components/debug-grid";
import { isDevelopment } from "@/lib/constants";
import { V0Provider } from "@/lib/context";
import { cn } from "@/lib/utils";

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

export const metadata: Metadata = {
  title: "Pact Wines",
  description: "Premium wine collection - curated selections for wine enthusiasts.",
  generator: "Next.js",
};

export default async function AccessRequestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <NuqsAdapter>
            <main data-vaul-drawer-wrapper="true">
              {children}
            </main>
            {isDevelopment && <DebugGrid />}
            <Toaster closeButton position="bottom-right" />
          </NuqsAdapter>
        </V0Provider>
        {isV0 && <V0Setup />}
      </body>
    </html>
  );
}
