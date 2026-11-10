import { describe, expect, it } from "vitest";
import { resolveWineImageSrc } from "@/lib/cart/wine-image-url";

describe("resolveWineImageSrc", () => {
  it("falls back to static default for empty / default paths", () => {
    expect(resolveWineImageSrc(null)).toBe("/default-wine.png");
    expect(resolveWineImageSrc("")).toBe("/default-wine.png");
    expect(resolveWineImageSrc("/default-wine.png")).toBe("/default-wine.png");
    expect(resolveWineImageSrc("/api/images/default-wine.png")).toBe(
      "/default-wine.png",
    );
    expect(resolveWineImageSrc("/api/images/")).toBe("/default-wine.png");
    expect(
      resolveWineImageSrc(
        "https://crowdvine-baepg06hf-avesamuelson-7603s-projects.vercel.app/default-wine.png",
      ),
    ).toBe("/default-wine.png");
    expect(
      resolveWineImageSrc(
        "https://example.vercel.app/api/images/default-wine.png",
      ),
    ).toBe("/default-wine.png");
  });

  it("maps uploads and bare keys to /api/images", () => {
    expect(resolveWineImageSrc("/uploads/foo.jpg")).toBe("/api/images/foo.jpg");
    expect(resolveWineImageSrc("foo.jpg")).toBe("/api/images/foo.jpg");
  });

  it("keeps absolute http(s) URLs", () => {
    expect(resolveWineImageSrc("https://cdn.example/x.jpg")).toBe(
      "https://cdn.example/x.jpg",
    );
  });
});
