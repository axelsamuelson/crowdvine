import { describe, expect, it } from "vitest";

import { DIRTYWINE_PRIVACY_PROCESSORS } from "@/content/legal/integritetspolicy-dirtywine";

describe("Dirty Wine privacy processors", () => {
  it("lists only evidenced processors with service, purpose, and country", () => {
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
    ]);
  });

  it("does not claim Resend or Stripe without Dirty Wine evidence", () => {
    const services = DIRTYWINE_PRIVACY_PROCESSORS.map((p) => p.service);
    expect(services).not.toContain("Resend");
    expect(services).not.toContain("Stripe");
    expect(services).not.toContain("Budbee");
  });
});
