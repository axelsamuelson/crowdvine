import { z } from "zod";

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;
const WEBSITE_URL = /^https?:\/\/[^\s]+$/i;

function blankToNull(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Trim, drop a leading @, lowercase, and pull the handle out of an instagram.com URL. */
export function normalizeInstagramHandle(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  const looksLikeUrl =
    /^https?:\/\//i.test(value) || /^(?:www\.)?instagram\.com\//i.test(value);

  if (looksLikeUrl) {
    const withProtocol = /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;
    try {
      const url = new URL(withProtocol);
      if (/^(?:www\.)?instagram\.com$/i.test(url.hostname)) {
        const segment = url.pathname.split("/").filter(Boolean)[0] ?? "";
        value = decodeURIComponent(segment);
      }
    } catch {
      return null;
    }
  }

  value = value.replace(/^@+/, "").toLowerCase();
  value = value.split(/[/?#\s]/)[0] ?? "";
  return value.length > 0 ? value : null;
}

export const websiteUrlSchema = z.preprocess(
  blankToNull,
  z
    .string()
    .url()
    .regex(/^https?:\/\//, "Webbadressen måste börja med http:// eller https://")
    .nullable(),
);

export const instagramHandleSchema = z.preprocess(
  (value: unknown) => {
    if (value == null) return null;
    if (typeof value !== "string") return value;
    return normalizeInstagramHandle(value);
  },
  z
    .string()
    .regex(
      INSTAGRAM_HANDLE,
      "Instagram-handtaget får bara innehålla a–z, 0–9, punkt och understreck (max 30 tecken).",
    )
    .nullable(),
);

export const producerLinksInputSchema = z.object({
  website_url: websiteUrlSchema.optional(),
  instagram_handle: instagramHandleSchema.optional(),
  mark_links_verified: z.boolean().optional(),
});

export type ParsedProducerLinks = {
  website_url?: string | null;
  instagram_handle?: string | null;
  mark_links_verified: boolean;
};

export function parseProducerLinkFields(
  body: Record<string, unknown>,
): { ok: true; links: ParsedProducerLinks } | { ok: false; message: string } {
  const slice: {
    website_url?: unknown;
    instagram_handle?: unknown;
    mark_links_verified?: unknown;
  } = {};
  if ("website_url" in body) slice.website_url = body.website_url;
  if ("instagram_handle" in body) slice.instagram_handle = body.instagram_handle;
  if ("mark_links_verified" in body) {
    slice.mark_links_verified = body.mark_links_verified;
  }

  const parsed = producerLinksInputSchema.safeParse(slice);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Ogiltig webbplats eller Instagram.";
    return { ok: false, message };
  }

  const links: ParsedProducerLinks = {
    mark_links_verified: parsed.data.mark_links_verified === true,
  };
  if ("website_url" in body) links.website_url = parsed.data.website_url ?? null;
  if ("instagram_handle" in body) {
    links.instagram_handle = parsed.data.instagram_handle ?? null;
  }
  return { ok: true, links };
}

/** Hostname without protocol and without a leading www. */
export function websiteDisplayLabel(url: string): string | null {
  if (!WEBSITE_URL.test(url)) return null;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    return hostname.length > 0 ? hostname : null;
  } catch {
    return null;
  }
}

export function instagramProfileUrl(
  handle: string | null | undefined,
): string | null {
  if (!handle || !INSTAGRAM_HANDLE.test(handle)) return null;
  return `https://www.instagram.com/${handle}/`;
}
