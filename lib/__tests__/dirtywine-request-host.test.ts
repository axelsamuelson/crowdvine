import { describe, expect, it } from "vitest";
import { isDirtywineRequest } from "@/lib/b2b-site";

function hdrs(map: Record<string, string>) {
  return { get: (k: string) => map[k.toLowerCase()] ?? map[k] ?? null };
}

describe("isDirtywineRequest", () => {
  it("detects dirtywine Host", () => {
    expect(isDirtywineRequest(hdrs({ host: "dirtywine.se" }))).toBe(true);
  });
  it("detects Origin on shared preview Host", () => {
    expect(
      isDirtywineRequest(
        hdrs({
          host: "crowdvine-preview.vercel.app",
          origin: "http://dirtywine.se:3099",
        }),
      ),
    ).toBe(true);
  });
  it("stays false for pact preview without dirty origin", () => {
    expect(
      isDirtywineRequest(hdrs({ host: "crowdvine-preview.vercel.app" })),
    ).toBe(false);
  });
});
