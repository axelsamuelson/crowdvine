/**
 * Exact copy for the optional account step after claiming an exit discount.
 * Source: Juliette (updated invite bullet).
 */

export const EXIT_DISCOUNT_ACCOUNT_HEADING =
  "Skapa ett konto och få ut mer av PACT";

export const EXIT_DISCOUNT_ACCOUNT_BULLETS = [
  "Följ dina reservationer och se hur det går med pallen, från att den samlas ihop tills den är full.",
  "Gör smakquizet och få vinförslag som passar dig.",
  "Lås upp medlemsnivåer och förmåner.",
  "Bjud in vänner till PACT och lås upp belöningar",
] as const;

export const EXIT_DISCOUNT_ACCOUNT_CTA = "Skapa konto";

export const EXIT_DISCOUNT_ACCOUNT_DECLINE = "Nej tack, inte nu";

export function exitDiscountSignupHref(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return "/signup";
  return `/signup?email=${encodeURIComponent(trimmed)}`;
}
