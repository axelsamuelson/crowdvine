import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_SHA256 =
  "578afd136248ed76e31f77ed357990d6c5b80d735e116def620304b562bb9620";

/** Optional local handoff draft — never required in CI (repo uploads/ is gitignored). */
const APPROVED_CANDIDATES = [
  resolve(
    "/home/ubuntu/.cursor/projects/agent-repos-crowdvine/uploads/kopvillkor-direktleverans-tillagg-GODKAND-2026-11-11-1122_572f.md",
  ),
  resolve(
    "uploads/kopvillkor-direktleverans-tillagg-GODKAND-2026-11-11-1122.md",
  ),
];

function findApprovedPath(): string | null {
  for (const p of APPROVED_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** Publishable excerpts that must remain in content/legal/source/kopvillkor.sv.md */
const PUBLISHED_EXCERPTS = [
  "Du kan välja mellan två leveranssätt i kassan:",
  "Se punkt 3 b.",
  "vinet levereras normalt inom 5–10 arbetsdagar. Se punkt 3 b.",
  "Dina lådor packas i Frankrike och vi skickar dem med UPS hem till dig.",
  "Leveranstiden är normalt **5–10 arbetsdagar** från att ordern är bekräftad och betald.",
  "Varukorgen visar om en låda inte är full.",
  "Det händer att ett vin tar slut efter att du har köpt.",
  "**avbryts hela ordern**",
  "Vid direktleverans är flaskpriset 5 % högre än vid delad pall, avrundat till hela kronor, och frakten är 149 kr per låda om 6 flaskor. Båda ingår i totalpriset i kassan.",
  "Vid direktleverans debiteras ditt kort när du köper, inte när en pall stänger. Stycket om misslyckad dragning gäller bara delad pall.",
  "- **Delad pall:** normalt 2–3 veckor efter att pallen har stängt, alltid inom 30 dagar.\n- **Direktleverans:** normalt 5–10 arbetsdagar från att ordern är bekräftad och betald, alltid inom 30 dagar.",
];

describe("köpvillkor direct-delivery addendum (Axel-approved)", () => {
  it("keeps publishable excerpts in .sv.md", () => {
    const published = readFileSync(
      resolve("content/legal/source/kopvillkor.sv.md"),
      "utf8",
    ).replace(/\r\n/g, "\n");

    for (const excerpt of PUBLISHED_EXCERPTS) {
      expect(
        published.includes(excerpt),
        `published .sv.md missing: ${excerpt.slice(0, 40)}`,
      ).toBe(true);
    }
  });

  it.skipIf(!findApprovedPath())(
    "optional local approved draft matches SHA-256 and publishable excerpts",
    () => {
      const path = findApprovedPath();
      if (!path) return;
      const approved = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
      expect(createHash("sha256").update(approved).digest("hex")).toBe(
        EXPECTED_SHA256,
      );

      const notesIdx = approved.indexOf(
        "## Anmärkningar (ej publicerad text)",
      );
      expect(notesIdx).toBeGreaterThan(0);
      const publishable = approved.slice(0, notesIdx);

      for (const excerpt of PUBLISHED_EXCERPTS) {
        expect(
          publishable.includes(excerpt),
          `approved missing: ${excerpt.slice(0, 40)}`,
        ).toBe(true);
      }
    },
  );
});
