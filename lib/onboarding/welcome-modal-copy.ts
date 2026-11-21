/**
 * Welcome modal short copy — 3 steps (Margaux kort-v2, 2026-11-13).
 * Source: /cursor/stores/bot/handoff/welcome-modal-kort-v2.md (sha256 3a51bb47…).
 * Step 2 card 3: Margaux (13/11) — producent/grossist same wording as step 1.
 */

import type { AppLocale } from "@/lib/i18n/locale";

export const WELCOME_MODAL_COPY = {
  sv: {
    nav: {
      skip: "Hoppa över",
      next: "Nästa",
      close: "Stäng",
      back: "Tillbaka",
      cta: "Se vinerna",
      goToStep: "Gå till steg {n}",
    },
    step1: {
      title: "Välkommen till PACT",
      // NBSP before last word avoids a 390px orphan ("pallar") with text-balance.
      subtitle: "Naturvin från Frankrike på delade\u00A0pallar",
      body: "Vi samlar allas köp på en gemensam pall från Languedoc. Vinerna från Languedoc köper vi direkt av producenterna, övriga via grossist i Languedoc.",
      bodyDirectAppend:
        "Vill du inte vänta på pallen kan du välja direktleverans till ett högre pris.",
    },
    step2: {
      title: "Så fungerar det",
      cards: [
        {
          title: "Välj och köp.",
          body: "Köp flaskor från hela Frankrike.",
        },
        {
          title: "Delad pall.",
          body: "När pallen är full skickas den till Sverige. Följ den i din profil.",
          bodyDirectAppend: "Eller välj direktleverans, som skickas separat.",
        },
        {
          title: "Hela lådor.",
          body: "6 flaskor per producent eller grossist (6, 12, 18 …). Viner från samma producent eller grossist går att blanda.",
        },
      ],
    },
    step3: {
      title: "Du är medlem",
      body: "Din nivå är {levelName}. Bjud in vänner och följ din status i profilen.",
      bodyPointsBonus: "Du har fått 50 PACT-poäng i välkomstbonus.",
    },
  },
  en: {
    nav: {
      skip: "Skip",
      next: "Next",
      close: "Close",
      back: "Back",
      cta: "See the wines",
      goToStep: "Go to step {n}",
    },
    step1: {
      title: "Welcome to PACT",
      // NBSP before last word avoids a 390px orphan ("pallets") with text-balance.
      subtitle: "French natural wine on shared\u00A0pallets",
      body: "We gather everyone's orders on a shared pallet from Languedoc. We buy the Languedoc wines directly from the producers and the rest through wholesalers in Languedoc.",
      bodyDirectAppend:
        "If you'd rather not wait for the pallet, you can choose direct delivery at a higher price.",
    },
    step2: {
      title: "How it works",
      cards: [
        {
          title: "Choose and buy.",
          body: "Buy bottles from all over France.",
        },
        {
          title: "Shared pallet.",
          body: "When the pallet is full, it ships to Sweden. Track it in your profile.",
          bodyDirectAppend: "Or choose direct delivery, shipped separately.",
        },
        {
          title: "Full boxes.",
          body: "6 bottles per producer or wholesaler (6, 12, 18 …). Wines from the same producer or wholesaler can be mixed.",
        },
      ],
    },
    step3: {
      title: "You're a member",
      body: "Your level is {levelName}. Invite friends and track your status in your profile.",
      bodyPointsBonus: "You've received a 50 PACT Points welcome bonus.",
    },
  },
} as const;

export type WelcomeModalCopyLocale = keyof typeof WELCOME_MODAL_COPY;

/** Canonical 1-based step ids (always 3). */
export function welcomeModalStepIds(): number[] {
  return [1, 2, 3];
}

/** Step 1 body; appends direct-delivery sentence only when the flag is on. */
export function welcomeModalStep1Body(
  locale: AppLocale,
  directBoxEnabled: boolean,
): string {
  const { body, bodyDirectAppend } = WELCOME_MODAL_COPY[locale].step1;
  if (!directBoxEnabled) return body;
  return `${body} ${bodyDirectAppend}`;
}

/** Step 2 card 2 body; appends direct-delivery sentence only when the flag is on. */
export function welcomeModalStep2Card2Body(
  locale: AppLocale,
  directBoxEnabled: boolean,
): string {
  const card = WELCOME_MODAL_COPY[locale].step2.cards[1];
  const append = "bodyDirectAppend" in card ? card.bodyDirectAppend : "";
  if (!directBoxEnabled || !append) return card.body;
  return `${card.body} ${append}`;
}

export function welcomeModalStep3Body(
  locale: AppLocale,
  levelName: string,
): string {
  return WELCOME_MODAL_COPY[locale].step3.body.replace("{levelName}", levelName);
}
