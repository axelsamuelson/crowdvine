import { describe, expect, it } from "vitest";
import { classifyPath } from "@/lib/analytics/v2/page-types";

describe("classifyPath (Hugo H3)", () => {
  it("classifies start", () => {
    expect(classifyPath("/")).toBe("start");
    expect(classifyPath("/en")).toBe("start");
    expect(classifyPath("/en/")).toBe("start");
  });

  it("classifies PLP (vin/wine + collections + group)", () => {
    expect(classifyPath("/vin")).toBe("plp");
    expect(classifyPath("/wine")).toBe("plp");
    expect(classifyPath("/vin/")).toBe("plp");
    expect(classifyPath("/vin/orange")).toBe("plp");
    expect(classifyPath("/wine/group/abc")).toBe("plp");
    expect(classifyPath("/vin/group/xyz/")).toBe("plp");
  });

  it("classifies PDP (produkt/product + b-code)", () => {
    expect(classifyPath("/produkt/foo")).toBe("pdp");
    expect(classifyPath("/product/foo")).toBe("pdp");
    expect(classifyPath("/b/ABC/product/foo")).toBe("pdp");
    // /vin/slug is PLP (producer-filtered shop), not PDP
    expect(classifyPath("/vin/foo")).toBe("plp");
  });

  it("classifies guide, checkout, account, producer", () => {
    expect(classifyPath("/guider")).toBe("guide");
    expect(classifyPath("/guides/best")).toBe("guide");
    expect(classifyPath("/checkout")).toBe("checkout");
    expect(classifyPath("/checkout/success")).toBe("checkout");
    expect(classifyPath("/profile")).toBe("account");
    expect(classifyPath("/log-in")).toBe("account");
    expect(classifyPath("/signup")).toBe("account");
    expect(classifyPath("/invite-signup")).toBe("account");
    expect(classifyPath("/code-signup")).toBe("account");
    expect(classifyPath("/access-request")).toBe("account");
    expect(classifyPath("/onboarding")).toBe("account");
    expect(classifyPath("/producenter")).toBe("producer");
    expect(classifyPath("/producers/foo")).toBe("producer");
  });

  it("falls back to other (null/empty → start, like SQL)", () => {
    expect(classifyPath("/admin")).toBe("other");
    expect(classifyPath("/om")).toBe("other");
    expect(classifyPath(null)).toBe("start");
    expect(classifyPath("")).toBe("start");
  });

  it("accepts full URLs", () => {
    expect(classifyPath("https://pactwines.com/product/x")).toBe("pdp");
    expect(classifyPath("https://pactwines.com/wine?utm=1")).toBe("plp");
  });
});
