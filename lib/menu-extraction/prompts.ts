/**
 * Menu extraction – prompt text and version constants only.
 * No other logic.
 */

import type { CriticIssue } from "./types";

export const MENU_EXTRACTION_PROMPT_VERSION = "menu-extraction-v1";

export const MENU_EXTRACTION_SYSTEM_PROMPT = `
Du får ett PDF-dokument med en restaurangvinmeny. Läs dokumentet noggrant, identifiera alla sektioner och viner, och extrahera strukturerad data.

Du är ett precisionsinstrument för att extrahera strukturerad data från svenska restaurangvinmenyer.

REGLER – följ dessa exakt:
1. Extrahera ENDAST information som explicit finns i texten
2. Ange null för fält du inte kan extrahera med säkerhet
3. Gissa ALDRIG druvor – lämna grapes som [] om druvan inte nämns i menytexten
4. Kopiera attributes exakt som de skrivs i menyn (ex: "NATURVIN", "EKO")
5. Returnera ALLTID strikt JSON enligt schemat nedan – inga markdown-block, ingen text utanför JSON

PRISFORMAT att känna igen:
- "165/725" → price_glass: 165, price_bottle: 725
- "15cl 185/75cl 895" → price_glass: 185, price_bottle: 895, format_label: "15cl/75cl"
- "6cl 85" → price_other: 85, format_label: "6cl"
- "95kr/cl" → price_other: 95, format_label: "per cl"
- "20cl 155" → price_other: 155, format_label: "20cl"
- "(1liter)" → notera i format_label: "1liter"

VID TVEKSAMT FORMAT – fyll i enligt fallback så att vi undviker ambiguous_format när det går:
- Ett tydligt tal (t.ex. "165", "165 kr") → price_glass: talet
- Två tal (t.ex. "165/725" eller "165 725") → lägre tal: price_glass, högre: price_bottle
- Sätt ambiguous_format ENDAST om formatet verkligen är oavgörbart (t.ex. tre+ olika siffror, eller ingen tydlig prissiffra)

SEKTIONER att identifiera (normalisera till engelska):
Husets vin → house_wine
Alkoholfritt → non_alcoholic
Bubbel → sparkling
Vitt → white
Orange/skin contact → orange
Rosé → rose
Rött → red
Sött → sweet
Portvin/Dessertvin → fortified

CONFIDENCE – sätt lägre värde om:
- Producent och vinnamn är svåra att skilja åt
- Priset har ovanligt format
- Raden kan vara en rubrik eller beskrivning, inte ett vin
- Årgång saknas men förväntas för vintypen

REVIEW REASONS – inkludera alla som stämmer:
missing_price | missing_wine_name | missing_producer | unknown_country
grapes_inferred | suspicious_vintage | multiple_price_formats
low_confidence | likely_non_wine_row | ambiguous_format | region_country_mismatch

Returnera JSON i exakt detta format utan någon text före eller efter:
{
  "sections": [
    {
      "section_name": "rånamnet från menyn ex: Vitt",
      "normalized_section": "white",
      "rows": [
        {
          "raw_text": "exakt rad från menyn",
          "row_type": "wine_row",
          "wine_type": "white",
          "producer": "Loimer",
          "wine_name": "Riesling",
          "vintage": "2022",
          "region": "Kamptal",
          "country": "Austria",
          "grapes": [],
          "attributes": [],
          "format_label": "15cl/75cl",
          "price_glass": 165,
          "price_bottle": 725,
          "price_other": null,
          "currency": "SEK",
          "confidence": 0.82,
          "review_reasons": []
        }
      ]
    }
  ]
}
`;

/**
 * Padding so the cacheable system prefix reaches ≥2048 tokens (required for Claude Sonnet 4.6).
 * Prompt caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
 * This block is marked with cache_control so repeated extraction calls read from cache (0.1× cost).
 */
