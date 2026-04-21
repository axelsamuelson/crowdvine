import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const CODE_LEN = 8;
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1

function randomCode(): string {
  const bytes = randomBytes(CODE_LEN);
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    s += CHARSET[bytes[i]! % CHARSET.length];
  }
  return s;
}

/**
 * Ensures profiles.personal_invite_code and a matching reusable invitation_codes
 * row exist for B2C personal links (/i/{code}).
 */
export async function ensurePersonalInviteForUser(
  sb: SupabaseClient,
  userId: string,
): Promise<{ code: string }> {
  const { data: profile, error: readErr } = await sb
    .from("profiles")
    .select("id, personal_invite_code")
    .eq("id", userId)
    .maybeSingle();

  if (readErr) throw readErr;
  if (!profile) throw new Error("Profile not found");

  const existing = profile.personal_invite_code?.trim();
  if (existing) {
    const code = existing.toUpperCase();
    await ensureMasterInvitationRow(sb, userId, code);
    return { code };
  }

  for (let attempt = 0; attempt < 25; attempt++) {
    const code = randomCode();
    const { data: updated, error: upErr } = await sb
      .from("profiles")
      .update({
        personal_invite_code: code,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .is("personal_invite_code", null)
      .select("id")
      .maybeSingle();

    if (!upErr && updated?.id) {
      await ensureMasterInvitationRow(sb, userId, code);
      return { code };
    }

    const { data: updated2, error: upErr2 } = await sb
      .from("profiles")
      .update({
        personal_invite_code: code,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .eq("personal_invite_code", "")
      .select("id")
      .maybeSingle();

    if (!upErr2 && updated2?.id) {
      await ensureMasterInvitationRow(sb, userId, code);
      return { code };
    }

    if (upErr?.code === "23505" || upErr2?.code === "23505") {
      continue;
    }
    if (upErr && upErr.code !== "PGRST116") {
      throw upErr;
    }
    if (upErr2 && upErr2.code !== "PGRST116") {
      throw upErr2;
    }

    const { data: again } = await sb
      .from("profiles")
      .select("personal_invite_code")
      .eq("id", userId)
      .maybeSingle();
    if (again?.personal_invite_code?.trim()) {
      const code = again.personal_invite_code.trim().toUpperCase();
      await ensureMasterInvitationRow(sb, userId, code);
      return { code };
    }
  }

  throw new Error("Could not allocate personal_invite_code");
}

async function ensureMasterInvitationRow(
  sb: SupabaseClient,
  userId: string,
  code: string,
) {
  const { data: existing } = await sb
    .from("invitation_codes")
    .select("id, is_personal_link")
    .eq("code", code)
    .maybeSingle();

  if (existing?.id) {
    if (!existing.is_personal_link) {
      console.warn(
        "[referral] invitation_codes row exists for personal code but is not personal pool; leaving as-is",
        code,
      );
    }
    return;
  }

  const expiresAt = new Date("2099-12-31T23:59:59.000Z").toISOString();

  const { error: insErr } = await sb.from("invitation_codes").insert({
    code,
    created_by: userId,
    expires_at: expiresAt,
    max_uses: 999999,
    is_active: true,
    initial_level: "basic",
    invitation_type: "consumer",
    allowed_types: ["consumer"],
    is_personal_link: true,
  });

  if (insErr && insErr.code !== "23505") {
    throw insErr;
  }
}
