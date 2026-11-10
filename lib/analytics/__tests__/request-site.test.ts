import { describe, expect, it } from "vitest";
import {
  bareHostname,
  deriveAnalyticsSiteFromHost,
  normalizeRequestHost,
} from "@/lib/analytics/request-site";

describe("normalizeRequestHost", () => {
  it("lowercases and strips port", () => {
    expect(normalizeRequestHost("PactWines.com:443")).toBe("pactwines.com");
  });

  it("takes first host from a list", () => {
    expect(normalizeRequestHost("dirtywine.se, other.example")).toBe(
      "dirtywine.se",
    );
  });

  it("returns empty for missing", () => {
    expect(normalizeRequestHost(null)).toBe("");
    expect(normalizeRequestHost(undefined)).toBe("");
    expect(normalizeRequestHost("  ")).toBe("");
  });
});

describe("bareHostname", () => {
  it("strips www", () => {
    expect(bareHostname("www.pactwines.com")).toBe("pactwines.com");
  });
});

describe("deriveAnalyticsSiteFromHost", () => {
  it("maps pactwines.com and www to pact", () => {
    expect(deriveAnalyticsSiteFromHost("pactwines.com")).toEqual({
      host: "pactwines.com",
      site: "pact",
    });
    expect(deriveAnalyticsSiteFromHost("www.pactwines.com")).toEqual({
      host: "www.pactwines.com",
      site: "pact",
    });
  });

  it("maps dirtywine.se and www to dirtywine", () => {
    expect(deriveAnalyticsSiteFromHost("dirtywine.se")).toEqual({
      host: "dirtywine.se",
      site: "dirtywine",
    });
    expect(deriveAnalyticsSiteFromHost("WWW.dirtywine.se")).toEqual({
      host: "www.dirtywine.se",
      site: "dirtywine",
    });
  });

  it("maps everything else to other and keeps raw host", () => {
    expect(deriveAnalyticsSiteFromHost("preview.vercel.app")).toEqual({
      host: "preview.vercel.app",
      site: "other",
    });
    expect(deriveAnalyticsSiteFromHost("localhost:3000")).toEqual({
      host: "localhost",
      site: "other",
    });
  });
});
