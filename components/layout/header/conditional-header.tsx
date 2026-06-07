"use client";

import { usePathname } from "next/navigation";
import { Header } from "./index";
import { Collection } from "@/lib/shopify/types";
import type { SiteLogos } from "@/lib/context/site-logo-provider";

interface ConditionalHeaderProps {
  collections: Collection[];
  isDirtywineSite: boolean;
  initialLogos?: SiteLogos;
  /** Request pathname from middleware — keeps SSR and hydration aligned. */
  ssrPathname: string;
}

function shouldHideHeader(pathname: string): boolean {
  const isAdminRoute = pathname.startsWith("/admin");
  const isAccessRequestRoute = pathname === "/access-request";
  const isCheckoutSuccessRoute = pathname === "/checkout/success";
  const isLogInRoute = pathname === "/log-in";
  const isMapTopoRoute = pathname === "/map-topo";
  const isTastingRoute = pathname.startsWith("/tasting");
  const isInvitationRoute =
    pathname.startsWith("/i/") ||
    pathname.startsWith("/ib/") ||
    pathname.startsWith("/b/") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/c/");
  const isSignupRoute = pathname === "/signup";
  const isOnboardingRoute = pathname === "/onboarding";

  return (
    isTastingRoute ||
    isAdminRoute ||
    isAccessRequestRoute ||
    isCheckoutSuccessRoute ||
    isLogInRoute ||
    isMapTopoRoute ||
    isInvitationRoute ||
    isSignupRoute ||
    isOnboardingRoute
  );
}

export function ConditionalHeader({
  collections,
  isDirtywineSite,
  initialLogos,
  ssrPathname,
}: ConditionalHeaderProps) {
  const pathname = usePathname();
  const activePathname = pathname || ssrPathname;

  if (shouldHideHeader(activePathname)) {
    return null;
  }

  return (
    <Header
      collections={collections}
      isDirtywineSite={isDirtywineSite}
      initialLogos={initialLogos}
    />
  );
}
