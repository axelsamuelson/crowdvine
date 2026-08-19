import type { ZoneDeliveryLines } from "@/lib/checkout/user-zone-delivery-template";

/** Snapshot of checkout form fields for abandoned-checkout diagnosis (admin analytics). */
export function deliveryLinesForAnalytics(
  lines: ZoneDeliveryLines | null | undefined,
): Record<string, string | null> {
  if (!lines) {
    return {
      full_name: null,
      email: null,
      phone: null,
      street: null,
      city: null,
      postal: null,
      country_code: null,
      region_code: null,
    };
  }
  const trim = (v: string | null | undefined) => {
    const t = (v ?? "").trim();
    return t.length > 0 ? t : null;
  };
  return {
    full_name: trim(lines.fullName),
    email: trim(lines.email),
    phone: trim(lines.phone),
    street: trim(lines.street),
    city: trim(lines.city),
    postal: trim(lines.postal),
    country_code: trim(lines.countryCode)?.toUpperCase() ?? null,
    region_code: trim(lines.regionCode)?.toUpperCase() ?? null,
  };
}

export function normalizePostalDraft(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, "");
}

export function postalDraftAnalytics(raw: string | null | undefined): {
  postal: string;
  digits: number;
  complete: boolean;
} | null {
  const postal = normalizePostalDraft(raw);
  if (!postal) return null;
  const digits = postal.replace(/\D/g, "").length;
  return {
    postal,
    digits,
    complete: /^\d{5}$/.test(postal),
  };
}

export function emailDomain(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1 || at === e.length - 1) return null;
  return e.slice(at + 1);
}

/** Compact summary for admin event timelines. */
export function formatCheckoutDraftSummary(meta: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof meta.date_of_birth === "string" && meta.date_of_birth.trim()) {
    parts.push(`född ${meta.date_of_birth.trim()}`);
  }
  if (typeof meta.email === "string" && meta.email.trim()) {
    parts.push(meta.email.trim());
  }
  if (typeof meta.full_name === "string" && meta.full_name.trim()) {
    parts.push(meta.full_name.trim());
  }

  const postal = typeof meta.postal === "string" ? meta.postal.trim() : "";
  const postalIncomplete =
    Boolean(postal) &&
    (meta.postal_complete === false || meta.complete === false);
  const loc = (postalIncomplete
    ? [meta.street, meta.city]
    : [meta.street, meta.postal, meta.city]
  )
    .filter((v) => typeof v === "string" && v.trim())
    .join(", ");
  if (loc) parts.push(loc);
  if (postalIncomplete) {
    const digits =
      typeof meta.digits === "number"
        ? meta.digits
        : postal.replace(/\D/g, "").length;
    parts.push(`postnr ${postal} (${digits} siffror, ofullständigt)`);
  } else if (postal && !loc.includes(postal)) {
    parts.push(`postnr ${postal}`);
  }

  if (typeof meta.phone === "string" && meta.phone.trim()) {
    parts.push(meta.phone.trim());
  }
  if (typeof meta.phase === "string" && meta.phase.trim() && parts.length === 0) {
    parts.push(`fas: ${meta.phase}`);
  }
  return parts.join(" · ");
}
