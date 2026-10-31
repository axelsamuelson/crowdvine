"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./index";
import { Collection } from "@/lib/shopify/types";
import { isDirtywineHost } from "@/lib/b2b-site";

interface ConditionalHeaderProps {
  collections: Collection[];
  popularCollections: Collection[];
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
  popularCollections,
}: ConditionalHeaderProps) {
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);
  const [isDirtywineSite, setIsDirtywineSite] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    setIsDirtywineSite(
      isDirtywineHost(
        window.location.hostname,
        new URLSearchParams(window.location.search),
      ),
    );
  }, [pathname]);

  // Before mount, assume public chrome (header visible). Hide routes remount client-side.
  const activePathname = hasMounted ? pathname || "/" : "/";

  if (shouldHideHeader(activePathname)) {
    return null;
  }

  return (
    <Header
      collections={collections}
      popularCollections={popularCollections}
      isDirtywineSite={isDirtywineSite}
    />
  );
}
