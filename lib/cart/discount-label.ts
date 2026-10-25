/**
 * Cart and checkout line label for member and early-bird discounts.
 * A single early-bird label must not hide a member discount on the same price.
 */
export function formatCartDiscountLabel(input: {
  memberName?: string | null;
  memberPercent: number;
  earlyBirdPercent: number;
}): string | undefined {
  const parts: string[] = [];
  const memberPercent = Math.round(input.memberPercent);
  const earlyBirdPercent = Math.round(input.earlyBirdPercent);

  if (memberPercent > 0) {
    const name = input.memberName?.trim();
    parts.push(name ? `${name} ${memberPercent}%` : `${memberPercent}%`);
  }
  if (earlyBirdPercent > 0) {
    parts.push(`Early-bird ${earlyBirdPercent}%`);
  }
  if (parts.length === 0) return undefined;
  return parts.join(" · ");
}
