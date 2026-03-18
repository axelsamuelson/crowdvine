"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps content in the vaul drawer wrapper only on routes that use Drawer (shop, etc.).
 * Omitting the wrapper on admin/tasting/etc. avoids hydration mismatch:
 * vaul can inject data-vaul-drawer-wrapper on the client; we must not have that div on admin.
 */
export function VaulDrawerWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isTastingRoute = pathname.startsWith("/tasting");
  const isAccessRequestRoute = pathname === "/access-request";
  const isCheckoutSuccessRoute = pathname === "/checkout/success";
  const isLogInRoute = pathname === "/log-in";
  const isMapTopoRoute = pathname === "/map-topo";
  const isInvitationRoute =
    pathname.startsWith("/i/") ||
    pathname.startsWith("/ib/") ||
    pathname.startsWith("/b/") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/c/");
  const isSignupRoute = pathname === "/signup";
  const isOnboardingRoute = pathname === "/onboarding";

  const needsVaulWrapper =
    !isAdminRoute &&
    !isTastingRoute &&
    !isAccessRequestRoute &&
    !isCheckoutSuccessRoute &&
    !isLogInRoute &&
    !isMapTopoRoute &&
    !isInvitationRoute &&
    !isSignupRoute &&
    !isOnboardingRoute;

  if (needsVaulWrapper) {
    return <div data-vaul-drawer-wrapper="true">{children}</div>;
  }
  return <>{children}</>;
}
