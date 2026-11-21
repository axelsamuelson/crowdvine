import { describe, expect, it } from "vitest";
import {
  CANONICAL_INVITER_IDS,
  isCanonicalInviter,
  mergeInvitedFriendProfileIds,
} from "@/lib/analytics/v2/invited-friends";

describe("canonical invited-friend inviters (H9)", () => {
  it("documents the three canonical inviter UUIDs", () => {
    expect(CANONICAL_INVITER_IDS).toEqual([
      "8aeec114-78a8-47b5-b535-12b355964933", // Henrik Frienholt
      "cdc144b5-a8d5-48a3-a28a-03d76cfef4f9", // ave.samuelson
      "a957a784-6112-4ec9-b474-f2b025fc4fad", // admin@pactwines.com
    ]);
    expect(CANONICAL_INVITER_IDS).toHaveLength(3);
    expect(isCanonicalInviter(CANONICAL_INVITER_IDS[0])).toBe(true);
    expect(isCanonicalInviter("not-a-canonical-id")).toBe(false);
  });

  it("unions invitation_codes.used_by with referral_signups.invitee_id", () => {
    const usedBy = [
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
      null,
      "11111111-1111-1111-1111-111111111111", // dup
    ];
    const inviteeIds = [
      "22222222-2222-2222-2222-222222222222", // overlap
      "33333333-3333-3333-3333-333333333333",
      undefined,
    ];
    expect(mergeInvitedFriendProfileIds({ usedBy, inviteeIds })).toEqual([
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
    ]);
  });

  it("returns empty when both sources are empty", () => {
    expect(
      mergeInvitedFriendProfileIds({ usedBy: [], inviteeIds: [] }),
    ).toEqual([]);
  });
});
