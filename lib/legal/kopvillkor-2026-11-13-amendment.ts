/**
 * Expected publishable strings for the 2026-11-13 failed-direct-delivery
 * amendments to köpvillkor / terms. Applied on top of the 2026-11-11
 * direct-delivery addendum for verification. Also holds the replacement-wine
 * reply-deadline bullets and punkt 8 lead-in bold formatting.
 */

export const SV_AGE_CHECK_OLD =
  "**Ålderskontroll.** UPS kontrollerar vid överlämningen att mottagaren har fyllt 20 år. Visa giltig legitimation. Om ålderskontrollen inte går igenom lämnas vinet inte ut, det skickas tillbaka till oss och du får tillbaka pengarna utan avgift.";

export const SV_AGE_CHECK_NEW =
  "**Ålderskontroll.** UPS kontrollerar vid överlämningen att mottagaren har fyllt 20 år. Visa giltig legitimation. Går ålderskontrollen inte igenom lämnas vinet inte ut.";

export const SV_FAILED_HANDOVER =
  "**Om lådan inte kan lämnas över.** Kan UPS inte lämna över lådan, till exempel för att ingen är hemma, lådan inte hämtas ut eller ålderskontrollen inte går igenom, skickas den tillbaka till producenten. När lådan är tillbaka betalar vi tillbaka det du betalat för vinet, men inte frakten. Vill du ha vinet ändå skickar vi det igen mot en ny fraktavgift på 149 kr per låda. Beror det på oss eller UPS att lådan inte kom fram får du i stället tillbaka hela beloppet inklusive frakt, eller en ny leverans utan kostnad. Din ångerrätt gäller som vanligt: ångrar du köpet innan lådan har levererats får du tillbaka även fraktavgiften, men vi drar av den faktiska kostnaden för att skicka tillbaka lådan.";

/** Punkt 3 fourth bullet: reply deadline for replacement wine (direct delivery). */
export const SV_REPLACEMENT_WINE_REPLY_BULLET =
  "Vid direktleverans har du **2 arbetsdagar** på dig att svara på vårt erbjudande. Svarar du inte inom den tiden avbryts hela ordern och du får tillbaka hela beloppet utan onödigt dröjsmål och senast inom 14 dagar. Godkänner du ersättningsvinet räknas leveranstiden från ditt ja.";

/** Point 8 paragraph 1 after placement fix (bold lead-in; no 3 b trailer). */
export const SV_TRANSPORT_P1_NEW =
  "**Vid delad pall:** Om du inte är hemma, inte kan legitimera dig eller inte är minst 20 år gör vår transportpartner ett nytt leveransförsök. Kan leveransen inte genomföras då heller returneras varan.";

/** Point 8 paragraph 2 after placement fix (3 b trailer at end). */
export const SV_TRANSPORT_P2_NEW =
  "Vid retur betalar du den faktiska returfraktkostnaden, utan påslag. Om överlämningen nekas vid ålderskontrollen tar vi inte ut någon avgift. För direktleverans gäller punkt 3 b.";

export const EN_AGE_CHECK_OLD =
  "**Age check.** On handover, UPS checks that the recipient is at least 20 years old. Show valid ID. If the age check is not passed, the wine is not handed over, it is sent back to us and you get your money back with no fee.";

export const EN_AGE_CHECK_NEW =
  "**Age check.** UPS checks at handover that the recipient is at least 20 years old. Show valid ID. If the age check fails, the wine will not be handed over.";

export const EN_FAILED_HANDOVER =
  "**If the box cannot be handed over.** If UPS cannot hand over the box, for example because no one is home, the box is not collected or the age check fails, it is sent back to the producer. Once the box is back, we refund what you paid for the wine, but not the shipping. If you still want the wine, we will send it again for a new shipping fee of SEK 149 per box. If the box did not arrive because of us or UPS, you instead get the full amount back including shipping, or a new delivery at no cost. Your right of withdrawal applies as usual: if you cancel the purchase before the box has been delivered, you also get the shipping fee back, but we deduct the actual cost of returning the box.";

/** Section 3 fourth bullet: reply deadline for replacement wine (direct delivery). */
export const EN_REPLACEMENT_WINE_REPLY_BULLET =
  "For direct delivery, you have **2 working days** to reply to our offer. If you do not reply within that time, the entire order is cancelled and you get the full amount back without undue delay and no later than within 14 days. If you accept the replacement wine, the delivery time is counted from your acceptance.";

/** Point 8 paragraph 1 after placement fix (bold lead-in; no 3 b trailer). */
export const EN_TRANSPORT_P1_NEW =
  "**For shared pallets:** If you are not at home, cannot show ID or are not at least 20 years old, our delivery partner will make a new delivery attempt. If delivery cannot be completed then either, the goods are returned.";

/** Point 8 paragraph 2 after placement fix (3 b trailer at end). */
export const EN_TRANSPORT_P2_NEW =
  "In the event of a return, you pay the actual cost of return shipping, without any mark-up. If the handover is refused at the age check, we do not charge any fee. For direct delivery, point 3 b applies.";
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
