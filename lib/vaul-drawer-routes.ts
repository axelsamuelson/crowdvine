export const VAUL_DRAWER_WRAPPER_ID = "vaul-drawer-wrapper";

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
  const isHowItWorksRoute = pathname === "/how-it-works";

  return (
    !isAdminRoute &&
    !isAccessRequestRoute &&
    !isCheckoutSuccessRoute &&
    !isLogInRoute &&
    !isMapTopoRoute &&
    !isInvitationRoute &&
    !isSignupRoute &&
    !isOnboardingRoute &&
    !isHowItWorksRoute
  );
}