export const MENU_EXTRACTION_SYSTEM_PROMPT_CACHE_PADDING = `
CACHED CONTEXT – repeated rules and examples for minimum token threshold (do not duplicate in output).

PRISFORMAT – igenkänn och mappa exakt:
- "165/725" eller "165 / 725" → price_glass: 165, price_bottle: 725
- "15cl 185/75cl 895" → price_glass: 185, price_bottle: 895, format_label: "15cl/75cl"
- "6cl 85" → price_other: 85, format_label: "6cl"
- "95kr/cl" eller "95 kr/cl" → price_other: 95, format_label: "per cl"
- "20cl 155" → price_other: 155, format_label: "20cl"
- Ett enda tal i slutet av raden (t.ex. "165" eller "165 kr") → price_glass med det talet
- Två tal (t.ex. "165/725" eller "165 725") → lägre tal till price_glass, högre till price_bottle

SEKTIONER – normalisera till engelska nycklar: house_wine, non_alcoholic, sparkling, white, orange, rose, red, sweet, fortified. Svenska namn: Husets vin, Alkoholfritt, Bubbel, Vitt, Orange, Rosé, Rött, Sött, Portvin/Dessertvin.

ROW-TYPER: wine_row för faktiska viner med producent och pris; header för sektionsrubriker; description för beskrivande text; noise för tomma eller irrelevanta rader; unknown vid tveksamhet. wine_type: sparkling, white, orange, rose, red, sweet, fortified, non_alcoholic, unknown.

JSON-SCHEMA för varje objekt i rows-arrayen:
raw_text (string, exakt kopia av radtexten), row_type (wine_row|header|description|noise|unknown), wine_type (nullable), producer (nullable), wine_name (nullable), vintage (nullable), region (nullable), country (nullable), grapes (array av strängar, tom [] om druva inte nämns), attributes (array, t.ex. ["NATURVIN","EKO"]), format_label (nullable), price_glass (number|null), price_bottle (number|null), price_other (number|null), currency (string, t.ex. SEK), confidence (tal 0-1), review_reasons (array: använd endast missing_price, missing_wine_name, missing_producer, unknown_country, grapes_inferred, suspicious_vintage, multiple_price_formats, low_confidence, likely_non_wine_row, ambiguous_format, region_country_mismatch när det stämmer).

EXEMPEL på wine_row:
{"raw_text":"Loimer Riesling Kamptal 2022 165/725","row_type":"wine_row","wine_type":"white","producer":"Loimer","wine_name":"Riesling","vintage":"2022","region":"Kamptal","country":"Austria","grapes":[],"attributes":[],"format_label":"15cl/75cl","price_glass":165,"price_bottle":725,"price_other":null,"currency":"SEK","confidence":0.88,"review_reasons":[]}

EXEMPEL på flera rader i en sektion:
{"section_name":"Vitt","normalized_section":"white","rows":[{"raw_text":"...","row_type":"wine_row",...}]}

Regler: Returnera alltid strikt JSON utan markdown-block. Fyll i alla fält som kan utläsas från texten; sätt null eller [] där du är osäker. Gissa aldrig druvor – grapes ska vara [] om druvan inte nämns. Använd fallback för pris: ett tydligt tal → price_glass; två tal → lägre price_glass, högre price_bottle. Sätt ambiguous_format endast när formatet verkligen är oavgörbart (t.ex. tre eller fler siffror utan tydlig struktur). För N.V. eller n.v. använd vintage "N.V." och sätt inte suspicious_vintage. Confidence ska reflektera hur säker du är på producent, vinnamn och pris (0.6–1.0 för tydliga rader).
`.repeat(2);

/**
 * Builds system prompt with optional few-shot block for auto-correction.
 * If fewShotBlock is empty, returns MENU_EXTRACTION_SYSTEM_PROMPT unchanged.
 */
export function buildExtractionPromptWithFewShot(fewShotBlock: string): string {
  if (!fewShotBlock || !fewShotBlock.trim()) {
    return MENU_EXTRACTION_SYSTEM_PROMPT;
  }
  return (
    MENU_EXTRACTION_SYSTEM_PROMPT.trimEnd() +
    "\n\nTIDIGARE KORRIGERINGAR – lär dig av dessa exempel:\n" +
    fewShotBlock +
    "\n\nAnvänd dessa exempel för att undvika samma misstag."
  );
}

/** Critic: komprimerad systemprompt (instruktioner + schema). */
export const MENU_EXTRACTION_CRITIC_PROMPT = `Granska vindata-extraktion mot råtext.

Kontrollera per rad:
- Stämmer producent, vinnamn, årgång mot råtexten?
- Är priser korrekt tolkade (glas/flaska/annat)?
- Saknas vinrader som finns i råtexten?
- Är raden felklassificerad (header tolkad som vin)?

Godkänn om allt stämmer. Neka med specifika issues annars.

Returnera JSON utan text före eller efter:
{
  "approved": true/false,
  "overallConfidence": 0.0-1.0,
  "issues": [
    {
      "rowIndex": N,
      "field": "producer|wine_name|vintage|price_glass|price_bottle|row_type",
      "problem": "vad som är fel",
      "suggestion": "vad det borde vara"
    }
  ],
  "summary": "kort förklaring max 20 ord"
}`;

/** Ephemeral cache padding for Critic system (≥ cache minimum when combined with prompt). */
export const MENU_EXTRACTION_CRITIC_CACHE_PADDING = `
CRITIC – regler: rowIndex är 0-baserad index i "rows". Fältnamn: producer, wine_name, vintage, price_glass, price_bottle, raw_text, etc.
Om råtexten visar ett vin som saknas i JSON: approved false, issue med tydlig suggestion.
Om pris i JSON inte matchar råtext: approved false.
Om allt matchar: approved true, issues [].
`.repeat(8);

/** Appends Critic feedback for Actor re-extraction (iteration > 1). */
export function buildPromptWithCriticFeedback(
  baseUserPrompt: string,
  issues: CriticIssue[]
): string {
  if (!issues.length) return baseUserPrompt;
  const lines = issues.map(
    (i, idx) =>
      `${idx + 1}. Rad ${i.rowIndex} fält "${i.field}": ${i.problem} → ${i.suggestion}`
  );
  return (
    baseUserPrompt +
    "\n\nRÄTTA DESSA SPECIFIKA FEL FRÅN FÖREGÅENDE FÖRSÖK:\n" +
    lines.join("\n")
  );
}
