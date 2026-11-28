"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./index";
import { CheckoutMinimalHeader } from "./checkout-minimal-header";
import { isDirtywineHost } from "@/lib/b2b-site";
import type { MegaMenuColumn } from "@/lib/nav/shop-mega-menu";
import type { ShopNavLink } from "@/lib/nav/shop-submenu";
import type { HeaderProducerLink } from "@/lib/shop/shop-producer-link";

interface ConditionalHeaderProps {
  popularCollections: HeaderProducerLink[];
  shopSubmenu: { sv: ShopNavLink[]; en: ShopNavLink[] };
  shopMega: { sv: MegaMenuColumn[]; en: MegaMenuColumn[] };
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
  popularCollections,
  shopSubmenu,
  shopMega,
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

  const activePathname = hasMounted ? pathname || "/" : "/";

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
    return <CheckoutMinimalHeader />;
  }

  if (shouldHideHeader(activePathname, isDirtywineSite)) {
    return null;
  }

  return (
    <Header
      popularCollections={popularCollections}
      shopSubmenu={shopSubmenu}
      shopMega={shopMega}
      isDirtywineSite={isDirtywineSite}
    />
  );
}
