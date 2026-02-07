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

/** Same as getAppUrl – for NEXT_PUBLIC_SITE_URL usage. */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;
  return getAppUrl();
}
