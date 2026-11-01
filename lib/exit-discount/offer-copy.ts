/**
 * Customer-facing exit-discount offer copy (cart block + transactional email).
 * Keep short and friendly — no urgency / countdown language.
 * Email body is code-only (+ legal footer); no marketing content.
 */

import { exitDiscountValidityDays } from "@/lib/exit-discount/config";

export const EXIT_DISCOUNT_OFFER_HEADING =
  "10 % på vinet i din första reservation";

export const EXIT_DISCOUNT_OFFER_CTA = "Skicka rabattkod";

export const EXIT_DISCOUNT_EMAIL_INTRO = "Din rabattkod:";

/**
 * Legal email footer (12px muted). Easy to update after legal review.
 * Exact approved copy — do not paraphrase.
 */
export const EXIT_DISCOUNT_EMAIL_FOOTER =
  "PACT drivs av EURPACT OÜ (registrikood 17538270), Tartu mnt 67/1-13b, 10115 Tallinn, Estland · customer@pactwines.com · Du får det här mejlet eftersom du bad om en rabattkod på pactwines.com.";

/** Offer terms shown in the cart discount block (validity from config). */
export function exitDiscountOfferTerms(
  validityDays: number = exitDiscountValidityDays(),
): readonly string[] {
  return [
    "Gäller vinet, inte frakten.",
    "Kan inte kombineras med PACT Points.",
    "Gäller inte Meigoon Box.",
    `Gäller i ${validityDays} dagar. Vi mejlar koden till dig.`,
  ];
}

/** Plain-text body: discount code only (+ legal footer). No marketing. */
export function exitDiscountEmailBodyLines(opts: { code: string }): string[] {
  return [
    `${EXIT_DISCOUNT_EMAIL_INTRO} ${opts.code}`,
    "",
    EXIT_DISCOUNT_EMAIL_FOOTER,
  ];
}
