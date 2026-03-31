/** Shared Actor user message for one section (sync + batch). */

export function buildSectionUserPrompt(sectionName: string, sectionText: string): string {
  return (
    `Extrahera ENDAST sektionen '${sectionName.replace(/'/g, "\\'")}' från följande text.\n` +
    `Returnera JSON i exakt detta format utan någon text före eller efter:\n` +
    `{ "sections": [{ "section_name", "normalized_section", "rows": [...] }] }\n\nText för sektionen:\n` +
    sectionText
  );
}
