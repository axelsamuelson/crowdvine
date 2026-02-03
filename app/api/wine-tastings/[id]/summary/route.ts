import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

async function ensureSessionAccess(
  sb: ReturnType<typeof getSupabaseAdmin>,
  sessionId: string,
  user: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  const { data: session, error } = await sb
    .from("wine_tasting_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .single();

  if (error || !session) return { allowed: false, error: 404 as const };
  if (session.status === "active") return { allowed: true };
  if (!user) return { allowed: false, error: 403 as const };

  const { data: profile } = await sb
    .from("profiles")
    .select("roles, role")
    .eq("id", user.id)
    .single();
  const isAdmin =
    profile?.roles?.includes("admin") || profile?.role === "admin";
  if (isAdmin) return { allowed: true };

  const { data: participant } = await sb
    .from("wine_tasting_participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { allowed: !!participant, error: 403 as const };
}

/**
 * GET /api/wine-tastings/[id]/summary
 * Session summary: session info, statistics, and per-wine stats with ratings.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const sb = getSupabaseAdmin();
    const user = await getCurrentUser();
    const { allowed, error: accessError } = await ensureSessionAccess(sb, sessionId, user);
    if (!allowed) {
      return NextResponse.json(
        { error: accessError === 404 ? "Session not found" : "Access denied" },
        { status: accessError },
      );
    }

    const { data: session, error: sessionError } = await sb
      .from("wine_tasting_sessions")
      .select("id, name, status, created_at, completed_at, wine_order")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const wineOrder = (session.wine_order as string[] | null) ?? [];
    const { data: ratings } = await sb
      .from("wine_tasting_ratings")
      .select(`
        wine_id,
        rating,
        comment,
        created_at,
        participant:wine_tasting_participants(id, name, participant_code, is_anonymous)
      `)
      .eq("session_id", sessionId);

    const { data: participants } = await sb
      .from("wine_tasting_participants")
      .select("id")
      .eq("session_id", sessionId);

    const totalParticipants = participants?.length ?? 0;
    const totalRatings = ratings?.length ?? 0;
    const totalWines = wineOrder.length;
    const overallAverage =
      totalRatings > 0
        ? Math.round(
            (ratings!.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0) /
              totalRatings) *
            10
          ) / 10
        : null;

    let wines: Array<{
      wine: {
        id: string;
        wine_name: string;
        vintage: string;
        grape_varieties?: string;
        color?: string;
        label_image_path?: string;
      };
      totalRatings: number;
      averageRating: number | null;
      ratings: Array<{
        rating: number;
        comment: string | null;
        participant: {
          id: string;
          name: string | null;
          participant_code: string;
          is_anonymous: boolean;
        };
        tasted_at: string;
      }>;
    }> = [];

    if (wineOrder.length > 0) {
      const { data: winesData } = await sb
        .from("wines")
        .select("id, wine_name, vintage, grape_varieties, color, label_image_path")
        .in("id", wineOrder);

      const winesMap = new Map((winesData ?? []).map((w: any) => [w.id, w]));

      for (const wineId of wineOrder) {
        const wine = winesMap.get(wineId);
        if (!wine) continue;

        const wineRatings = (ratings ?? []).filter(
          (r: { wine_id: string }) => r.wine_id === wineId,
        );
        const partMap = new Map<
          string,
          { id: string; name: string | null; participant_code: string; is_anonymous: boolean }
        >();
        for (const r of wineRatings) {
          const p =
            (r as any).participant ??
            (r as any).wine_tasting_participants;
          if (p && !partMap.has(p.id)) {
            partMap.set(p.id, {
              id: p.id,
              name: p.name ?? null,
              participant_code: p.participant_code ?? "",
              is_anonymous: p.is_anonymous ?? false,
            });
          }
        }

        const totalR = wineRatings.length;
        const avg =
          totalR > 0
            ? Math.round(
                (wineRatings.reduce((a: number, r: { rating: number }) => a + r.rating, 0) /
                  totalR) *
                10
              ) / 10
            : null;

        wines.push({
          wine: {
            id: wine.id,
            wine_name: wine.wine_name,
            vintage: wine.vintage,
            grape_varieties: wine.grape_varieties,
            color: wine.color,
            label_image_path: wine.label_image_path,
          },
          totalRatings: totalR,
          averageRating: avg,
          ratings: wineRatings.map((r: any) => {
            const p = r.participant ?? r.wine_tasting_participants;
            return {
              rating: r.rating,
              comment: r.comment ?? null,
              participant: partMap.get(p?.id) ?? {
                id: p?.id ?? "",
                name: p?.name ?? null,
                participant_code: p?.participant_code ?? "",
                is_anonymous: p?.is_anonymous ?? false,
              },
              tasted_at: r.created_at ?? new Date().toISOString(),
            };
          }),
        });
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        created_at: session.created_at,
        completed_at: session.completed_at,
      },
      statistics: {
        totalWines,
        totalParticipants,
        totalRatings,
        overallAverage,
      },
      wines,
    });
  } catch (err: unknown) {
    console.error("Error in GET /api/wine-tastings/[id]/summary:", err);
    return NextResponse.json(
      {
        error: "Failed to load summary",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
