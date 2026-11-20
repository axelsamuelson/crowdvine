import { describe, expect, it } from "vitest";
import {
  checkoutContactBlockReason,
  isCheckoutContactComplete,
  isCheckoutEmailComplete,
  isCheckoutPhoneComplete,
  isCheckoutStreetComplete,
} from "@/lib/checkout/delivery-contact";

describe("checkout delivery contact gates", () => {
  it("rejects partial emails like test@ (premature collapse bug)", () => {
    expect(isCheckoutEmailComplete("test@")).toBe(false);
    expect(isCheckoutEmailComplete("test@x")).toBe(false);
    expect(isCheckoutEmailComplete("a@b.c")).toBe(true);
    expect(isCheckoutEmailComplete("guest@example.com")).toBe(true);
    expect(isCheckoutEmailComplete("")).toBe(false);
  });

  it("requires phone with at least 6 chars", () => {
    expect(isCheckoutPhoneComplete("07012")).toBe(false);
    expect(isCheckoutPhoneComplete("070123")).toBe(true);
    expect(isCheckoutPhoneComplete(" 0701234567 ")).toBe(true);
  });

  it("rejects truncated street mid-typing (Camille D collapse)", () => {
    expect(isCheckoutStreetComplete("")).toBe(false);
    expect(isCheckoutStreetComplete("D")).toBe(false);
    expect(isCheckoutStreetComplete("Dr")).toBe(false);
    expect(isCheckoutStreetComplete("Dro")).toBe(false);
    expect(isCheckoutStreetComplete("Drottninggatan")).toBe(false);
    expect(isCheckoutStreetComplete("Drottninggatan 12")).toBe(true);
    expect(isCheckoutStreetComplete("Storgatan 1A")).toBe(true);
    expect(isCheckoutStreetComplete("12a")).toBe(true);
    expect(isCheckoutStreetComplete("  Drottninggatan   12  ")).toBe(true);
  });

  it("address step complete needs name + valid email + phone", () => {
    expect(
      isCheckoutContactComplete({
        fullName: "Test Person",
        email: "test@",
        phone: "0701234567",
      }),
    ).toBe(false);
    expect(
      isCheckoutContactComplete({
        fullName: "Test Person",
        email: "test@example.com",
        phone: null,
      }),
    ).toBe(false);
    expect(
      isCheckoutContactComplete({
        fullName: "Test Person",
        email: "test@example.com",
        phone: "0701234567",
      }),
    ).toBe(true);
  });

  it("returns privacy-safe block reasons", () => {
    expect(
      checkoutContactBlockReason({
        fullName: "A",
        email: "test@",
        phone: "",
      }),
    ).toBe("missing_name");
    expect(
      checkoutContactBlockReason({
        fullName: "Test",
        email: "test@",
        phone: "0701234567",
      }),
    ).toBe("invalid_email");
    expect(
      checkoutContactBlockReason({
        fullName: "Test",
        email: "test@example.com",
        phone: "",
      }),
    ).toBe("missing_phone");
  });
});
