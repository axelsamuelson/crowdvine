"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Routes that use vaul Drawer and need the scale-background wrapper. */
export function pathnameNeedsVaulDrawerWrapper(pathname: string): boolean {
  const isAdminRoute = pathname.startsWith("/admin");
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

  return (
    !isAdminRoute &&
    !isAccessRequestRoute &&
    !isCheckoutSuccessRoute &&
    !isLogInRoute &&
    !isMapTopoRoute &&
    !isInvitationRoute &&
    !isSignupRoute &&
    !isOnboardingRoute
  );
}

/**
 * Wraps content in the vaul drawer wrapper only on routes that use Drawer.
 * {@link ssrPathname} must match the request path from middleware so SSR HTML
 * matches the client's first paint (avoids hydration mismatch).
 */
export function VaulDrawerWrapper({
  children,
  ssrPathname,
}: {
  children: React.ReactNode;
  ssrPathname: string;
}) {
  const pathname = usePathname();
  const [needsVaulWrapper, setNeedsVaulWrapper] = useState(() =>
    pathnameNeedsVaulDrawerWrapper(ssrPathname),
  );

  useEffect(() => {
    setNeedsVaulWrapper(
      pathnameNeedsVaulDrawerWrapper(pathname ?? ssrPathname),
    );
  }, [pathname, ssrPathname]);

  return (
    <div
      data-vaul-drawer-wrapper={needsVaulWrapper ? "true" : undefined}
      className={needsVaulWrapper ? undefined : "contents"}
    >
      {children}
    </div>
  );
}
