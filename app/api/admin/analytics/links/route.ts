import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  buildTrackedUrl,
  normalizeDestinationPath,
  normalizeUtmValue,
} from "@/lib/analytics/utm-normalize";

export type CampaignLinkRow = {
  id: string;
  destination_path: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  label: string;
  created_at: string;
  created_by: string | null;
  url: string;
};

function withUrl(
  row: Omit<CampaignLinkRow, "url"> & { url?: string },
): CampaignLinkRow {
  return {
    ...row,
    url: buildTrackedUrl({
      destination_path: row.destination_path,
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
    }),
  };
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("analytics_campaign_links")
    .select(
      "id, destination_path, utm_source, utm_medium, utm_campaign, label, created_at, created_by",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "Run migrations/188_analytics_campaign_links.sql",
      },
      { status: 500 },
    );
  }

  const links = (data ?? []).map((row) =>
    withUrl(row as Omit<CampaignLinkRow, "url">),
  );

  return NextResponse.json({ links });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyUnknown: unknown = await request.json().catch(() => null);
  const body =
    bodyUnknown && typeof bodyUnknown === "object"
      ? (bodyUnknown as Record<string, unknown>)
      : null;

  const destination_path =
    typeof body?.destination_path === "string"
      ? normalizeDestinationPath(body.destination_path)
      : null;
  const utm_source =
    typeof body?.utm_source === "string" && body.utm_source.trim()
      ? normalizeUtmValue(body.utm_source)
      : null;
  const utm_medium =
    typeof body?.utm_medium === "string" && body.utm_medium.trim()
      ? normalizeUtmValue(body.utm_medium)
      : null;
  const utm_campaign =
    typeof body?.utm_campaign === "string" && body.utm_campaign.trim()
      ? normalizeUtmValue(body.utm_campaign)
      : null;
  const label =
    typeof body?.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, 200)
      : null;

  if (!destination_path || !utm_source || !utm_medium || !utm_campaign || !label) {
    return NextResponse.json(
      {
        error:
          "destination_path, utm_source, utm_medium, utm_campaign, and label are required",
      },
      { status: 400 },
    );
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("analytics_campaign_links")
    .insert({
      destination_path,
      utm_source,
      utm_medium,
      utm_campaign,
      label,
      created_by: admin.id,
    })
    .select(
      "id, destination_path, utm_source, utm_medium, utm_campaign, label, created_at, created_by",
    )
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "Run migrations/188_analytics_campaign_links.sql",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    link: withUrl(data as Omit<CampaignLinkRow, "url">),
  });
}
