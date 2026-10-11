import { fetchGscPerformance } from "@/lib/gsc/performance";
import { buildSitemapEntries } from "@/lib/sitemap-entries";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { computeAuthorityScore } from "@/lib/seo/domain-authority-score";
import {
  DOMAIN_AUTHORITY_TARGETS,
  type DomainAuthorityTarget,
} from "@/lib/seo/domain-authority-targets";
import { fetchOpenPageRank } from "@/lib/seo/open-pagerank";

export type DomainAuthoritySnapshotRow = {
  id: number;
  domain: string;
  captured_at: string;
  snapshot_date: string;
  open_page_rank: number | null;
  global_rank: number | null;
  referring_domains: number | null;
  gsc_clicks_28d: number | null;
  gsc_impressions_28d: number | null;
  gsc_ctr_28d: number | null;
  gsc_position_28d: number | null;
  sitemap_url_count: number | null;
  authority_score: number;
  components: Record<string, unknown>;
  sources: Record<string, unknown>;
};

function utcSnapshotDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function countSitemapUrls(target: DomainAuthorityTarget): Promise<{
  count: number | null;
  source: { status: string; message?: string };
}> {
  try {
    const entries = await buildSitemapEntries(
      target.baseUrl,
      target.siteProfile,
    );
    return {
      count: entries.length,
      source: { status: "ok" },
    };
  } catch (err) {
    return {
      count: null,
      source: {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

async function fetchGscTotals(target: DomainAuthorityTarget): Promise<{
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  source: { status: string; message?: string };
}> {
  try {
    const data = await fetchGscPerformance({
      site: target.gscSite,
      dimension: "date",
      limit: 1,
    });
    return {
      clicks: data.totals.clicks,
      impressions: data.totals.impressions,
      ctr: data.totals.ctr,
      position: data.totals.position,
      source: { status: "ok" },
    };
  } catch (err) {
    return {
      clicks: null,
      impressions: null,
      ctr: null,
      position: null,
      source: {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function captureDomainAuthoritySnapshots(options?: {
  domains?: string[];
}): Promise<{
  ok: boolean;
  snapshot_date: string;
  rows: DomainAuthoritySnapshotRow[];
  errors: string[];
}> {
  const snapshotDate = utcSnapshotDate();
  const wanted = options?.domains?.map((d) => d.toLowerCase());
  const targets = DOMAIN_AUTHORITY_TARGETS.filter(
    (t) => !wanted || wanted.includes(t.domain),
  );

  const errors: string[] = [];
  if (targets.length === 0) {
    return { ok: false, snapshot_date: snapshotDate, rows: [], errors: ["No matching domains"] };
  }

  const opr = await fetchOpenPageRank(targets.map((t) => t.domain));
  const oprByDomain = new Map(
    opr.ok ? opr.results.map((r) => [r.domain, r] as const) : [],
  );
  if (!opr.ok) {
    errors.push(`Open PageRank: ${opr.message}`);
  }

  const rows: DomainAuthoritySnapshotRow[] = [];
  const supabase = getSupabaseAdmin();

  for (const target of targets) {
    const [gsc, sitemap] = await Promise.all([
      fetchGscTotals(target),
      countSitemapUrls(target),
    ]);

    const oprRow = oprByDomain.get(target.domain) ?? null;
    const scored = computeAuthorityScore({
      openPageRank: oprRow?.openPageRank ?? null,
      referringDomains: oprRow?.referringDomains ?? null,
      gscImpressions28d: gsc.impressions,
      sitemapUrlCount: sitemap.count,
    });

    const sources = {
      open_page_rank: opr.ok
        ? { status: oprRow?.found ? "ok" : "not_found" }
        : { status: opr.reason, message: opr.message },
      gsc: gsc.source,
      sitemap: sitemap.source,
      used_weights: scored.usedWeights,
    };

    const payload = {
      domain: target.domain,
      snapshot_date: snapshotDate,
      captured_at: new Date().toISOString(),
      open_page_rank: oprRow?.openPageRank ?? null,
      global_rank: oprRow?.globalRank ?? null,
      referring_domains: oprRow?.referringDomains ?? null,
      gsc_clicks_28d: gsc.clicks,
      gsc_impressions_28d: gsc.impressions,
      gsc_ctr_28d: gsc.ctr,
      gsc_position_28d: gsc.position,
      sitemap_url_count: sitemap.count,
      authority_score: scored.score,
      components: scored.components,
      sources,
    };

    const { data, error } = await supabase
      .from("domain_authority_snapshots")
      .upsert(payload, { onConflict: "domain,snapshot_date" })
      .select("*")
      .single();

    if (error) {
      errors.push(`${target.domain}: ${error.message}`);
      continue;
    }
    rows.push(data as DomainAuthoritySnapshotRow);
  }

  return {
    ok: errors.length === 0 && rows.length > 0,
    snapshot_date: snapshotDate,
    rows,
    errors,
  };
}

export async function listDomainAuthoritySnapshots(options?: {
  domain?: string;
  limit?: number;
}): Promise<DomainAuthoritySnapshotRow[]> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(options?.limit ?? 52, 1), 200);
  let q = supabase
    .from("domain_authority_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(limit);
  if (options?.domain) {
    q = q.eq("domain", options.domain.toLowerCase());
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as DomainAuthoritySnapshotRow[];
}
