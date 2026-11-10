import { describe, expect, it } from "vitest";
import {
  buildPalletCloseActionPath,
  buildPalletCloseActionUrl,
} from "@/lib/checkout/pallet-close/tokens";

describe("pallet-close action URLs", () => {
  it("maps switch_direct to hyphenated path segment", () => {
    expect(buildPalletCloseActionPath("switch_direct", "tok")).toBe(
      "/pallet-close/switch-direct?token=tok",
    );
  });

  it("keeps wait and cancel path segments", () => {
    expect(buildPalletCloseActionPath("wait", "abc")).toBe(
      "/pallet-close/wait?token=abc",
    );
    expect(buildPalletCloseActionPath("cancel", "xyz")).toBe(
      "/pallet-close/cancel?token=xyz",
    );
  });

  it("prefixes app origin", () => {
    expect(
      buildPalletCloseActionUrl("wait", "t1", "https://pactwines.com"),
    ).toBe("https://pactwines.com/pallet-close/wait?token=t1");
  });
});
