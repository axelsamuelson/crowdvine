/**
 * Customer-facing copy for coverage-close progress / checkout / terms snippets.
 *
 * SV checkout hint (`coverageCheckoutHint("sv")`) approved word-for-word
 * 443bd26c (KASSAN only). EN and remaining strings stay TODO until separate
 * approval. Do not edit content/legal/* here.
 */

/** Approved SV checkout ladder text — 443bd26c / KASSAN. Do not paraphrase. */
export const COVERAGE_CHECKOUT_HINT_SV_APPROVED =
  "Pallen skickas när tillräckligt många flaskor är beställda. Gränsen kan sänkas med tiden, så att pallen kan skickas tidigare. Vi kan inte lova ett datum för när den stänger. Inget dras förrän pallen stänger, och fram till dess kan du avbryta utan kostnad. Innan vi drar pengarna mejlar vi dig belopp och datum. Efter stängningen levererar vi inom 30 dagar, normalt inom 2–3 veckor.";

export function coverageProgressLabel(opts: {
  locale: "sv" | "en";
  filled: number;
  target: number;
}): string {
  // TODO(Juliette/Margaux)
  if (opts.locale === "en") {
    return `TODO(Juliette/Margaux): ${opts.filled} of ${opts.target} bottles`;
  }
  return `TODO(Juliette/Margaux): ${opts.filled} av ${opts.target} flaskor`;
}

export function coverageCheckoutHint(locale: "sv" | "en"): string {
  // EN: still placeholder — no separate EN approval yet.
  // SV: approved 443bd26c (KASSAN). Replaces 70%-floor / Monday-lock /
  // warning-email / no-countdown placeholder wording.
  if (locale === "en") {
    return "TODO(Juliette/Margaux): The pallet locks when coverage is reached or at the bottle cap. No countdown is shown.";
  }
  return COVERAGE_CHECKOUT_HINT_SV_APPROVED;
}

export function coverageTermsPlaceholder(locale: "sv" | "en"): string {
  // TODO(Juliette/Margaux) — not wired into content/legal/*
  return locale === "en"
    ? "TODO(Juliette/Margaux): Terms placeholder for coverage-based pallet lock — pending Axel word-for-word approval."
    : "TODO(Juliette/Margaux): Villkors-placeholder för täckningsbaserad pallåsning — väntar Axels ordagranna godkännande.";
}
