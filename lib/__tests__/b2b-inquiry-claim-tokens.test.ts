import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  claimB2bInquiryForUser,
  mintB2bInquiryClaimToken,
} from "@/lib/b2b/inquiry-claim-tokens";
import { createHash } from "node:crypto";

describe("b2b inquiry claim tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mints opaque token with hash and expiry", () => {
    const minted = mintB2bInquiryClaimToken();
    expect(minted.rawToken.length).toBeGreaterThan(20);
    expect(minted.tokenHash).toBe(
      createHash("sha256").update(minted.rawToken, "utf8").digest("hex"),
    );
    expect(new Date(minted.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("claims an unowned inquiry for the user", async () => {
    const minted = mintB2bInquiryClaimToken();
    const updateEqToken = vi.fn().mockReturnValue({
      select: () => ({
        maybeSingle: async () => ({
          data: { id: "inq-1" },
          error: null,
        }),
      }),
    });
    const updateIs = vi.fn().mockReturnValue({
      eq: updateEqToken,
    });
    const updateEqId = vi.fn().mockReturnValue({
      is: updateIs,
    });
    const update = vi.fn().mockReturnValue({ eq: updateEqId });

    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "inq-1",
                user_id: null,
                claim_token_expires_at: minted.expiresAt,
              },
              error: null,
            }),
          }),
        }),
        update,
      })),
    } as never);

    const result = await claimB2bInquiryForUser({
      rawToken: minted.rawToken,
      userId: "user-1",
    });
    expect(result).toEqual({ ok: true, inquiryId: "inq-1" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        claim_token_hash: null,
        claim_token_expires_at: null,
      }),
    );
  });

  it("rejects expired tokens", async () => {
    const minted = mintB2bInquiryClaimToken();
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "inq-1",
                user_id: null,
                claim_token_expires_at: new Date(
                  Date.now() - 60_000,
                ).toISOString(),
              },
              error: null,
            }),
          }),
        }),
      })),
    } as never);

    const result = await claimB2bInquiryForUser({
      rawToken: minted.rawToken,
      userId: "user-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("expired");
  });
});
