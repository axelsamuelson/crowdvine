import { describe, expect, it } from "vitest";

import {
  isGuidePath,
  pactGuideRedirectUrl,
} from "@/lib/guides/dirtywine-guide-redirect";

describe("isGuidePath", () => {
  it("matches hubs and nested guide paths", () => {
    expect(isGuidePath("/guides")).toBe(true);
    expect(isGuidePath("/guides/worlds-best-orange-wines")).toBe(true);
    expect(isGuidePath("/guider")).toBe(true);
    expect(isGuidePath("/guider/pierre-overnoy")).toBe(true);
    expect(isGuidePath("/guides/buy-natural-wine-online-sweden")).toBe(true);
    expect(isGuidePath("/guider/kopa-naturvin-online")).toBe(true);
  });

  it("does not match shop or other public routes", () => {
    expect(isGuidePath("/vin/naturvin")).toBe(false);
    expect(isGuidePath("/wine/carignan")).toBe(false);
    expect(isGuidePath("/guidelines")).toBe(false);
    expect(isGuidePath("/")).toBe(false);
  });
});

describe("pactGuideRedirectUrl", () => {
  it("maps previously indexed dirtywine paths to pact equivalents", () => {
    expect(pactGuideRedirectUrl("/guides/worlds-best-orange-wines")).toBe(
      "https://pactwines.com/guides/worlds-best-orange-wines",
    );
    expect(pactGuideRedirectUrl("/guides/gang-of-four-wine")).toBe(
      "https://pactwines.com/guides/gang-of-four-wine",
    );
    expect(pactGuideRedirectUrl("/guider/pierre-overnoy")).toBe(
      "https://pactwines.com/guider/pierre-overnoy",
    );
    expect(
      pactGuideRedirectUrl("/guides/buy-natural-wine-online-sweden"),
    ).toBe("https://pactwines.com/guides/buy-natural-wine-online-sweden");
    expect(pactGuideRedirectUrl("/guider/kopa-naturvin-online")).toBe(
      "https://pactwines.com/guider/kopa-naturvin-online",
    );
  });

  it("preserves query strings", () => {
    expect(pactGuideRedirectUrl("/guides", "?utm=1")).toBe(
      "https://pactwines.com/guides?utm=1",
    );
  });
});
