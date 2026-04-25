import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { FOUNDING_MEMBER_ACTIVITY_BOTTLES } from "@/lib/membership/points-engine";

export async function runFoundingMemberActivityCheck(): Promise<{
  checked: number;
  retained: number;
  degraded: number;
}> {
  const sbAdmin = getSupabaseAdmin();
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const checkingH1 = month === 6; // July 1: check Jan–Jun
  const checkingH2 = month === 0; // Jan 1: check Jul–Dec

  if (!checkingH1 && !checkingH2) {
    console.log(
      "[FOUNDING] Activity check invoked outside Jan/Jul. No-op.",
      { month },
    );
    return { checked: 0, retained: 0, degraded: 0 };
  }

  const { data: rows, error } = await sbAdmin
    .from("user_memberships")
    .select(
      "user_id, founding_member_bottles_h1, founding_member_bottles_h2, founding_member_since",
    )
    .eq("level", "founding_member");

  if (error) {
    console.error("[FOUNDING] Failed to load founding members:", error);
    return { checked: 0, retained: 0, degraded: 0 };
  }

  const list = (rows ?? []) as Array<{
    user_id: string;
    founding_member_bottles_h1: number;
    founding_member_bottles_h2: number;
    founding_member_since: string | null;
  }>;

  let checked = 0;
  let retained = 0;
  let degraded = 0;

  for (const row of list) {
    checked += 1;
    const userId = row.user_id;
    try {
      const bottles = checkingH1
        ? Number(row.founding_member_bottles_h1 ?? 0)
        : Number(row.founding_member_bottles_h2 ?? 0);

      if (bottles >= FOUNDING_MEMBER_ACTIVITY_BOTTLES) {
        const update: Record<string, unknown> = {
          founding_member_last_activity_check: new Date().toISOString(),
        };
        if (checkingH1) {
          update.founding_member_bottles_h1 = 0;
        } else {
          update.founding_member_bottles_h2 = 0;
        }

        const { error: upErr } = await sbAdmin
          .from("user_memberships")
          .update(update)
          .eq("user_id", userId);

        if (upErr) throw upErr;

        retained += 1;
        console.log(
          `✅ [FOUNDING] ${userId} retained status with ${bottles} bottles`,
        );
        continue;
      }

      const { error: degradeErr } = await sbAdmin
        .from("user_memberships")
        .update({
          level: "guld",
          founding_member_bottles_h1: 0,
          founding_member_bottles_h2: 0,
          founding_member_last_activity_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (degradeErr) throw degradeErr;

      const { error: rpcErr } = await sbAdmin.rpc("award_impact_points", {
        p_user_id: userId,
        p_event_type: "manual_adjustment",
        p_points: 0,
        p_description: `Founding Member degraded to guld — activity requirement not met (${bottles} of ${FOUNDING_MEMBER_ACTIVITY_BOTTLES} bottles)`,
      });

      if (rpcErr) throw rpcErr;

      degraded += 1;
      console.log(
        `⬇️ [FOUNDING] ${userId} degraded to guld (${bottles}/${FOUNDING_MEMBER_ACTIVITY_BOTTLES} bottles in period)`,
      );
    } catch (userErr) {
      console.error("[FOUNDING] Activity check failed for user:", userId, userErr);
    }
  }

  return { checked, retained, degraded };
}

