/**
 * Supersessions from uploads/kopvillkor-misslyckad-direktleverans-GODKAND-2026-11-13.md
 * (sha256 396ec622687b4731df5c1a6524f15e7252814ea24c1daab001ed3bb9ed2e373f).
 * Applied on top of the 2026-11-11 direct-delivery addendum for verification.
 */

export const KOPVILLKOR_2026_11_13_SHA256 =
  "396ec622687b4731df5c1a6524f15e7252814ea24c1daab001ed3bb9ed2e373f";

export const SV_AGE_CHECK_OLD =
  "**Ålderskontroll.** UPS kontrollerar vid överlämningen att mottagaren har fyllt 20 år. Visa giltig legitimation. Om ålderskontrollen inte går igenom lämnas vinet inte ut, det skickas tillbaka till oss och du får tillbaka pengarna utan avgift.";

export const SV_AGE_CHECK_NEW =
  "**Ålderskontroll.** UPS kontrollerar vid överlämningen att mottagaren har fyllt 20 år. Visa giltig legitimation. Går ålderskontrollen inte igenom lämnas vinet inte ut.";

export const SV_FAILED_HANDOVER =
  "**Om lådan inte kan lämnas över.** Kan UPS inte lämna över lådan, till exempel för att ingen är hemma, lådan inte hämtas ut eller ålderskontrollen inte går igenom, skickas den tillbaka till producenten. När lådan är tillbaka betalar vi tillbaka det du betalat för vinet, men inte frakten. Vill du ha vinet ändå skickar vi det igen mot en ny fraktavgift på 149 kr per låda. Beror det på oss eller UPS att lådan inte kom fram får du i stället tillbaka hela beloppet inklusive frakt, eller en ny leverans utan kostnad. Din ångerrätt gäller som vanligt: ångrar du köpet innan lådan har levererats får du tillbaka även fraktavgiften, men vi drar av den faktiska kostnaden för att skicka tillbaka lådan.";

export const SV_TRANSPORT_OLD =
  "Om du inte är hemma, inte kan legitimera dig eller inte är minst 20 år gör vår transportpartner ett nytt leveransförsök. Kan leveransen inte genomföras då heller returneras varan.";

export const SV_TRANSPORT_NEW =
  "Vid delad pall: Om du inte är hemma, inte kan legitimera dig eller inte är minst 20 år gör vår transportpartner ett nytt leveransförsök. Kan leveransen inte genomföras då heller returneras varan. För direktleverans gäller punkt 3 b.";

export const EN_AGE_CHECK_OLD =
  "**Age check.** On handover, UPS checks that the recipient is at least 20 years old. Show valid ID. If the age check is not passed, the wine is not handed over, it is sent back to us and you get your money back with no fee.";

export const EN_AGE_CHECK_NEW =
  "**Age check.** UPS checks at handover that the recipient is at least 20 years old. Show valid ID. If the age check fails, the wine will not be handed over.";

export const EN_FAILED_HANDOVER =
  "**If the box cannot be handed over.** If UPS cannot hand over the box, for example because no one is home, the box is not collected or the age check fails, it is sent back to the producer. Once the box is back, we refund what you paid for the wine, but not the shipping. If you still want the wine, we will send it again for a new shipping fee of SEK 149 per box. If the box did not arrive because of us or UPS, you instead get the full amount back including shipping, or a new delivery at no cost. Your right of withdrawal applies as usual: if you cancel the purchase before the box has been delivered, you also get the shipping fee back, but we deduct the actual cost of returning the box.";

export const EN_TRANSPORT_OLD =
  "If you are not at home, cannot show ID or are not at least 20 years old, our delivery partner will make a new delivery attempt. If delivery cannot be completed then either, the goods are returned.";

export const EN_TRANSPORT_NEW =
  "For shared pallets: If you are not at home, cannot show ID or are not at least 20 years old, our delivery partner will make a new delivery attempt. If delivery cannot be completed then either, the goods are returned. For direct delivery, point 3 b applies.";

/** Patch a 2026-11-11 SV §3b body so it matches the 2026-11-13 published text. */
export function applySv3bAmendment(body: string): string {
  if (!body.includes(SV_AGE_CHECK_OLD)) return body;
  return body.replace(
    SV_AGE_CHECK_OLD,
    `${SV_AGE_CHECK_NEW}\n\n${SV_FAILED_HANDOVER}`,
  );
}

/** Patch a 2026-11-11 EN §3b body so it matches the 2026-11-13 published text. */
export function applyEn3bAmendment(body: string): string {
  if (!body.includes(EN_AGE_CHECK_OLD)) return body;
  return body.replace(
    EN_AGE_CHECK_OLD,
    `${EN_AGE_CHECK_NEW}\n\n${EN_FAILED_HANDOVER}`,
  );
}
