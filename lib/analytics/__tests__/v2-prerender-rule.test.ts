import { describe, expect, it } from "vitest";
import { isPrerenderSuspect } from "@/lib/analytics/v2/prerender";

describe("isPrerenderSuspect (D1)", () => {
  const base = {
    startedAt: "2026-11-05T12:00:00.000Z",
    landingUrl: "https://pactwines.com/wine",
    referrer: "https://www.google.com/",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1",
    engaged: false,
  };

  it("flags Chrome iOS Google → /wine without query, unengaged, after 2026-11-02", () => {
    expect(isPrerenderSuspect(base)).toBe(true);
  });

  it("rejects before 2026-11-02", () => {
    expect(
      isPrerenderSuspect({ ...base, startedAt: "2026-11-01T23:59:59.000Z" }),
    ).toBe(false);
  });

  it("rejects non-CriOS UA", () => {
    expect(
      isPrerenderSuspect({
        ...base,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      }),
    ).toBe(false);
  });

  it("rejects non-google referrer", () => {
    expect(
      isPrerenderSuspect({ ...base, referrer: "https://facebook.com/" }),
    ).toBe(false);
  });

  it("rejects engaged sessions", () => {
    expect(isPrerenderSuspect({ ...base, engaged: true })).toBe(false);
  });

  it("rejects landing with query or trailing path", () => {
    expect(
      isPrerenderSuspect({
        ...base,
        landingUrl: "https://pactwines.com/wine?utm_source=google",
      }),
    ).toBe(false);
    expect(
      isPrerenderSuspect({
        ...base,
        landingUrl: "https://pactwines.com/wine/",
      }),
    ).toBe(false);
    expect(
      isPrerenderSuspect({
        ...base,
        landingUrl: "https://pactwines.com/vin",
      }),
    ).toBe(false);
  });
});
