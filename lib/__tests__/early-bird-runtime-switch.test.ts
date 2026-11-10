import { describe, expect, it, vi, beforeEach } from "vitest";
import { getPalletDiscountTier } from "@/lib/pallet-discount";
import { applyPalletDiscountOre } from "@/lib/pricing/discounts";
import {
  EARLY_BIRD_PALLET_DISCOUNT_ENABLED_KEY,
  parseEarlyBirdPalletDiscountEnabled,
  resolvePalletDiscountTier,
} from "@/lib/pricing/early-bird-config";
import {
  MEMBER_TIER_DISCOUNT_ENABLED_KEY,
  parseMemberTierDiscountEnabled,
} from "@/lib/membership/member-discount-config";
import { formatCartDiscountLabel } from "@/lib/cart/discount-label";
import {
  b2cLineTotalSek,
  b2cWholeKronorFromOre,
} from "@/lib/cart/b2c-line-pricing";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@/lib/actions/content", () => ({
  getSiteContentByKey: vi.fn(),
  updateSiteContent: vi.fn(),
}));

import { getSiteContentByKey } from "@/lib/actions/content";

describe("early-bird + member discount runtime switches (site_content)", () => {
  beforeEach(() => {
    vi.mocked(getSiteContentByKey).mockReset();
  });

  it("defaults early-bird to DISABLED when key missing", () => {
    expect(parseEarlyBirdPalletDiscountEnabled(null)).toBe(false);
    expect(parseEarlyBirdPalletDiscountEnabled("")).toBe(false);
    expect(parseEarlyBirdPalletDiscountEnabled("false")).toBe(false);
    expect(parseEarlyBirdPalletDiscountEnabled("true")).toBe(true);
  });

  it("defaults member-tier discount to DISABLED when key missing", () => {
    expect(parseMemberTierDiscountEnabled(null)).toBe(false);
    expect(parseMemberTierDiscountEnabled("")).toBe(false);
    expect(parseMemberTierDiscountEnabled("true")).toBe(true);
    expect(MEMBER_TIER_DISCOUNT_ENABLED_KEY).toBe(
      "member_tier_discount_enabled",
    );
  });

  it("getPalletDiscountTier returns 0 when enabled:false (default schedule still coded)", () => {
    expect(getPalletDiscountTier(0, { enabled: false })).toBe(0);
    expect(getPalletDiscountTier(50, { enabled: false })).toBe(0);
    expect(getPalletDiscountTier(50, { enabled: true })).toBe(20);
    expect(getPalletDiscountTier(150, { enabled: true })).toBe(10);
  });

  it("resolvePalletDiscountTier is 0 by default (missing site_content)", async () => {
    vi.mocked(getSiteContentByKey).mockResolvedValueOnce(null);
    expect(await resolvePalletDiscountTier(40)).toBe(0);
    expect(getSiteContentByKey).toHaveBeenCalledWith(
      EARLY_BIRD_PALLET_DISCOUNT_ENABLED_KEY,
    );

    vi.mocked(getSiteContentByKey).mockResolvedValueOnce("true");
    expect(await resolvePalletDiscountTier(40)).toBe(20);
  });

  it("0% / off: no label and cart=checkout=charge at full list price", () => {
    const listOre = 10700;
    const listUnitSek = b2cWholeKronorFromOre(listOre);
    expect(listUnitSek).toBe(107);

    const off = b2cLineTotalSek({
      listUnitSek,
      memberPercent: 0,
      earlyBirdTier: 0,
      quantity: 6,
    });
    expect(off.unitSek).toBe(107);
    expect(off.lineTotalSek).toBe(642);
    expect(applyPalletDiscountOre(listOre, 0)).toBe(listOre);

    expect(
      formatCartDiscountLabel({
        memberPercent: 0,
        earlyBirdPercent: 0,
        locale: "sv",
      }),
    ).toBeUndefined();
    expect(
      formatCartDiscountLabel({
        memberPercent: 15,
        earlyBirdPercent: 0,
        memberName: "Privilege",
        locale: "sv",
      }),
    ).toBe("Privilege 15%");
  });

  it("wires resolvePalletDiscountTier into cart/zone paths; badge hides at 0%", () => {
    const earlyBirdCtx = readFileSync(
      resolve(process.cwd(), "lib/pallet-early-bird-context.ts"),
      "utf8",
    );
    const zoneStatus = readFileSync(
      resolve(process.cwd(), "lib/pallet/get-zone-status.ts"),
      "utf8",
    );
    const charge = readFileSync(
      resolve(process.cwd(), "lib/reservation-auto-charge.ts"),
      "utf8",
    );
    const memberServer = readFileSync(
      resolve(process.cwd(), "lib/membership/server-member-discount.ts"),
      "utf8",
    );
    const badge = readFileSync(
      resolve(process.cwd(), "components/pdp/early-bird-badge.tsx"),
      "utf8",
    );
    expect(earlyBirdCtx).toMatch(/resolvePalletDiscountTier/);
    expect(zoneStatus).toMatch(/resolvePalletDiscountTier/);
    expect(charge).toMatch(/resolvePalletEarlyBirdContext/);
    expect(memberServer).toMatch(/isMemberTierDiscountEnabled/);
    expect(badge).toMatch(/earlyBirdPercent <= 0/);
  });
});
