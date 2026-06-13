import { describe, expect, it } from "vitest";
import {
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

  it("returns null when location missing", () => {
    expect(parseSwlLocationFromHtml("<html></html>")).toBeNull();
  });
});

describe("isWrongCityForScope", () => {
  it("flags non-stockholm slugs", () => {
    expect(
      isWrongCityForScope({ slug: "germany", name: "Germany" }, "stockholm"),
    ).toBe(true);
  });

  it("allows stockholm", () => {
    expect(
      isWrongCityForScope({ slug: "stockholm", name: "Stockholm" }, "stockholm"),
    ).toBe(false);
  });

  it("does not flag when slug is missing", () => {
    expect(isWrongCityForScope({ slug: null, name: "Global" }, "stockholm")).toBe(
      false,
    );
  });
});
