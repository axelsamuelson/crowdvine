import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const TEST_CHANNELS = new Set([
  "meta_ads",
  "instagram_organic",
  "instagram_no_utm",
  "organic_search",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET/POST analytics_channel_costs (M7 / K20).
 * Admin + service_role only. No Meta API — manual entry.
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("analytics_channel_costs")
    .select(
      "id, period_from, period_to, test_channel, utm_campaign, cost_sek, source, created_by, created_at",
    )
    .order("period_from", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyUnknown: unknown = await request.json().catch(() => null);
  const body = (bodyUnknown ?? {}) as {
    period_from?: string;
    period_to?: string;
    test_channel?: string;
    utm_campaign?: string | null;
    cost_sek?: number | string;
    source?: string | null;
  };

  const periodFrom = String(body.period_from ?? "").trim();
  const periodTo = String(body.period_to ?? "").trim();
  const testChannel = String(body.test_channel ?? "").trim();
  const costSek = Number(body.cost_sek);

  if (!DATE_RE.test(periodFrom) || !DATE_RE.test(periodTo)) {
    return NextResponse.json(
      { error: "period_from och period_to krävs (YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  if (periodFrom > periodTo) {
    return NextResponse.json(
      { error: "period_from får inte vara efter period_to" },
      { status: 400 },
    );
  }
  if (!TEST_CHANNELS.has(testChannel)) {
    return NextResponse.json(
      { error: "ogiltig test_channel" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(costSek) || costSek < 0) {
    return NextResponse.json(
      { error: "cost_sek måste vara ≥ 0" },
      { status: 400 },
    );
  }

  // Organic search + Instagram without UTM never store a campaign.
  const campaignOptionalChannels = new Set([
    "organic_search",
    "instagram_no_utm",
  ]);
  const utmCampaign = campaignOptionalChannels.has(testChannel)
    ? null
    : body.utm_campaign?.trim() || null;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("analytics_channel_costs")
    .insert({
      period_from: periodFrom,
      period_to: periodTo,
      test_channel: testChannel,
      utm_campaign: utmCampaign,
      cost_sek: costSek,
      // Always manual for admin form entries (ignore client source).
      source: "manual",
      created_by: admin.id ?? null,
    })
    .select(
      "id, period_from, period_to, test_channel, utm_campaign, cost_sek, source, created_by, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ row: data }, { status: 201 });
}
