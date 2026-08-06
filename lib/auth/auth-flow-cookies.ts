/**
 * Small client helpers for mid-checkout / magic-link auth cookies.
 *
 * IMPORTANT — shared single-use OTP token:
 * Supabase email OTP sends ONE token that powers BOTH the magic link and the
 * 6-digit code. Clicking the link hits Supabase's verify endpoint and consumes
 * that token (then redirects with ?code= for PKCE). After that, the 6-digit
 * code from the same email is dead. Never assume link and code are independent;
 * on link failure always request a NEW OTP before asking the user to type a code.
 */

export const AUTH_NEXT_COOKIE = "cv_auth_next";
export const AUTH_EMAIL_COOKIE = "cv_auth_email";

function secureAttr(): string {
  return typeof window !== "undefined" && window.location.protocol === "https:"
    ? "; Secure"
    : "";
}

export function setAuthNextCookie(path: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(path)}; Path=/; Max-Age=3600; SameSite=Lax${secureAttr()}`;
}

export function setAuthEmailCookie(email: string): void {
  if (typeof document === "undefined") return;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return;
  document.cookie = `${AUTH_EMAIL_COOKIE}=${encodeURIComponent(trimmed)}; Path=/; Max-Age=3600; SameSite=Lax${secureAttr()}`;
}

export function readAuthCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const s = part.trim();
    if (s.startsWith(prefix)) {
      try {
        return decodeURIComponent(s.slice(prefix.length));
      } catch {
        return s.slice(prefix.length);
      }
    }
  }
  return null;
}

export function clearAuthEmailCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_EMAIL_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function clearAuthNextCookieClient(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
