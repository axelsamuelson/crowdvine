import { describe, expect, it } from "vitest";

import { systembolagetImageUrl } from "@/lib/systembolaget/guide-wines";

describe("systembolagetImageUrl", () => {
  const bare =
    "https://product-cdn.systembolaget.se/productimages/24544725/24544725";

  it("appends _{size}.png when the stored CDN path has no extension", () => {
    expect(systembolagetImageUrl(bare, 400)).toBe(`${bare}_400.png`);
    expect(systembolagetImageUrl(bare, 200)).toBe(`${bare}_200.png`);
  });

  it("leaves already-sized assets alone", () => {
    expect(systembolagetImageUrl(`${bare}_400.png`, 200)).toBe(
      `${bare}_400.png`,
    );
    expect(systembolagetImageUrl(`${bare}_200.webp`, 400)).toBe(
      `${bare}_200.webp`,
    );
  });

  it("returns null for empty input", () => {
    expect(systembolagetImageUrl(null)).toBeNull();
    expect(systembolagetImageUrl("   ")).toBeNull();
  });
});
