/** Paths that do not require login (aligned with middleware PUBLIC list). */
const PUBLIC_PATH_PREFIXES = [
  "/",
  "/log-in",
  "/signup",
  "/invite-signup",
  "/code-signup",
  "/access-request",
  "/access-pending",
  "/shop",
  "/product",
  "/producer",
  "/producers",
  "/about",
  "/i",
  "/ib",
  "/b",
  "/p",
  "/c",
  "/profile",
  "/pallet",
  "/reset-password",
  "/auth/callback",
  "/auth/auth-code-error",
  "/forgot-password",
  "/tasting",
  "/dev",
] as const;

export function isPublicAppPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
