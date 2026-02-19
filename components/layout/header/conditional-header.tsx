"use client";

import { usePathname } from "next/navigation";
import { Header } from "./index";
import { LogoOnlyHeader } from "./logo-only-header";
import { Collection } from "@/lib/shopify/types";

interface ConditionalHeaderProps {
  collections: Collection[];
}

export function ConditionalHeader({ collections }: ConditionalHeaderProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isAccessRequestRoute = pathname === "/access-request";
  const isCheckoutSuccessRoute = pathname === "/checkout/success";
  const isLogInRoute = pathname === "/log-in";
  const isMapTopoRoute = pathname === "/map-topo";
  const isTastingRoute = pathname.startsWith("/tasting");
  const isInvitationRoute =
    pathname.startsWith("/i/") || pathname.startsWith("/ib/") || pathname.startsWith("/b/") || pathname.startsWith("/p/") || pathname.startsWith("/c/");
  const isSignupRoute = pathname === "/signup";
  const isOnboardingRoute = pathname === "/onboarding";
  if (isTastingRoute) {
    return <LogoOnlyHeader />;
  }

  if (
    isAdminRoute ||
    isAccessRequestRoute ||
    isCheckoutSuccessRoute ||
    isLogInRoute ||
    isMapTopoRoute ||
    isInvitationRoute ||
    isSignupRoute ||
    isOnboardingRoute
  ) {
    return null;
  }

  return <Header collections={collections} />;
}
