/**
 * Pure helpers for shared-pallet guest checkout auth UX.
 * Kept free of React / Next so unit tests can pin flag × platformOpen × SE.
 */

export function isSwedishGuestCheckoutMarket(
  countryCode: string | null | undefined,
): boolean {
  return String(countryCode ?? "")
    .trim()
    .toUpperCase() === "SE";
}

export type GuestCheckoutAuthPath = {
  /** Skip CheckoutEmailAuth / login_wall entirely. */
  skipLoginWall: boolean;
  /** Run silent /api/checkout/ensure-session after delivery email. */
  useEnsureSession: boolean;
  /** Show CheckoutEmailAuth (legacy closed-platform path). */
  showLoginWall: boolean;
};

/**
 * Decide mid-checkout auth UX for shared-pallet producer items.
 *
 * Flag OFF → unchanged: wall when !platformOpen; ensure-session when platformOpen.
 * Flag ON + SE → never show login wall; always use ensure-session when anonymous.
 * Flag ON + country unknown → suppress wall (avoid OTP flash) and try ensure-session;
 *   API still rejects explicit non-SE when PLATFORM_OPEN is false.
 * Flag ON + non-SE → same as flag OFF (SE-only guest path).
 */
export function resolveGuestCheckoutAuthPath(opts: {
  guestCheckoutEnabled: boolean;
  platformOpen: boolean;
  countryCode: string | null | undefined;
  authReady: boolean;
}): GuestCheckoutAuthPath {
  const country = String(opts.countryCode ?? "").trim();
  const countryUnknown = opts.guestCheckoutEnabled && !country;
  const swedish =
    opts.guestCheckoutEnabled &&
    (countryUnknown || isSwedishGuestCheckoutMarket(country));
  const useEnsureSession = opts.platformOpen || swedish;
  const showLoginWall = !opts.authReady && !useEnsureSession;
  return {
    skipLoginWall: useEnsureSession || opts.authReady,
    useEnsureSession: !opts.authReady && useEnsureSession,
    showLoginWall,
  };
}

/** True when a profile is still an unclaimed guest checkout identity. */
export function isUnclaimedGuestProfile(opts: {
  guestCheckoutAt: string | null | undefined;
  accountClaimedAt: string | null | undefined;
}): boolean {
  return Boolean(opts.guestCheckoutAt) && !opts.accountClaimedAt;
}
