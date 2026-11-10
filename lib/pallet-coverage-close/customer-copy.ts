/**
 * Customer-facing copy for coverage-close progress / checkout / terms snippets.
 *
 * ALL strings are PLACEHOLDERS — TODO(Juliette/Margaux).
 * Axel must approve word for word before enabling in production UI.
 * Do not edit content/legal/*.
 */

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
  // TODO(Juliette/Margaux) — no countdown / deadline in customer UI
  return locale === "en"
    ? "TODO(Juliette/Margaux): The pallet locks when coverage is reached or at the bottle cap. No countdown is shown."
    : "TODO(Juliette/Margaux): Pallen låses när täckningen nås eller vid flasktaket. Ingen nedräkning visas.";
}

export function coverageTermsPlaceholder(locale: "sv" | "en"): string {
  // TODO(Juliette/Margaux) — not wired into content/legal/*
  return locale === "en"
    ? "TODO(Juliette/Margaux): Terms placeholder for coverage-based pallet lock — pending Axel word-for-word approval."
    : "TODO(Juliette/Margaux): Villkors-placeholder för täckningsbaserad pallåsning — väntar Axels ordagranna godkännande.";
}
