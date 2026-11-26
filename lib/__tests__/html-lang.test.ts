import { describe, expect, it } from "vitest";

import {
  htmlLangForPath,
  pathnameFromRenderRoute,
} from "@/lib/i18n/html-lang";

describe("htmlLangForPath", () => {
  it("uses English for English shop paths and Swedish otherwise", () => {
    expect(htmlLangForPath("/wine")).toBe("en");
    expect(htmlLangForPath("/wine/orange-natural-wine")).toBe("en");
    expect(htmlLangForPath("/product/en-blanc")).toBe("en");
    expect(htmlLangForPath("/producers/arpaye")).toBe("en");
    expect(htmlLangForPath("/guides/what-is-natural-wine")).toBe("en");
    expect(htmlLangForPath("/about")).toBe("en");
    expect(htmlLangForPath("/terms")).toBe("en");
    expect(htmlLangForPath("/en")).toBe("en");
    expect(htmlLangForPath("/en/checkout")).toBe("en");

    expect(htmlLangForPath("/")).toBe("sv");
    expect(htmlLangForPath("/vin")).toBe("sv");
    expect(htmlLangForPath("/guider/vad-ar-naturvin")).toBe("sv");
    expect(htmlLangForPath("/om-oss")).toBe("sv");
    expect(htmlLangForPath("/checkout")).toBe("sv");
    expect(htmlLangForPath(null)).toBe("sv");
  });
});

describe("pathnameFromRenderRoute", () => {
  it("turns a page file route into a public path", () => {
    expect(pathnameFromRenderRoute("/wine")).toBe("/wine");
    expect(pathnameFromRenderRoute("/product/[handle]")).toBe(
      "/product/[handle]",
    );
    expect(pathnameFromRenderRoute("/guides/[slug]/page")).toBe(
      "/guides/[slug]",
    );
    expect(pathnameFromRenderRoute("/(shop)/about")).toBe("/about");
    expect(pathnameFromRenderRoute("")).toBe("/");
  });
});
