export type B2bInquiryFormInput = {
  companyName: string;
  organizationNumber: string;
  contactName: string;
  email: string;
  phone?: string;
  deliveryAddress: string;
  postalCode: string;
  city: string;
  desiredDeliveryDate?: string;
  message?: string;
  /** Honeypot — must be empty. */
  website?: string;
  lines: Array<{
    wineId: string;
    quantity: number;
    wineTitle?: string;
    unitPriceCents?: number | null;
  }>;
};

export type B2bInquiryFieldKey =
  | "companyName"
  | "organizationNumber"
  | "contactName"
  | "email"
  | "phone"
  | "deliveryAddress"
  | "postalCode"
  | "city"
  | "desiredDeliveryDate"
  | "lines";

export type B2bInquiryFieldErrors = Partial<
  Record<B2bInquiryFieldKey, B2bInquiryValidationError>
>;

export type B2bInquiryValidationError =
  | "honeypot"
  | "required"
  | "email"
  | "postal_code"
  | "phone"
  | "org_number"
  | "delivery_date"
  | "city"
  | "lines"
  | "producer_blocked";

export type B2bInquiryNormalized = {
  companyName: string;
  organizationNumber: string;
  contactName: string;
  email: string;
  phone: string | null;
  deliveryAddress: string;
  postalCode: string;
  city: string;
  desiredDeliveryDate: string | null;
  message: string | null;
  lines: Array<{
    wineId: string;
    quantity: number;
    wineTitle: string;
    unitPriceCents: number | null;
  }>;
};

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Swedish org number: 10 digits, optional hyphen after 6. */
export function isValidSwedishOrgNumber(raw: string): boolean {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{10}$/.test(digits);
}

export function isValidSwedishPostalCode(raw: string): boolean {
  const digits = raw.replace(/\s/g, "");
  return /^\d{5}$/.test(digits);
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) && raw.length <= 254;
}

export function isValidPhone(raw: string): boolean {
  const cleaned = raw.replace(/[\s()-]/g, "");
  return /^\+?\d{7,15}$/.test(cleaned);
}

/** Optional date: empty ok; otherwise YYYY-MM-DD and on/after minDate (default tomorrow UTC). */
export function isValidDeliveryDate(
  raw: string,
  opts?: { minDate?: string | null },
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const d = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const min = opts?.minDate;
  if (min && raw < min) return false;
  return true;
}

/** Local calendar date YYYY-MM-DD for "tomorrow". */
export function tomorrowDateIso(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Per-field validation for Dirtywine inquiry. Returns all field errors so the
 * UI can show red borders + messages under each invalid field.
 */
export function validateB2bInquiryFields(
  input: B2bInquiryFormInput,
  opts?: { minDeliveryDate?: string | null },
):
  | { ok: true; value: B2bInquiryNormalized }
  | { ok: false; error: "honeypot"; fieldErrors: B2bInquiryFieldErrors }
  | { ok: false; error: "fields"; fieldErrors: B2bInquiryFieldErrors } {
  if (trim(input.website).length > 0) {
    return { ok: false, error: "honeypot", fieldErrors: {} };
  }

  const companyName = trim(input.companyName);
  const organizationNumber = trim(input.organizationNumber);
  const contactName = trim(input.contactName);
  const email = trim(input.email).toLowerCase();
  const phone = trim(input.phone);
  const deliveryAddress = trim(input.deliveryAddress);
  const postalCode = trim(input.postalCode).replace(/\s/g, "");
  const city = trim(input.city);
  const desiredDeliveryDate = trim(input.desiredDeliveryDate);
  const message = trim(input.message) || null;
  const minDeliveryDate = opts?.minDeliveryDate ?? tomorrowDateIso();

  const fieldErrors: B2bInquiryFieldErrors = {};

  if (!companyName) fieldErrors.companyName = "required";
  if (!organizationNumber) fieldErrors.organizationNumber = "required";
  else if (!isValidSwedishOrgNumber(organizationNumber)) {
    fieldErrors.organizationNumber = "org_number";
  }
  if (!contactName) fieldErrors.contactName = "required";
  if (!email) fieldErrors.email = "required";
  else if (!isValidEmail(email)) fieldErrors.email = "email";
  if (phone && !isValidPhone(phone)) fieldErrors.phone = "phone";
  if (!deliveryAddress) fieldErrors.deliveryAddress = "required";
  if (!postalCode) fieldErrors.postalCode = "required";
  else if (!isValidSwedishPostalCode(postalCode)) {
    fieldErrors.postalCode = "postal_code";
  }
  if (!city) fieldErrors.city = "required";
  if (
    desiredDeliveryDate &&
    !isValidDeliveryDate(desiredDeliveryDate, { minDate: minDeliveryDate })
  ) {
    fieldErrors.desiredDeliveryDate = "delivery_date";
  }

  const linesRaw = Array.isArray(input.lines) ? input.lines : [];
  const lines: B2bInquiryNormalized["lines"] = [];
  for (const line of linesRaw) {
    const wineId = trim(line?.wineId);
    const quantity = Number(line?.quantity);
    if (!wineId || !Number.isInteger(quantity) || quantity < 1) {
      fieldErrors.lines = "lines";
      break;
    }
    lines.push({
      wineId,
      quantity,
      wineTitle: trim(line?.wineTitle) || wineId,
      unitPriceCents:
        line?.unitPriceCents != null &&
        Number.isFinite(Number(line.unitPriceCents))
          ? Math.max(0, Math.round(Number(line.unitPriceCents)))
          : null,
    });
  }
  if (lines.length === 0) fieldErrors.lines = "lines";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "fields", fieldErrors };
  }

  return {
    ok: true,
    value: {
      companyName,
      organizationNumber: organizationNumber.replace(/[\s]/g, ""),
      contactName,
      email,
      phone: phone || null,
      deliveryAddress,
      postalCode,
      city,
      desiredDeliveryDate: desiredDeliveryDate || null,
      message,
      lines,
    },
  };
}

/** Back-compat wrapper used by the API route (first error code). */
export function validateB2bInquiryForm(
  input: B2bInquiryFormInput,
  opts?: { minDeliveryDate?: string | null },
):
  | { ok: true; value: B2bInquiryNormalized }
  | { ok: false; error: B2bInquiryValidationError } {
  const result = validateB2bInquiryFields(input, opts);
  if (result.ok) return result;
  if (result.error === "honeypot") return { ok: false, error: "honeypot" };
  const first = Object.values(result.fieldErrors)[0];
  return { ok: false, error: first ?? "required" };
}
