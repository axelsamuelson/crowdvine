import { describe, expect, it } from "vitest";
import { classifyPath } from "@/lib/analytics/v2/page-types";

describe("classifyPath (H3)", () => {
  it("classifies start", () => {
    expect(classifyPath("/")).toBe("start");
    expect(classifyPath("/en")).toBe("start");
  });

  it("classifies PDP as /produkt and /product, not /vin/slug", () => {
    expect(classifyPath("/produkt/foo")).toBe("pdp");
    expect(classifyPath("/product/foo")).toBe("pdp");
    expect(classifyPath("/b/x/product/foo")).toBe("pdp");
    expect(classifyPath("/vin/domaine-x")).toBe("plp");
    expect(classifyPath("/wine/domaine-x")).toBe("plp");
  });

  it("classifies PLP, guide, checkout, account, producer", () => {
    expect(classifyPath("/vin")).toBe("plp");
    expect(classifyPath("/wine")).toBe("plp");
    expect(classifyPath("/vin/group/abc")).toBe("plp");
    expect(classifyPath("/guider/natural")).toBe("guide");
    expect(classifyPath("/guides/natural")).toBe("guide");
    expect(classifyPath("/checkout")).toBe("checkout");
    expect(classifyPath("/checkout/success")).toBe("checkout");
    expect(classifyPath("/profile")).toBe("account");
    expect(classifyPath("/log-in")).toBe("account");
    expect(classifyPath("/producenter")).toBe("producer");
    expect(classifyPath("/producers/foo")).toBe("producer");
  });
});
