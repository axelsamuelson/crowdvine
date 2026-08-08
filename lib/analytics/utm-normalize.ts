import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

/** Lowercase + spaces → underscores. Keeps UTM values consistent over time. */
export function normalizeUtmValue(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Ensure destination is a path starting with `/` (no origin). */
export function normalizeDestinationPath(raw: string): string {
  let path = raw.trim();
  if (!path) return "/";
  try {
    if (/^https?:\/\//i.test(path)) {
      path = new URL(path).pathname || "/";
    }
  } catch {
    // keep as-is
  }
  if (!path.startsWith("/")) path = `/${path}`;
  // Strip query/hash from destination — UTMs are appended separately
  const q = path.indexOf("?");
  if (q >= 0) path = path.slice(0, q);
  const h = path.indexOf("#");
  if (h >= 0) path = path.slice(0, h);
  return path || "/";
}

export function buildTrackedUrl(input: {
  destination_path: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  origin?: string;
}): string {
  const origin = (input.origin ?? PACT_PUBLIC_ORIGIN).replace(/\/$/, "");
  const path = normalizeDestinationPath(input.destination_path);
  const params = new URLSearchParams();
  params.set("utm_source", normalizeUtmValue(input.utm_source));
  params.set("utm_medium", normalizeUtmValue(input.utm_medium));
  params.set("utm_campaign", normalizeUtmValue(input.utm_campaign));
  return `${origin}${path}?${params.toString()}`;
}

export const UTM_LINK_PRESETS = [
  {
    id: "tiktok_bio",
    label: "TikTok bio",
    utm_source: "tiktok",
    utm_medium: "social",
    utm_campaign: "bio",
  },
  {
    id: "instagram_bio",
    label: "Instagram bio",
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "bio",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    utm_source: "newsletter",
    utm_medium: "email",
    utm_campaign: "",
  },
  {
    id: "b2b_outreach",
    label: "B2B outreach",
    utm_source: "b2b_outreach",
    utm_medium: "email",
    utm_campaign: "",
  },
] as const;
