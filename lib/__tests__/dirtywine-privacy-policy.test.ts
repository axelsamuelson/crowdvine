import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DIRTYWINE_PRIVACY_PROCESSORS } from "@/content/legal/integritetspolicy-dirtywine";

describe("Dirty Wine privacy processors", () => {
  it("lists evidenced processors including Resend with service, purpose, and country", () => {
    expect(DIRTYWINE_PRIVACY_PROCESSORS).toEqual([
      {
        service: "Vercel",
        purpose: "Hosting och webbstatistik",
        country: "Sverige (arn1) / USA",
      },
      {
        service: "Supabase",
        purpose: "Databas, autentisering och lagring av användarhändelser",
        country: "Sverige (eu-north-1)",
      },
      {
        service: "Resend",
        purpose: "Utskick av bekräftelse- och kontomejl",
        country: "USA",
      },
    ]);
  });

  it("includes the exact USA transfer sentence and dirtywine intro", () => {
    const src = readFileSync(
      join(process.cwd(), "content/legal/integritetspolicy-dirtywine.tsx"),
      "utf8",
    );
    expect(src).toContain(
      "Vid överföring till USA används EU–US Data Privacy Framework eller EU:s standardavtalsklausuler, beroende på leverantör.",
    );
    expect(src).toContain("Den här policyn gäller dirtywine.se.");
    expect(src).not.toContain("Integritetspolicy för Dirty Wine");
    expect(src).toContain('mailto:axel@dirtywine.se');
    expect(src).toContain("https://imy.se");
  });

  it("does not claim Stripe or Budbee", () => {
    const services = DIRTYWINE_PRIVACY_PROCESSORS.map((p) => p.service);
    expect(services).not.toContain("Stripe");
    expect(services).not.toContain("Budbee");
  });
});
