/** Swedish customer-facing errors for exit-discount redemption. */
export const EXIT_DISCOUNT_ERRORS = {
  emailMismatch:
    "Den här rabattkoden är personlig och knuten till en annan e-postadress.",
  alreadyRedeemed: "Den här rabattkoden har redan använts.",
  expired: "Koden har gått ut.",
  notFirstOrder: "Rabattkoden gäller endast din första beställning.",
  stackingPoints: "Exit-rabatten kan inte kombineras med PACT Points.",
  stackingVoucher:
    "Exit-rabatten kan inte kombineras med andra rabatter eller vouchers.",
  stackingMemberOrEarlyBird:
    "Exit-rabatten kan inte kombineras med medlemsrabatt eller early-bird-pris.",
  scopePalletOnly:
    "Rabattkoden gäller endast pallbeställningar, inte direktlådor / hemleverans.",
  excludedOnly:
    "Rabattkoden gäller inte för Meigoon Box (eller andra undantagna produkter).",
  noEligibleWine:
    "Det finns inga rabattberättigade viner i kundvagnen för den här koden.",
} as const;

export const EXIT_FEEDBACK_THANKS_MESSAGE = "Tack för ditt svar!";
/** Body under the thanks heading (heading stays EXIT_FEEDBACK_THANKS_MESSAGE only). */
export const EXIT_FEEDBACK_THANKS_BODY = "Det hjälper oss att bli bättre.";
/** Auto-close / advance delay after the thanks phase. */
export const EXIT_FEEDBACK_THANKS_MS = 2500;
