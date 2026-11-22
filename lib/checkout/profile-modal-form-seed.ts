import type { ZoneDeliveryLines } from "@/lib/checkout/user-zone-delivery-template";

/** Form fields used by checkout ProfileInfoModal. */
export type ProfileModalFormSeed = {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  region: string;
};

const emptySeed = (): ProfileModalFormSeed => ({
  full_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postal_code: "",
  country: "SE",
  region: "",
});

function pickTrim(...vals: Array<string | null | undefined>): string {
  for (const v of vals) {
    const t = (v ?? "").trim();
    if (t) return t;
  }
  return "";
}

/**
 * Seed ProfileInfoModal from the checkout delivery already shown to the guest.
 *
 * Camille (prod 22/11): guest Ändra opened ProfileInfoModal, which fetched
 * `/api/user/profile` (empty / 401) and left name/email/phone blank despite a
 * filled checkout draft — then incomplete-profile toasts and wiped fields.
 */
export function seedProfileModalFormFromDelivery(
  lines: ZoneDeliveryLines | null | undefined,
  fallbackPostal?: string | null,
): ProfileModalFormSeed {
  if (!lines) {
    const postal = pickTrim(fallbackPostal).replace(/\s+/g, "");
    return { ...emptySeed(), postal_code: postal };
  }
  return {
    full_name: pickTrim(lines.fullName),
    email: pickTrim(lines.email),
    phone: pickTrim(lines.phone),
    address: pickTrim(lines.street),
    city: pickTrim(lines.city),
    postal_code: pickTrim(lines.postal, fallbackPostal).replace(/\s+/g, ""),
    country: pickTrim(lines.countryCode, "SE").toUpperCase().slice(0, 2) || "SE",
    region: pickTrim(lines.regionCode),
  };
}

/**
 * Prefill for inline address "Ändra" edit mode: prefer currently shown
 * effective lines / draft over a zone row that may lack contact.
 */
export function buildCheckoutEditDeliveryDraft(args: {
  zoneLines: ZoneDeliveryLines | null;
  deliveryDraft: ZoneDeliveryLines | null;
  effectiveDelivery: ZoneDeliveryLines | null;
  profile?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}): ZoneDeliveryLines {
  const { zoneLines, deliveryDraft, effectiveDelivery, profile } = args;
  const street = pickTrim(
    deliveryDraft?.street,
    effectiveDelivery?.street,
    zoneLines?.street,
  );
  const city = pickTrim(
    deliveryDraft?.city,
    effectiveDelivery?.city,
    zoneLines?.city,
  );
  const postal = pickTrim(
    deliveryDraft?.postal,
    effectiveDelivery?.postal,
    zoneLines?.postal,
  ).replace(/\s+/g, "");
  const countryCode =
    pickTrim(
      deliveryDraft?.countryCode,
      effectiveDelivery?.countryCode,
      zoneLines?.countryCode,
      "SE",
    )
      .toUpperCase()
      .slice(0, 2) || "SE";
  const regionCode =
    deliveryDraft?.regionCode ??
    effectiveDelivery?.regionCode ??
    zoneLines?.regionCode ??
    null;
  const fullName =
    pickTrim(
      deliveryDraft?.fullName,
      effectiveDelivery?.fullName,
      zoneLines?.fullName,
      profile?.full_name,
    ) || null;
  const email =
    pickTrim(
      deliveryDraft?.email,
      effectiveDelivery?.email,
      zoneLines?.email,
      profile?.email,
    ) || null;
  const phone =
    pickTrim(
      deliveryDraft?.phone,
      effectiveDelivery?.phone,
      zoneLines?.phone,
      profile?.phone,
    ) || null;
  return {
    street,
    city,
    postal,
    countryCode,
    regionCode,
    fullName,
    phone,
    email,
  };
}
