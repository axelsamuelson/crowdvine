import { describe, expect, it } from "vitest";
import {
  EXIT_DISCOUNT_ACCOUNT_BULLETS,
  EXIT_DISCOUNT_ACCOUNT_CTA,
  EXIT_DISCOUNT_ACCOUNT_DECLINE,
  EXIT_DISCOUNT_ACCOUNT_HEADING,
  exitDiscountSignupHref,
} from "@/lib/exit-discount/account-copy";

describe("exit discount account copy", () => {
  it("matches Juliette copy including updated invite bullet", () => {
    expect(EXIT_DISCOUNT_ACCOUNT_HEADING).toBe(
      "Skapa ett konto och få ut mer av PACT",
    );
    expect([...EXIT_DISCOUNT_ACCOUNT_BULLETS]).toEqual([
      "Följ dina reservationer och se hur det går med pallen, från att den samlas ihop tills den är full.",
      "Gör smakquizet och få vinförslag som passar dig.",
      "Lås upp medlemsnivåer och förmåner.",
      "Bjud in vänner till PACT och lås upp belöningar",
    ]);
    expect(EXIT_DISCOUNT_ACCOUNT_CTA).toBe("Skapa konto");
    expect(EXIT_DISCOUNT_ACCOUNT_DECLINE).toBe("Nej tack, inte nu");
  });

  it("prefills signup email without creating an account", () => {
    expect(exitDiscountSignupHref("a@b.com")).toBe(
      "/signup?email=a%40b.com",
    );
  });
});
