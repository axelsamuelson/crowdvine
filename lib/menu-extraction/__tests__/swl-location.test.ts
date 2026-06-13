import { describe, expect, it } from "vitest";
import {
  cityNameToSlug,
  isWrongCityForScope,
  parseSwlLocationFromHtml,
} from "../swl-location";

describe("parseSwlLocationFromHtml", () => {
  it("parses escaped JSON from unblock HTML", () => {
    const html = `location: {\"id\":1009,\"name\":\"Stockholm\",\"slug\":\"stockholm\",\"URL\":\"https:\\/\\/starwinelist.com\\/stockholm\"}`;
    expect(parseSwlLocationFromHtml(html)).toEqual({
      slug: "stockholm",
      name: "Stockholm",
    });
  });

  it("parses Barcelona venue", () => {
    const html = `location: {\"id\":1100,\"name\":\"Barcelona\",\"slug\":\"barcelona\"}`;
    expect(parseSwlLocationFromHtml(html)?.slug).toBe("barcelona");
  });

  it("falls back to newest lists city copy (HeJi / Vilnius)", () => {
    const html =
      "Here are the the latest updated wine lists in Vilnius\n- Vinería de Chile";
    expect(parseSwlLocationFromHtml(html)).toEqual({
      slug: "vilnius",
      name: "Vilnius",
    });
  });

  it("falls back to wine-guide slug (Las Vegas)", () => {
    const html =
      'href="/wine-guide/the-26-best-wine-restaurants-and-wine-bars-in-las-vegas-2026"';
    expect(parseSwlLocationFromHtml(html)?.slug).toBe("las-vegas");
  });

  it("returns null when location missing", () => {
    expect(parseSwlLocationFromHtml("<html></html>")).toBeNull();
  });
});

describe("cityNameToSlug", () => {
  it("slugifies Las Vegas", () => {
    expect(cityNameToSlug("Las Vegas")).toBe("las-vegas");
  });
});

describe("isWrongCityForScope", () => {
  it("flags non-stockholm slugs", () => {
    expect(
      isWrongCityForScope({ slug: "germany", name: "Germany" }, "stockholm"),
    ).toBe(true);
  });

  it("flags vilnius by slug", () => {
    expect(
      isWrongCityForScope({ slug: "vilnius", name: "Vilnius" }, "stockholm"),
    ).toBe(true);
  });

  it("allows stockholm", () => {
    expect(
      isWrongCityForScope({ slug: "stockholm", name: "Stockholm" }, "stockholm"),
    ).toBe(false);
  });

  it("flags by name when slug is missing", () => {
    expect(
      isWrongCityForScope({ slug: null, name: "Lithuania" }, "stockholm"),
    ).toBe(true);
  });
});
