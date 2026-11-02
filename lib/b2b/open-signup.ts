/**
 * Dirtywine.se open sign-up (no invite / no approval).
 * pactwines.com membership/invite flow is unchanged.
 */

import {
  isForceB2BDevMode,
  isLocalDevHost,
  type PortalSearchParams,
} from "@/lib/b2b-site";

export const B2B_OPEN_SIGNUP_PATH = "/signup";
export const B2B_OPEN_SIGNUP_SOURCE = "dirtywine_open_signup" as const;
export const B2B_OPEN_SIGNUP_MIN_PASSWORD = 8;

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
    passwordPlaceholder: "Minst 8 tecken",
    confirmPasswordLabel: "Bekräfta lösenord",
    confirmPasswordPlaceholder: "Bekräfta ditt lösenord",
    submit: "Skapa konto",
    submitting: "Skapar konto…",
    alreadyHaveAccount: "Har du redan ett konto?",
    signIn: "Logga in",
    passwordMismatch: "Lösenorden matchar inte",
    passwordTooShort: "Lösenordet måste vara minst 8 tecken",
    genericError: "Kunde inte skapa kontot. Försök igen.",
    checkEmailHeading: "Kolla din mejl",
    checkEmailBody:
      "Vi har skickat en bekräftelselänk. Öppna mejlet för att aktivera kontot — sedan kommer du tillbaka dit du var. Du kan fortsätta som ny kund under tiden.",
    checkEmailContinueGuest: "Fortsätt som ny kund",
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
    passwordPlaceholder: "At least 8 characters",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Confirm your password",
    submit: "Create account",
    submitting: "Creating account…",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Log in",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 8 characters",
    genericError: "Could not create the account. Please try again.",
    checkEmailHeading: "Check your email",
    checkEmailBody:
      "We sent a confirmation link. Open the email to activate your account — then you’ll return where you left off. You can continue as a new customer meanwhile.",
    checkEmailContinueGuest: "Continue as new customer",
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

function hostnameOnly(host: string | null): string | null {
  if (!host) return null;
  return host.toLowerCase().split(":")[0] || null;
}

/**
 * Exact host allowlist for Dirty Wine open sign-up (not substring match).
 * Production: dirtywine.se / www.dirtywine.se.
 * Local: localhost / 127.0.0.1 (with ?b2b=1 when available).
 */
export function isExactDirtywineOpenSignupHost(
  host: string | null,
  searchParams?: PortalSearchParams | null,
): boolean {
  const h = hostnameOnly(host);
  if (!h) return false;
  if (h === "dirtywine.se" || h === "www.dirtywine.se") return true;
  if (isLocalDevHost(h)) {
    // Mirror Dirty Wine local mode; without ?b2b=1 localhost is PACT.
    return isForceB2BDevMode(searchParams);
  }
  return false;
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

/** True when this request is Dirty Wine open-signup eligible. */
export function isDirtywineOpenSignupRequest(request: Request): boolean {
  const host = requestHostFromHeaders(request.headers);
  const searchParams = searchParamsFromReferer(
    request.headers.get("referer"),
  );
  return isExactDirtywineOpenSignupHost(host, searchParams);
}
