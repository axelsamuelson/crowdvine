/** sessionStorage key for the one-time guest claim token after submit. */
export const B2B_INQUIRY_CLAIM_TOKEN_KEY = "dw_b2b_inquiry_claim_token";

export function storeB2bInquiryClaimToken(token: string): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(B2B_INQUIRY_CLAIM_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function readB2bInquiryClaimToken(): string | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage.getItem(B2B_INQUIRY_CLAIM_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearB2bInquiryClaimToken(): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem(B2B_INQUIRY_CLAIM_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Login/signup return target that triggers claim on the inquiry page. */
export function b2bInquiryClaimReturnHref(): string {
  return "/b2b/inquiry?claimed=1";
}

export function b2bInquiryAccountLoginHref(email?: string): string {
  const next = encodeURIComponent(b2bInquiryClaimReturnHref());
  const base = `/log-in?next=${next}`;
  const trimmed = email?.trim();
  if (!trimmed) return base;
  return `${base}&email=${encodeURIComponent(trimmed)}`;
}

export function b2bInquiryAccountSignupHref(email?: string): string {
  // Dirtywine open signup uses OTP on the confirmation page; this href is a
  // fallback for password accounts via log-in with claim return.
  return b2bInquiryAccountLoginHref(email);
}
