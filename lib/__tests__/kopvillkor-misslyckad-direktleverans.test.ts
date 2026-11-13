import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  EN_AGE_CHECK_NEW,
  EN_FAILED_HANDOVER,
  EN_TRANSPORT_NEW,
  KOPVILLKOR_2026_11_13_SHA256,
  SV_AGE_CHECK_NEW,
  SV_FAILED_HANDOVER,
  SV_TRANSPORT_NEW,
} from "@/lib/legal/kopvillkor-2026-11-13-amendment";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { CHECKOUT_TERMS_VERSION } from "@/lib/checkout/terms-version";

const APPROVED_CANDIDATES = [
  resolve(
    "/cursor/stores/bot/handoff/kopvillkor-misslyckad-direktleverans-GODKAND-2026-11-13.md",
  ),
  resolve("uploads/kopvillkor-misslyckad-direktleverans-GODKAND-2026-11-13.md"),
];

function loadApproved(): string {
  for (const p of APPROVED_CANDIDATES) {
    if (existsSync(p)) return readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  }
  throw new Error("Approved misslyckad-direktleverans file not found");
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

describe("köpvillkor misslyckad direktleverans (GODKAND-2026-11-13)", () => {
  it("matches approved sha256 and publishable SV/EN excerpts in sources + tsx", () => {
    const approved = loadApproved();
    expect(createHash("sha256").update(approved).digest("hex")).toBe(
      KOPVILLKOR_2026_11_13_SHA256,
    );

    const svMd = readFileSync(
      resolve("content/legal/source/kopvillkor.sv.md"),
      "utf8",
    ).replace(/\r\n/g, "\n");
    const enMd = readFileSync(
      resolve("content/legal/source/kopvillkor.en.md"),
      "utf8",
    ).replace(/\r\n/g, "\n");
    const svTsx = readFileSync(
      resolve("content/legal/kopvillkor.tsx"),
      "utf8",
    );
    const enTsx = readFileSync(
      resolve("content/legal/kopvillkor-en.tsx"),
      "utf8",
    );
    const flatten = (s: string) =>
      s
        .replace(/\{\s*"\s*"\s*\}/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");
    const svFlat = flatten(svTsx);
    const enFlat = flatten(enTsx);

    for (const excerpt of [
      SV_AGE_CHECK_NEW,
      SV_FAILED_HANDOVER,
      SV_TRANSPORT_NEW,
    ]) {
      expect(svMd.includes(excerpt), `sv.md missing: ${excerpt.slice(0, 48)}`).toBe(
        true,
      );
    }
    for (const excerpt of [
      EN_AGE_CHECK_NEW,
      EN_FAILED_HANDOVER,
      EN_TRANSPORT_NEW,
    ]) {
      expect(enMd.includes(excerpt), `en.md missing: ${excerpt.slice(0, 48)}`).toBe(
        true,
      );
    }

    // TSX flatten turns </LegalLink>. into " ." — check bodies without that junction.
    for (const phrase of [
      "UPS kontrollerar vid överlämningen att mottagaren har fyllt 20 år. Visa giltig legitimation. Går ålderskontrollen inte igenom lämnas vinet inte ut.",
      "Om lådan inte kan lämnas över. Kan UPS inte lämna över lådan",
      "Vid delad pall: Om du inte är hemma",
      "För direktleverans gäller",
    ]) {
      expect(svFlat.includes(phrase), `kopvillkor.tsx missing: ${phrase}`).toBe(
        true,
      );
    }
    for (const phrase of [
      "UPS checks at handover that the recipient is at least 20 years old. Show valid ID. If the age check fails, the wine will not be handed over.",
      "If the box cannot be handed over. If UPS cannot hand over the box",
      "For shared pallets: If you are not at home",
      "For direct delivery, point 3 b applies.",
    ]) {
      expect(
        enFlat.includes(phrase),
        `kopvillkor-en.tsx missing: ${phrase}`,
      ).toBe(true);
    }

    // Quoted publishable lines from the locked handoff (not headings/notes).
    const svQuote1 = stripQuotes(
      approved.match(
        /## Ändring 1[\s\S]*?SV: ("[^"]+")/,
      )?.[1] ?? "",
    );
    const enQuote1 = stripQuotes(
      approved.match(
        /## Ändring 1[\s\S]*?EN: ("[^"]+")/,
      )?.[1] ?? "",
    );
    expect(svQuote1.length).toBeGreaterThan(20);
    expect(enQuote1.length).toBeGreaterThan(20);
    expect(svMd).toContain(svQuote1);
    expect(enMd).toContain(enQuote1);
    expect(svFlat).toContain(svQuote1);
    expect(enFlat).toContain(enQuote1);

    expect(svTsx).toContain('id="punkt-3b"');
    expect(enTsx).toContain('id="punkt-3b"');
    expect(svTsx).toContain('href="#punkt-3b">punkt 3 b<');
    expect(enTsx).toContain('href="#punkt-3b">point 3 b<');
    expect(svTsx).toContain(
      "<LegalStrong>Om lådan inte kan lämnas över.</LegalStrong>",
    );
    expect(enTsx).toContain(
      "<LegalStrong>If the box cannot be handed over.</LegalStrong>",
    );
  });

  it("bumps terms version to 2026-11-13 everywhere acceptance keys off", () => {
    expect(LEGAL_VERSIONS.terms).toBe("2026-11-13");
    expect(CHECKOUT_TERMS_VERSION).toBe("2026-11-13");
    expect(
      readFileSync(resolve("content/legal/source/kopvillkor.sv.md"), "utf8"),
    ).toContain("Senast uppdaterad: 2026-11-13");
    expect(
      readFileSync(resolve("content/legal/source/kopvillkor.en.md"), "utf8"),
    ).toContain("Last updated: 2026-11-13");
  });
});
