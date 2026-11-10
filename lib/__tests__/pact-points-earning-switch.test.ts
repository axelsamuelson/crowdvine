import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PACT_POINTS_EARNING_ENABLED_KEY,
  parsePactPointsEarningEnabled,
} from "@/lib/membership/pact-points-earning-parse";
import {
  MEMBER_TIER_DISCOUNT_ENABLED_KEY,
  parseMemberTierDiscountEnabled,
} from "@/lib/membership/member-discount-config";
import {
  b2cLineTotalSek,
  b2cWholeKronorFromOre,
} from "@/lib/cart/b2c-line-pricing";
import { formatCartDiscountLabel } from "@/lib/cart/discount-label";

vi.mock("@/lib/actions/content", () => ({
  getSiteContentByKey: vi.fn(),
  updateSiteContent: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
          limit: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
          gt: () => ({
            gt: async () => ({ data: [], error: null }),
          }),
        }),
        maybeSingle: async () => ({ data: null, error: null }),
      }),
    }),
    rpc: vi.fn(async () => {
      throw new Error("award_pact_points must not be called when earning OFF");
    }),
  }),
}));

import { getSiteContentByKey } from "@/lib/actions/content";
import { isPactPointsEarningEnabled } from "@/lib/membership/pact-points-earning-config";
import {
  awardPactPointsForOwnOrder,
  awardPactPointsWelcomeBonus,
  awardPactPointsForInviteFirstOrder,
  awardPactPointsForReview,
  awardPactPointsForZoneSet,
} from "@/lib/membership/pact-points-engine";
import {
  awardPointsForOwnOrder,
  awardPointsForInviteSignup,
  awardPointsForReview,
  awardPointsForShare,
} from "@/lib/membership/points-engine";

describe("pact_points_earning_enabled runtime switch", () => {
  beforeEach(() => {
    vi.mocked(getSiteContentByKey).mockReset();
  });

  it("defaults to DISABLED when key missing", () => {
    expect(parsePactPointsEarningEnabled(null)).toBe(false);
    expect(parsePactPointsEarningEnabled("")).toBe(false);
    expect(parsePactPointsEarningEnabled("false")).toBe(false);
    expect(parsePactPointsEarningEnabled("true")).toBe(true);
    expect(PACT_POINTS_EARNING_ENABLED_KEY).toBe("pact_points_earning_enabled");
  });

  it("isPactPointsEarningEnabled reads site_content and defaults OFF", async () => {
    vi.mocked(getSiteContentByKey).mockResolvedValueOnce(null);
    expect(await isPactPointsEarningEnabled()).toBe(false);
    expect(getSiteContentByKey).toHaveBeenCalledWith(
      PACT_POINTS_EARNING_ENABLED_KEY,
    );

    vi.mocked(getSiteContentByKey).mockResolvedValueOnce("true");
    expect(await isPactPointsEarningEnabled()).toBe(true);
  });

  it("gates all PACT + Impact award paths when switch OFF (no RPC)", async () => {
    vi.mocked(getSiteContentByKey).mockResolvedValue(null);

    const own = await awardPactPointsForOwnOrder("u1", 6, "ord1", "basic");
    expect(own.success).toBe(true);
    expect(own.pointsAwarded).toBe(0);

    const welcome = await awardPactPointsWelcomeBonus("u1");
    expect(welcome.success).toBe(true);

    const invite = await awardPactPointsForInviteFirstOrder("inv", "ee", "ord1");
    expect(invite.success).toBe(true);

    const review = await awardPactPointsForReview("u1", "ord1");
    expect(review.success).toBe(true);

    const zone = await awardPactPointsForZoneSet("u1");
    expect(zone.success).toBe(true);

    const ipOwn = await awardPointsForOwnOrder("u1", 6, "ord1");
    expect(ipOwn.success).toBe(true);
    expect(ipOwn.newTotal).toBe(0);

    const ipInvite = await awardPointsForInviteSignup("inv", "ee");
    expect(ipInvite.success).toBe(true);

    const ipReview = await awardPointsForReview("u1");
    expect(ipReview.success).toBe(true);

    const ipShare = await awardPointsForShare("u1", "wine");
    expect(ipShare.success).toBe(true);
  });

  it("founding / member tier OFF → full list price 6×107 + 99 shipping = 741 kr", () => {
    expect(parseMemberTierDiscountEnabled(null)).toBe(false);
    expect(MEMBER_TIER_DISCOUNT_ENABLED_KEY).toBe(
      "member_tier_discount_enabled",
    );

    const listOre = 10700;
    const listUnitSek = b2cWholeKronorFromOre(listOre);
    expect(listUnitSek).toBe(107);

    // Founding 15% would have been memberPercent:15 — with switch OFF → 0
    const off = b2cLineTotalSek({
      listUnitSek,
      memberPercent: 0,
      earlyBirdTier: 0,
      quantity: 6,
    });
    expect(off.unitSek).toBe(107);
    expect(off.lineTotalSek).toBe(642);
    expect(off.lineTotalSek + 99).toBe(741);

    expect(
      formatCartDiscountLabel({
        memberPercent: 0,
        earlyBirdPercent: 0,
        memberName: "Founding Member",
        locale: "sv",
      }),
    ).toBeUndefined();
  });

  it("wires earning gate into engines + founding grant; UI conditions earn copy", () => {
    const pactEngine = readFileSync(
      resolve(process.cwd(), "lib/membership/pact-points-engine.ts"),
      "utf8",
    );
    const pointsEngine = readFileSync(
      resolve(process.cwd(), "lib/membership/points-engine.ts"),
      "utf8",
    );
    const founding = readFileSync(
      resolve(process.cwd(), "lib/membership/founding-member.ts"),
      "utf8",
    );
    const progression = readFileSync(
      resolve(process.cwd(), "lib/membership/progression-rewards.ts"),
      "utf8",
    );
    const profile = readFileSync(
      resolve(process.cwd(), "app/profile/page.tsx"),
      "utf8",
    );
    const membershipApi = readFileSync(
      resolve(process.cwd(), "app/api/user/membership/route.ts"),
      "utf8",
    );
    const boost = readFileSync(
      resolve(process.cwd(), "components/producer/boost-badge.tsx"),
      "utf8",
    );
    const welcome = readFileSync(
      resolve(process.cwd(), "components/onboarding/welcome-modal.tsx"),
      "utf8",
    );

    expect(pactEngine).toMatch(/isPactPointsEarningEnabled/);
    expect(pointsEngine).toMatch(/isPactPointsEarningEnabled/);
    expect(founding).toMatch(/isPactPointsEarningEnabled/);
    expect(progression).toMatch(/isPactPointsEarningEnabled/);
    expect(membershipApi).toMatch(/pactPointsEarningEnabled/);
    expect(profile).toMatch(/pactPointsEarningEnabled/);
    expect(profile).toMatch(/howToEarnPact/);
    // Hide zero-balance tile when earning is OFF (redeem still needs balance > 0).
    expect(profile).toMatch(
      /pactPointsEarningEnabled[\s\S]{0,120}balance[\s\S]{0,80}>\s*0|balance[\s\S]{0,80}>\s*0[\s\S]{0,120}pactPointsEarningEnabled/,
    );
    expect(boost).toMatch(/usePactPointsEarningEnabled/);
    expect(welcome).toMatch(/earningEnabled/);
  });
});
