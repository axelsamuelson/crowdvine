import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_SHA256 =
  "578afd136248ed76e31f77ed357990d6c5b80d735e116def620304b562bb9620";

const APPROVED_CANDIDATES = [
  resolve(
    "/home/ubuntu/.cursor/projects/agent-repos-crowdvine/uploads/kopvillkor-direktleverans-tillagg-GODKAND-2026-11-11-1122_572f.md",
  ),
  resolve(
    "uploads/kopvillkor-direktleverans-tillagg-GODKAND-2026-11-11-1122.md",
  ),
];

function loadApproved(): string {
  for (const p of APPROVED_CANDIDATES) {
    if (existsSync(p)) return readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  }
  throw new Error("Approved kopvillkor addendum file not found");
}

describe("köpvillkor direct-delivery addendum (Axel-approved)", () => {
  it("matches approved publishable excerpts character-for-character in .sv.md", () => {
    const approved = loadApproved();
    expect(createHash("sha256").update(approved).digest("hex")).toBe(
      EXPECTED_SHA256,
    );

    const notesIdx = approved.indexOf(
      "## Anmärkningar (ej publicerad text)",
    );
    expect(notesIdx).toBeGreaterThan(0);
    const publishable = approved.slice(0, notesIdx);
    const published = readFileSync(
      resolve("content/legal/source/kopvillkor.sv.md"),
      "utf8",
    ).replace(/\r\n/g, "\n");

    const excerpts = [
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

    for (const excerpt of excerpts) {
      expect(publishable.includes(excerpt), `approved missing: ${excerpt.slice(0, 40)}`).toBe(
        true,
      );
      expect(
        published.includes(excerpt),
        `published .sv.md missing: ${excerpt.slice(0, 40)}`,
      ).toBe(true);
    }
  });
});
