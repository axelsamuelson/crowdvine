/**
 * Cart and checkout line label for member and early-bird discounts.
 * A single early-bird label must not hide a member discount on the same price.
 *
 * SV: "Tidig bokning −20 %" · EN: "Early bird −20 %" (minus + space before %).
 */

export type DiscountLabelLocale = "sv" | "en";

function normalizeDiscountLocale(
  locale?: DiscountLabelLocale | string | null,
): DiscountLabelLocale {
  return String(locale ?? "sv").toLowerCase().startsWith("en") ? "en" : "sv";
}

function formatEarlyBirdPart(
  percent: number,
  locale: DiscountLabelLocale,
): string {
  if (locale === "sv") {
    return `Tidig bokning −${percent} %`;
  }
  return `Early bird −${percent} %`;
}

export function formatCartDiscountLabel(input: {
  memberName?: string | null;
  memberPercent: number;
  earlyBirdPercent: number;
  locale?: DiscountLabelLocale | string | null;
}): string | undefined {
  const parts: string[] = [];
  const memberPercent = Math.round(input.memberPercent);
  const earlyBirdPercent = Math.round(input.earlyBirdPercent);
  const locale = normalizeDiscountLocale(input.locale);

  if (memberPercent > 0) {
    const name = input.memberName?.trim();
    parts.push(name ? `${name} ${memberPercent}%` : `${memberPercent}%`);
  }
  if (earlyBirdPercent > 0) {
    parts.push(formatEarlyBirdPart(earlyBirdPercent, locale));
  }
  if (parts.length === 0) return undefined;
  return parts.join(" · ");
}

/**
 * Remap a server-stamped discountLabel to the active UI locale.
 * CartService may stamp EN while the shopper views SV (or vice versa).
 */
export function localizeCartDiscountLabel(
  label: string | null | undefined,
  locale?: DiscountLabelLocale | string | null,
): string | undefined {
  if (label == null) return undefined;
  const trimmed = label.trim();
  if (!trimmed) return undefined;
  const loc = normalizeDiscountLocale(locale);
  if (loc === "sv") {
    return trimmed
      .replace(/Early[- ]?bird\s*[−\-–]?\s*(\d+)\s*%/gi, "Tidig bokning −$1 %")
      .replace(/Tidig bokning\s*[−\-–]?\s*(\d+)\s*%/gi, "Tidig bokning −$1 %");
  }
  return trimmed
    .replace(/Tidig bokning\s*[−\-–]?\s*(\d+)\s*%/gi, "Early bird −$1 %")
    .replace(/Early[- ]?bird\s*[−\-–]?\s*(\d+)\s*%/gi, "Early bird −$1 %");
}
