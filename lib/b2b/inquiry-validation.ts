export type B2bInquiryFormInput = {
  companyName: string;
  organizationNumber: string;
  contactName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  postalCode: string;
  desiredDeliveryDate: string;
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

export type B2bInquiryValidationError =
  | "honeypot"
  | "required"
  | "email"
  | "postal_code"
  | "phone"
  | "org_number"
  | "delivery_date"
  | "lines"
  | "producer_blocked";

export type B2bInquiryNormalized = {
  companyName: string;
  organizationNumber: string;
  contactName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  postalCode: string;
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

export function isValidDeliveryDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const d = new Date(`${raw}T12:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export function validateB2bInquiryForm(
  input: B2bInquiryFormInput,
):
  | { ok: true; value: B2bInquiryNormalized }
  | { ok: false; error: B2bInquiryValidationError } {
  if (trim(input.website).length > 0) {
    return { ok: false, error: "honeypot" };
  }

  const companyName = trim(input.companyName);
  const organizationNumber = trim(input.organizationNumber);
  const contactName = trim(input.contactName);
  const email = trim(input.email).toLowerCase();
  const phone = trim(input.phone);
  const deliveryAddress = trim(input.deliveryAddress);
  const postalCode = trim(input.postalCode).replace(/\s/g, "");
  const desiredDeliveryDate = trim(input.desiredDeliveryDate);
  const message = trim(input.message) || null;

  if (
    !companyName ||
    !organizationNumber ||
    !contactName ||
    !email ||
    !phone ||
    !deliveryAddress ||
    !postalCode ||
    !desiredDeliveryDate
  ) {
    return { ok: false, error: "required" };
  }

  if (!isValidEmail(email)) return { ok: false, error: "email" };
  if (!isValidSwedishPostalCode(postalCode)) {
    return { ok: false, error: "postal_code" };
  }
  if (!isValidPhone(phone)) return { ok: false, error: "phone" };
  if (!isValidSwedishOrgNumber(organizationNumber)) {
    return { ok: false, error: "org_number" };
  }
  if (!isValidDeliveryDate(desiredDeliveryDate)) {
    return { ok: false, error: "delivery_date" };
  }

  const linesRaw = Array.isArray(input.lines) ? input.lines : [];
  const lines: B2bInquiryNormalized["lines"] = [];
  for (const line of linesRaw) {
    const wineId = trim(line?.wineId);
    const quantity = Number(line?.quantity);
    if (!wineId || !Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: "lines" };
    }
    lines.push({
      wineId,
      quantity,
      wineTitle: trim(line?.wineTitle) || wineId,
      unitPriceCents:
        line?.unitPriceCents != null && Number.isFinite(Number(line.unitPriceCents))
          ? Math.max(0, Math.round(Number(line.unitPriceCents)))
          : null,
    });
  }
  if (lines.length === 0) return { ok: false, error: "lines" };

  return {
    ok: true,
    value: {
      companyName,
      organizationNumber: organizationNumber.replace(/[\s]/g, ""),
      contactName,
      email,
      phone,
      deliveryAddress,
      postalCode,
      desiredDeliveryDate,
      message,
      lines,
    },
  };
}
