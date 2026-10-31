/** Existing login flow with return to the inquiry form after auth. */
export const B2B_INQUIRY_PATH = "/b2b/inquiry";

export function b2bInquiryLoginHref(inquiryPath: string = B2B_INQUIRY_PATH): string {
  return `/log-in?next=${encodeURIComponent(inquiryPath)}`;
}
