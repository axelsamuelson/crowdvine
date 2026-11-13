/**
 * Strip value judgements / marketing superlatives from Systembolaget guide
 * wine notes at render time. Product data stays in Colette's database;
 * this only changes what the page shows.
 *
 * Targeted at short Swedish editorial blurbs (white Systembolaget list).
 * Prefer phrase-level deletion over paraphrasing so we do not invent new claims.
 */
const VALUE_JUDGEMENT_PHRASES: readonly { pattern: RegExp; replace: string }[] =
  [
    {
      pattern: /\s*med en salthet som sällan finns i appellationen\.?/gi,
      replace: ".",
    },
    {
      pattern:
        /,?\s*vilket gör den ovanligt tillgänglig för ett vin på den här nivån\.?/gi,
      replace: ".",
    },
    {
      pattern:
        /\s*är tillsammans med Jacky Blot den som satte Montlouis på kartan,?\s*/gi,
      replace: " är ",
    },
    {
      pattern:
        /,?\s*och visar varför Chidaine räknas som en av Loires viktigaste vitvinsproducenter oavsett appellation\.?/gi,
      replace: ".",
    },
    {
      pattern:
        /\s*En av landets historiskt mest betydelsefulla biodynamiska producenter\.?/gi,
      replace: "",
    },
    {
      pattern:
        /\s*och har sedan dess blivit ett av appellationens mest hyllade namn\.?/gi,
      replace: ".",
    },
    {
      pattern: /,?\s*en av de mest omtalade producenterna i regionen\.?/gi,
      replace: ".",
    },
    {
      pattern: /\s*räknas till Alsace pionjärer inom biodynamisk odling\.?/gi,
      replace: " odlar biodynamiskt.",
    },
    {
      pattern:
        /\s*(?:Han |och )?blev en av biodynamikens tydligaste röster(?: i vinvärlden)?\.?/gi,
      replace: ".",
    },
    {
      pattern: /,?\s*långt före de flesta\.?/gi,
      replace: ".",
    },
    {
      pattern:
        /Claus Preisinger är en av de yngre österrikiska producenterna som gjort Burgenland till ett centrum för naturvin\.\s*/gi,
      replace: "Claus Preisinger gör vin i Burgenland. ",
    },
    {
      pattern: /\s*är hans vita vardagsvin,?\s*/gi,
      replace: " är ",
    },
    {
      pattern:
        /\s*Systembolaget beskriver det som mycket friskt(?: med)?\b/gi,
      replace: " Systembolaget beskriver",
    },
    {
      pattern: /\s*är Sydafrikas mest inflytelserika naturvinsproducent\.?/gi,
      replace: " gör naturvin i Sydafrika.",
    },
    {
      pattern:
        /\s*och tillhör den generation österrikiska producenter som gjort naturvin till vardagsvara\.?/gi,
      replace: ".",
    },
    {
      pattern: /,?\s*okomplicerat och drickligt\.?/gi,
      replace: ".",
    },
    {
      pattern: /\s*till ett pris som gör den till en självklar vardagsflaska\.?/gi,
      replace: ".",
    },
    {
      pattern: /\s*Priset är högt och\s*/gi,
      replace: " ",
    },
    {
      pattern: /\s*och driver en av Österrikes största biodynamiska gårdar\.?/gi,
      replace: ".",
    },
    {
      pattern: /\s*för ett vin på den här nivån\.?/gi,
      replace: "",
    },
    { pattern: /\bvardagsflaska\b/gi, replace: "flaska" },
    { pattern: /\bvardagsvin\b/gi, replace: "vin" },
    { pattern: /\bvardagsvara\b/gi, replace: "vara" },
    { pattern: /\bdrickligt\b/gi, replace: "" },
  ];

/** Collapse leftover punctuation / whitespace after phrase removal. */
function tidyNeutralizedNote(text: string): string {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .replace(/\.\s*\./g, ".")
    .replace(/^\s*[,.;:]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Return a more neutral version of a guide wine editorial note.
 * Empty string means the note should be omitted on the page.
 */
export function neutralizeGuideEditorialNote(
  note: string | null | undefined,
): string {
  if (!note) return "";
  let result = note;
  for (const { pattern, replace } of VALUE_JUDGEMENT_PHRASES) {
    result = result.replace(pattern, replace);
  }
  return tidyNeutralizedNote(result);
}

/** True when the scrubber removed or altered value-laden wording. */
export function guideEditorialNoteHadValueJudgement(
  note: string | null | undefined,
): boolean {
  if (!note?.trim()) return false;
  return neutralizeGuideEditorialNote(note) !== note.trim();
}
