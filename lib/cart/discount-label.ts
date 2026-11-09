/**
 * Cart and checkout line label for member and early-bird discounts.
 * A single early-bird label must not hide a member discount on the same price.
 *
 * SV uses typographic minus + space before % (e.g. "Early bird −20 %").
 * EN keeps a compact "Early bird −20%".
 */

export type DiscountLabelLocale = "sv" | "en";

function formatEarlyBirdPart(
  percent: number,
  locale: DiscountLabelLocale,
): string {
  // Product copy keeps the English loanword "Early bird" in both locales.
  if (locale === "sv") {
    return `Early bird −${percent} %`;
  }
  return `Early bird −${percent}%`;
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
  const locale: DiscountLabelLocale =
    String(input.locale ?? "sv").toLowerCase().startsWith("en") ? "en" : "sv";

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
