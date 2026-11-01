/**
 * Dirtywine.se open sign-up (no invite / no approval).
 * pactwines.com membership/invite flow is unchanged.
 */

import {
  isDirtywineHost,
  type PortalSearchParams,
} from "@/lib/b2b-site";

export const B2B_OPEN_SIGNUP_PATH = "/signup";

export const B2B_OPEN_SIGNUP_COPY = {
  sv: {
    heading: "Skapa konto",
    body: "Spara dina förfrågningar och fakturor på ett ställe.",
    cta: "Skapa konto",
    nameLabel: "Namn",
    namePlaceholder: "Ditt namn eller företagsnamn",
    emailLabel: "E-postadress",
    emailPlaceholder: "Ange din e-post",
    passwordLabel: "Lösenord",
    passwordPlaceholder: "Skapa ett lösenord",
    confirmPasswordLabel: "Bekräfta lösenord",
    confirmPasswordPlaceholder: "Bekräfta ditt lösenord",
    submit: "Skapa konto",
    submitting: "Skapar konto…",
    alreadyHaveAccount: "Har du redan ett konto?",
    signIn: "Logga in",
    passwordMismatch: "Lösenorden matchar inte",
    genericError: "Kunde inte skapa kontot. Försök igen.",
    success: "Kontot är skapat. Omdirigerar…",
  },
  en: {
    heading: "Create account",
    body: "Keep your inquiries and invoices in one place.",
    cta: "Create account",
    nameLabel: "Name",
    namePlaceholder: "Your name or company name",
    emailLabel: "Email address",
    emailPlaceholder: "Enter your email",
    passwordLabel: "Password",
    passwordPlaceholder: "Create a password",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Confirm your password",
    submit: "Create account",
    submitting: "Creating account…",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Log in",
    passwordMismatch: "Passwords do not match",
    genericError: "Could not create the account. Please try again.",
    success: "Account created. Redirecting…",
  },
} as const;

export type B2bOpenSignupLocale = keyof typeof B2B_OPEN_SIGNUP_COPY;

export function b2bOpenSignupCopy(locale: B2bOpenSignupLocale = "sv") {
  return B2B_OPEN_SIGNUP_COPY[locale] ?? B2B_OPEN_SIGNUP_COPY.sv;
}

/** Same URL slug as PACT signup; Dirty Wine mode is host-gated. */
export function b2bOpenSignupHref(nextPath?: string | null): string {
  const next = sanitizeOpenSignupNext(nextPath);
  if (!next || next === "/") return B2B_OPEN_SIGNUP_PATH;
  return `${B2B_OPEN_SIGNUP_PATH}?next=${encodeURIComponent(next)}`;
}

/**
 * Only allow same-origin relative paths (no protocol-relative / open redirects).
 */
export function sanitizeOpenSignupNext(
  next: string | null | undefined,
): string | null {
  if (typeof next !== "string") return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  if (trimmed.includes("\\")) return null;
  return trimmed;
}

export function requestHostFromHeaders(headers: Headers): string | null {
  return headers.get("x-forwarded-host") ?? headers.get("host");
}

function searchParamsFromReferer(
  referer: string | null,
): PortalSearchParams | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    return url.searchParams;
  } catch {
    return null;
  }
}

/** True when this request is Dirty Wine / B2B (production host or local ?b2b=1). */
export function isDirtywineOpenSignupRequest(request: Request): boolean {
  const host = requestHostFromHeaders(request.headers);
  const searchParams = searchParamsFromReferer(
    request.headers.get("referer"),
  );
  return isDirtywineHost(host, searchParams);
}
