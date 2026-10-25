import { describe, expect, it } from "vitest";

import { extractWineText } from "@/lib/i18n/wine-locale";

describe("extractWineText fallback policy", () => {
  it("falls back to SV by default", () => {
    expect(extractWineText({ sv: "svensk" }, "en")).toBe("svensk");
  });

  it("hides SV on EN when fallback is disabled", () => {
    expect(
      extractWineText({ sv: "svensk" }, "en", { fallback: false }),
    ).toBeNull();
    expect(
      extractWineText({ sv: "svensk", en: "english" }, "en", {
        fallback: false,
      }),
    ).toBe("english");
  });

  it("treats plain strings as SV-only when fallback is disabled", () => {
    expect(extractWineText("legacy swedish", "sv", { fallback: false })).toBe(
      "legacy swedish",
    );
    expect(
      extractWineText("legacy swedish", "en", { fallback: false }),
    ).toBeNull();
  });
});
