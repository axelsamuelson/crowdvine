import { describe, expect, it } from "vitest";

import { resolvePactSiteKey } from "@/lib/middleware/request-headers";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { getPublicSiteConfig } from "@/lib/site-config-server";
import { PACT_CONFIG } from "@/lib/site-config";

describe("public ISR shell helpers", () => {
  it("getPublicSiteConfig stays host-neutral (PACT)", () => {
    expect(getPublicSiteConfig()).toEqual(PACT_CONFIG);
  });

  it("fallbackShoppingContext accepts Swedish locale for ISR seed", () => {
    const ctx = fallbackShoppingContext("sv");
    expect(ctx.locale).toBe("sv");
    expect(ctx.currencyCode).toBe("SEK");
  });

  it("resolvePactSiteKey maps dirtywine host", () => {
    expect(resolvePactSiteKey("dirtywine.se", null)).toBe("dirtywine");
    expect(resolvePactSiteKey("www.pactwines.com", null)).toBe("pact");
    expect(
      resolvePactSiteKey("localhost:3000", new URLSearchParams("b2b=1")),
    ).toBe("dirtywine");
  });
});
