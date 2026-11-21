import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * Optional Vercel deploy webhook → admin_analytics_annotations (M2 / H7).
 * Hugo/Axel wire the webhook secret in Vercel; agent does not change project settings.
 *
 * Expected: Authorization: Bearer ${VERCEL_ANALYTICS_ANNOTATION_SECRET}
 * Only production READY deployments create annotations.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.VERCEL_ANALYTICS_ANNOTATION_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload =
    (body.payload as Record<string, unknown> | undefined) || body;
  const target =
    (payload.target as string | undefined) ||
    (body.target as string | undefined);
  const readyState =
    (payload.readyState as string | undefined) ||
    (body.readyState as string | undefined) ||
    (payload.state as string | undefined);

  if (target && target !== "production") {
    return NextResponse.json({ ok: true, skipped: "not_production" });
  }
  if (readyState && readyState !== "READY" && readyState !== "ready") {
    return NextResponse.json({ ok: true, skipped: "not_ready" });
  }

  const meta =
    (payload.deployment as Record<string, unknown> | undefined) ||
    (payload.meta as Record<string, unknown> | undefined) ||
    payload;

  const sha =
    (meta.id as string | undefined)?.slice(0, 7) ||
    (meta.url as string | undefined)?.slice(-7) ||
    "deploy";
  const pr =
    typeof meta.githubPrId === "number"
      ? meta.githubPrId
      : typeof meta.githubCommitPrId === "number"
        ? meta.githubCommitPrId
        : null;
  const name =
    (meta.name as string | undefined) ||
    (meta.githubCommitMessage as string | undefined) ||
    "Production deploy";

  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const label = pr
    ? `PR${pr} — ${String(name).slice(0, 120)} (${sha})`
    : `Deploy ${sha} — ${String(name).slice(0, 120)}`;

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("admin_analytics_annotations").insert({
    date,
    occurred_at: now.toISOString(),
    label,
    category: "release",
    site: "pact",
    source: "vercel",
    pr_number: pr,
    url: pr
      ? `https://github.com/axelsamuelson/crowdvine/pull/${pr}`
      : null,
  });

  if (error) {
    console.warn("[webhook/vercel-analytics-annotation]", error.message);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
