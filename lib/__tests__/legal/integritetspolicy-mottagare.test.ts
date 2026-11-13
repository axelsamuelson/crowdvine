import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LEGAL_VERSIONS } from "@/lib/legal/versions";

const POLICY_PATH = join(
  process.cwd(),
  "content/legal/integritetspolicy.tsx",
);

/** Axel-approved 2026-11-13 (queue 01ac3520): Mottagare | Roll | Uppgifter | Land | avtal */
const INSTABEE_ROW = [
  "Instabee (Budbee)",
  "Självständigt personuppgiftsansvarig, hemleverans med ålderskontroll vid delad pall",
  "Namn, adress, telefon, ordernummer",
  "Sverige",
  "Instabee ansvarar självt för sin behandling, inget biträdesavtal",
] as const;

const UPS_ROW = [
  "UPS",
  "Självständigt personuppgiftsansvarig, transport och ålderskontroll vid direktleverans",
  "Namn, adress, telefon, ordernummer",
  "EU, och länder utanför EU enligt UPS egen integritetspolicy",
  "UPS ansvarar självt för sin behandling, inget biträdesavtal",
] as const;

function extractRecipientRows(src: string): string[][] {
  const tableStart = src.indexOf("<LegalTh>Mottagare</LegalTh>");
  expect(tableStart).toBeGreaterThan(-1);
  const tbodyStart = src.indexOf("<tbody>", tableStart);
  const tbodyEnd = src.indexOf("</tbody>", tbodyStart);
  expect(tbodyStart).toBeGreaterThan(-1);
  expect(tbodyEnd).toBeGreaterThan(tbodyStart);
  const tbody = src.slice(tbodyStart, tbodyEnd);
  const rows: string[][] = [];
  const rowRe = /<tr>\s*([\s\S]*?)\s*<\/tr>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(tbody)) !== null) {
    const cells: string[] = [];
    const cellRe = /<LegalTd>([\s\S]*?)<\/LegalTd>/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowMatch[1]!)) !== null) {
      cells.push(cellMatch[1]!.trim());
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

describe("integritetspolicy mottagare (Axel-approved Instabee + UPS)", () => {
  it("embeds exact Instabee (Budbee) and UPS cell strings after Resend", () => {
    const src = readFileSync(POLICY_PATH, "utf8");
    expect(src).not.toContain("[BEKRÄFTA ROLL OCH AVTAL]");
    expect(src).not.toMatch(/<LegalTd>Budbee<\/LegalTd>/);

    const rows = extractRecipientRows(src);
    const resendIdx = rows.findIndex((r) => r[0] === "Resend");
    expect(resendIdx).toBeGreaterThanOrEqual(0);

    expect(rows[resendIdx + 1]).toEqual([...INSTABEE_ROW]);
    expect(rows[resendIdx + 2]).toEqual([...UPS_ROW]);
  });

  it("bumps LEGAL_VERSIONS.privacy to 2026-11-13", () => {
    expect(LEGAL_VERSIONS.privacy).toBe("2026-11-13");
  });

  it("leaves other placeholder rows untouched", () => {
    const src = readFileSync(POLICY_PATH, "utf8");
    for (const name of ["Stripe", "Supabase", "Vercel", "Resend"] as const) {
      expect(src).toContain(`<LegalTd>${name}</LegalTd>`);
    }
    expect(src).toContain("<LegalTd>[BEKRÄFTA]</LegalTd>");
    expect(src).toContain("<LegalTd>[FYLL I REGION]</LegalTd>");
    expect(src).toContain("<LegalTd>[FYLL I]</LegalTd>");
  });
});
