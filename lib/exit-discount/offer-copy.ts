/**
 * Customer-facing exit-discount offer copy (popup + email alignment).
 * Keep short and friendly — no urgency / countdown language.
 */

import { exitDiscountValidityDays } from "@/lib/exit-discount/config";

export const EXIT_DISCOUNT_OFFER_HEADING =
  "10 % på vinet i din första reservation";

export const EXIT_DISCOUNT_OFFER_CTA = "Skicka rabattkod";

export const EXIT_DISCOUNT_EMAIL_INTRO =
  "Här är din personliga rabattkod:";

/**
 * Legal email footer (12px muted). Easy to update after legal review.
 * Exact approved copy — do not paraphrase.
 */
export const EXIT_DISCOUNT_EMAIL_FOOTER =
  "PACT drivs av EURPACT OÜ (registrikood 17538270), Tartu mnt 67/1-13b, 10115 Tallinn, Estland · customer@pactwines.com · Du får det här mejlet eftersom du bad om en rabattkod på pactwines.com.";

/** Offer terms shown beside the discount step (validity from config). */
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

export function exitDiscountEmailBodyLines(opts: {
  code: string;
  percent: number;
  expiresLabel: string;
}): string[] {
  return [
    "Hej!",
    "",
    `${EXIT_DISCOUNT_EMAIL_INTRO} ${opts.code}`,
    "Ange koden i kassan.",
    "",
    `Den ger ${opts.percent} % på vinet i din första reservation och gäller till ${opts.expiresLabel}.`,
    "",
    "Välj viner: https://pactwines.com/vin",
    "",
    "Koden kan användas en gång och kan inte kombineras med PACT Points. Den gäller inte Meigoon Box. Gäller vinet, inte frakten.",
    "",
    EXIT_DISCOUNT_EMAIL_FOOTER,
  ];
}
