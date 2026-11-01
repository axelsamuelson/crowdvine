/** Existing login flow with return to the inquiry form after auth. */
export const B2B_INQUIRY_PATH = "/b2b/inquiry";

/** Guest continues past the login/guest choice step. */
export const B2B_INQUIRY_GUEST_PATH = `${B2B_INQUIRY_PATH}?guest=1`;

export function b2bInquiryLoginHref(inquiryPath: string = B2B_INQUIRY_PATH): string {
  return `/log-in?next=${encodeURIComponent(inquiryPath)}`;
}

export function isB2bInquiryGuestMode(
  searchParams: { get(name: string): string | null } | null | undefined,
): boolean {
  return searchParams?.get("guest") === "1";
}
