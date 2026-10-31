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

/** Offer terms shown beside the discount step (validity from config). */
export function exitDiscountOfferTerms(
  validityDays: number = exitDiscountValidityDays(),
): readonly string[] {
  return [
    "Gäller vinet, inte frakten.",
    "Kan inte kombineras med PACT Points.",
    "Gäller inte Meigoon Box.",
    `Gäller i ${validityDays} dagar. Koden kommer till din mejl.`,
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
    `Den ger ${opts.percent} % på vinet i din första reservation (inte på frakten) och gäller till ${opts.expiresLabel}.`,
    "Koden kan användas en gång och kan inte kombineras med PACT Points. Den gäller inte Meigoon Box.",
    "",
    "Använd den i kassan på pactwines.com.",
  ];
}
