import { NextRequest, NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  captureDomainAuthoritySnapshots,
  listDomainAuthoritySnapshots,
} from "@/lib/seo/capture-domain-authority-snapshot";
import { DOMAIN_AUTHORITY_TARGETS } from "@/lib/seo/domain-authority-targets";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const domain = request.nextUrl.searchParams.get("domain") ?? undefined;
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const snapshots = await listDomainAuthoritySnapshots({ domain, limit });
    return NextResponse.json({
      targets: DOMAIN_AUTHORITY_TARGETS.map((t) => t.domain),
      hasOpenPageRankKey: Boolean(process.env.OPEN_PAGERANK_API_KEY?.trim()),
      hasGscKey: Boolean(process.env.GSC_SERVICE_ACCOUNT_KEY?.trim()),
      snapshots,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let domains: string[] | undefined;
  const raw = await request.text();
  if (raw.trim()) {
    try {
      const body = JSON.parse(raw) as { domains?: unknown };
      if (Array.isArray(body.domains)) {
        domains = body.domains.filter((d): d is string => typeof d === "string");
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  try {
    const result = await captureDomainAuthoritySnapshots({ domains });
    return NextResponse.json(result, {
      status: result.ok ? 200 : 207,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/domain-authority]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
