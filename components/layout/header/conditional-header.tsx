"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./index";
import { CheckoutMinimalHeader } from "./checkout-minimal-header";
import { Collection } from "@/lib/shopify/types";
import type { SiteLogos } from "@/lib/context/site-logo-provider";

interface ConditionalHeaderProps {
  collections: Collection[];
  popularCollections: Collection[];
  isDirtywineSite: boolean;
  initialLogos?: SiteLogos;
  /** Request pathname from middleware — keeps SSR and hydration aligned. */
  ssrPathname: string;
}

function shouldHideHeader(
  pathname: string,
  isDirtywineSite: boolean,
): boolean {
  const isAdminRoute = pathname.startsWith("/admin");
  const isAccessRequestRoute = pathname === "/access-request";
  const isLogInRoute = pathname === "/log-in";
  const isMapTopoRoute = pathname === "/map-topo";
  const isTastingRoute = pathname.startsWith("/tasting");
  const isInvitationRoute =
    pathname.startsWith("/i/") ||
    pathname.startsWith("/ib/") ||
    pathname.startsWith("/b/") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/c/");
  // Dirty Wine open sign-up keeps the site header + logo; PACT token signup stays chrome-free.
  const isSignupRoute = pathname === "/signup" && !isDirtywineSite;

  return (
    isTastingRoute ||
    isAdminRoute ||
    isAccessRequestRoute ||
    isLogInRoute ||
    isMapTopoRoute ||
    isInvitationRoute ||
    isSignupRoute
  );
}

export function ConditionalHeader({
  collections,
  popularCollections,
  isDirtywineSite,
  initialLogos,
  ssrPathname,
}: ConditionalHeaderProps) {
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const activePathname = hasMounted ? pathname || ssrPathname : ssrPathname;

  // Checkout form + confirmation: logo + back-to-cart only (no site nav).
  // /en/checkout is rewritten to /checkout but the browser path stays /en/….
  const isCheckoutChromeRoute =
    activePathname === "/checkout" ||
    activePathname === "/en/checkout" ||
    activePathname === "/checkout/success" ||
    activePathname === "/en/checkout/success" ||
    activePathname.startsWith("/checkout/stripe-return") ||
    activePathname.startsWith("/en/checkout/stripe-return");

  if (isCheckoutChromeRoute) {
    return <CheckoutMinimalHeader initialLogos={initialLogos} />;
  }

  if (shouldHideHeader(activePathname, isDirtywineSite)) {
    return null;
  }

  return (
    <Header
      collections={collections}
      popularCollections={popularCollections}
      isDirtywineSite={isDirtywineSite}
      initialLogos={initialLogos}
    />
  );
}
