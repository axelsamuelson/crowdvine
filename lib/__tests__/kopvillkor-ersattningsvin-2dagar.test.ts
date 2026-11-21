import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EN_REPLACEMENT_WINE_REPLY_BULLET,
  EN_TRANSPORT_P1_NEW,
  SV_REPLACEMENT_WINE_REPLY_BULLET,
  SV_TRANSPORT_P1_NEW,
} from "@/lib/legal/kopvillkor-2026-11-13-amendment";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { CHECKOUT_TERMS_VERSION } from "@/lib/checkout/terms-version";

describe("köpvillkor ersättningsvin 2 arbetsdagar (2026-11-13)", () => {
  it("embeds exact SV/EN fourth bullets with bold deadline in md + tsx", () => {
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

    expect(SV_REPLACEMENT_WINE_REPLY_BULLET).toContain("**2 arbetsdagar**");
    expect(EN_REPLACEMENT_WINE_REPLY_BULLET).toContain("**2 working days**");

    expect(svMd).toContain(`- ${SV_REPLACEMENT_WINE_REPLY_BULLET}`);
    expect(enMd).toContain(`- ${EN_REPLACEMENT_WINE_REPLY_BULLET}`);

    // Fourth bullet must be last under "Om en producent inte kan leverera".
    const svSection = svMd.slice(
      svMd.indexOf("### Om en producent inte kan leverera"),
      svMd.indexOf("\n---", svMd.indexOf("### Om en producent inte kan leverera")),
    );
    const svBullets = [...svSection.matchAll(/^- .+$/gm)].map((m) => m[0]);
    expect(svBullets).toHaveLength(4);
    expect(svBullets[3]).toBe(`- ${SV_REPLACEMENT_WINE_REPLY_BULLET}`);

    const enSection = enMd.slice(
      enMd.indexOf("### If a producer cannot deliver"),
      enMd.indexOf("\n---", enMd.indexOf("### If a producer cannot deliver")),
    );
    const enBullets = [...enSection.matchAll(/^- .+$/gm)].map((m) => m[0]);
    expect(enBullets).toHaveLength(4);
    expect(enBullets[3]).toBe(`- ${EN_REPLACEMENT_WINE_REPLY_BULLET}`);

    expect(svTsx).toContain("<LegalStrong>2 arbetsdagar</LegalStrong>");
    expect(enTsx).toContain("<LegalStrong>2 working days</LegalStrong>");

    const flatten = (s: string) =>
      s
        .replace(/\{\s*"\s*"\s*\}/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");

    expect(flatten(svTsx)).toContain(
      SV_REPLACEMENT_WINE_REPLY_BULLET.replace(/\*\*/g, ""),
    );
    expect(flatten(enTsx)).toContain(
      EN_REPLACEMENT_WINE_REPLY_BULLET.replace(/\*\*/g, ""),
    );
  });

  it("bolds punkt 8 shared-pallet lead-ins in md + tsx", () => {
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

    expect(SV_TRANSPORT_P1_NEW.startsWith("**Vid delad pall:**")).toBe(true);
    expect(EN_TRANSPORT_P1_NEW.startsWith("**For shared pallets:**")).toBe(
      true,
    );
    expect(svMd).toContain(SV_TRANSPORT_P1_NEW);
    expect(enMd).toContain(EN_TRANSPORT_P1_NEW);
    expect(svTsx).toContain(
      "<LegalStrong>Vid delad pall:</LegalStrong>",
    );
    expect(enTsx).toContain(
      "<LegalStrong>For shared pallets:</LegalStrong>",
    );
  });

  it("keeps terms version 2026-11-13", () => {
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
