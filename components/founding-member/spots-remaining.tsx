import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { FOUNDING_MEMBER_MAX_COUNT } from "@/lib/membership/points-engine";

export async function FoundingMemberSpotsRemaining() {
  const sb = getSupabaseAdmin();
  const { count } = await sb
    .from("user_memberships")
    .select("id", { count: "exact", head: true })
    .eq("level", "founding_member");

  const used = count ?? 0;
  const spotsRemaining = Math.max(0, FOUNDING_MEMBER_MAX_COUNT - used);
  const percent = (spotsRemaining / FOUNDING_MEMBER_MAX_COUNT) * 100;

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm font-medium">
        {spotsRemaining} founding spots remaining
      </span>
      <div className="h-1.5 w-24 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

