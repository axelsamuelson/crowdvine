import { describe, expect, it } from "vitest";

import {
  isPublicAppPath,
  publicPathUsesUserShoppingContext,
} from "@/lib/auth/public-paths";

describe("public paths — wine region pages", () => {
  it("allows /region and /regions without auth gate", () => {
    expect(isPublicAppPath("/region/languedoc")).toBe(true);
    expect(isPublicAppPath("/regions/loire")).toBe(true);
    expect(isPublicAppPath("/region")).toBe(true);
    expect(isPublicAppPath("/regions")).toBe(true);
  });

  it("loads shopping context for region pages (prices)", () => {
    expect(publicPathUsesUserShoppingContext("/region/languedoc")).toBe(true);
    expect(publicPathUsesUserShoppingContext("/regions/loire")).toBe(true);
  });
});
