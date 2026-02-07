/**
 * Base URL for the app. Use this instead of NEXT_PUBLIC_APP_URL directly
 * so that Vercel preview deployments get the correct URL (VERCEL_URL).
 *
 * In Vercel: Set NEXT_PUBLIC_APP_URL only for Production to https://pactwines.com.
 * For Preview, leave it unset – VERCEL_URL is used automatically.
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  if (process.env.NODE_ENV === "production") return "https://pactwines.com";
  return "http://localhost:3000";
}

/**
 * For server-side fetches to own API: use the incoming request's host.
 * Prevents issues when Vercel URL differs from the actual request host.
 */
export async function getAppUrlForRequest(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() not available (e.g. during build)
  }
  return getAppUrl();
}

/** Same as getAppUrl – for NEXT_PUBLIC_SITE_URL usage. */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;
  return getAppUrl();
}
