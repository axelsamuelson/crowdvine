import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { listAllOffers } from "@/lib/external-prices/db";
import { scoreMatchWithBreakdown } from "@/lib/external-prices/match";
import type { WineForMatch } from "@/lib/external-prices/types";

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (admin) return;
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
  const sb = getSupabaseAdmin();
  const { data: profile } = await sb
    .from("profiles")
    .select("roles, role")
    .eq("id", user.id)
    .single();
  const isAdmin =
    profile?.roles?.includes("admin") ||
    profile?.role === "admin" ||
    (user as { roles?: string[]; role?: string }).roles?.includes("admin") ||
    (user as { role?: string }).role === "admin";
  if (!isAdmin) throw new Error("Admin access required");
}

/** Match counts as "match" in UI when score >= this. */
const MATCH_LABEL_THRESHOLD = 0.5;

/**
 * GET /api/admin/price-sources/offers
 * List all external offers with wine, source, and recomputed match breakdown (score without vintage, producer/vinnamn match).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const offers = await listAllOffers();
    const enriched = offers.map((o) => {
      const wine = o.wine;
      const producerName = wine?.producer_name ?? null;
      const wineForMatch: WineForMatch = {
        id: o.wine_id,
        wine_name: wine?.wine_name ?? "",
        vintage: wine?.vintage ?? "",
        producer: producerName ? { name: producerName } : null,
      };
      const { score, breakdown } = scoreMatchWithBreakdown(wineForMatch, o.title_raw ?? "");
      return {
        ...o,
        match_confidence: score,
        producer_name: producerName,
        producer_match: breakdown.producerScore >= MATCH_LABEL_THRESHOLD,
        wine_name_match: breakdown.wineNameScore >= MATCH_LABEL_THRESHOLD,
      };
    });
    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
