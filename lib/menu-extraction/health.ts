import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Slug that looks like a Starwinelist 404 page id (e.g. 404, 1066). */
function isStarwinelist404Slug(slug: string): boolean {
  return /^\d+$/.test(String(slug).trim());
}

export type MenuPipelineHealth = {
  sources: {
    total: number;
    completed: number;
    failed: number;
    partial: number;
    pending: number;
    crawling: number;
    skipped: number;
  };
  extraction: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    failed_recent: number;
    stuck_processing: number;
  };
  last_crawl_at: string | null;
  healthy: boolean;
  issues: string[];
};

async function countSourcesByStatus(
  status: string,
): Promise<number> {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from("starwinelist_sources")
    .select("id", { count: "exact", head: true })
    .eq("crawl_status", status);
  if (error) throw new Error(`countSourcesByStatus(${status}): ${error.message}`);
  return count ?? 0;
}

async function countDocumentsByStatus(status: string): Promise<number> {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from("menu_documents")
    .select("id", { count: "exact", head: true })
    .eq("extraction_status", status);
  if (error) {
    throw new Error(`countDocumentsByStatus(${status}): ${error.message}`);
  }
  return count ?? 0;
}

export async function getMenuPipelineHealth(): Promise<MenuPipelineHealth> {
  const sb = getSupabaseAdmin();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    completed,
    failed,
    partial,
    pendingSrc,
    crawling,
    skipped,
    pendingExt,
    processingExt,
    completedExt,
    failedExt,
  ] = await Promise.all([
    countSourcesByStatus("completed"),
    countSourcesByStatus("failed"),
    countSourcesByStatus("partial"),
    countSourcesByStatus("pending"),
    countSourcesByStatus("crawling"),
    countSourcesByStatus("skipped"),
    countDocumentsByStatus("pending"),
    countDocumentsByStatus("processing"),
    countDocumentsByStatus("completed"),
    countDocumentsByStatus("failed"),
  ]);

  const { count: failedRecent, error: failedRecentErr } = await sb
    .from("menu_documents")
    .select("id", { count: "exact", head: true })
    .eq("extraction_status", "failed")
    .gt("updated_at", sevenDaysAgo);
  if (failedRecentErr) {
    throw new Error(`failed_recent count: ${failedRecentErr.message}`);
  }

  const { count: stuckProcessing, error: stuckErr } = await sb
    .from("menu_documents")
    .select("id", { count: "exact", head: true })
    .eq("extraction_status", "processing")
    .lt("updated_at", twoHoursAgo);
  if (stuckErr) throw new Error(`stuck_processing count: ${stuckErr.message}`);

  const { data: lastCrawlRow, error: lastCrawlErr } = await sb
    .from("starwinelist_sources")
    .select("last_crawled_at")
    .not("last_crawled_at", "is", null)
    .order("last_crawled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastCrawlErr) {
    throw new Error(`last_crawl_at: ${lastCrawlErr.message}`);
  }

  const { count: totalRaw, error: totalErr } = await sb
    .from("starwinelist_sources")
    .select("id", { count: "exact", head: true });
  if (totalErr) throw new Error(`sources total: ${totalErr.message}`);

  // Exclude numeric 404 slugs from total (approximate via list would be heavy; acceptable for dashboard)
  const total = totalRaw ?? 0;

  const issues: string[] = [];
  if (pendingExt > 20) {
    issues.push(`${pendingExt} dokument väntar på AI-extraktion`);
  }
  if (failed + partial > 0) {
    issues.push(`${failed} crawl misslyckade, ${partial} PDF ej nedladdad`);
  }
  if (pendingSrc > 5) {
    issues.push(`${pendingSrc} källor har aldrig crawats`);
  }
  if ((stuckProcessing ?? 0) > 0) {
    issues.push(`${stuckProcessing} extraktioner fastnat i processing`);
  }
  if ((failedRecent ?? 0) > 10) {
    issues.push(`${failedRecent} misslyckade extraktioner senaste 7 dagarna`);
  }
  const lastCrawlAt =
    (lastCrawlRow as { last_crawled_at?: string } | null)?.last_crawled_at ??
    null;
  if (lastCrawlAt) {
    const hoursSince =
      (Date.now() - new Date(lastCrawlAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince > 48) {
      issues.push(`Ingen crawl på ${Math.round(hoursSince)}h (senast ${lastCrawlAt})`);
    }
  } else if (total > 0) {
    issues.push("Ingen crawl har körts ännu");
  }

  return {
    sources: {
      total,
      completed,
      failed,
      partial,
      pending: pendingSrc,
      crawling,
      skipped,
    },
    extraction: {
      pending: pendingExt,
      processing: processingExt,
      completed: completedExt,
      failed: failedExt,
      failed_recent: failedRecent ?? 0,
      stuck_processing: stuckProcessing ?? 0,
    },
    last_crawl_at: lastCrawlAt,
    healthy: issues.length === 0,
    issues,
  };
}

/** Sources eligible for automated crawl retry (partial / failed / pending). */
export async function listCrawlSourcesForRetry(
  limit: number,
): Promise<
  Array<{
    id: string;
    slug: string;
    crawl_status: string;
    crawl_attempts: number;
    last_crawled_at: string | null;
  }>
> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("starwinelist_sources")
    .select("id, slug, crawl_status, crawl_attempts, last_crawled_at")
    .in("crawl_status", ["partial", "failed", "pending"])
    .order("last_crawled_at", { ascending: true, nullsFirst: true })
    .limit(Math.max(limit * 4, 40));

  if (error) throw new Error(`listCrawlSourcesForRetry: ${error.message}`);

  const cooldownMs = 2 * 60 * 60 * 1000;
  const staleAfterMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return (data ?? [])
    .filter((row) => !isStarwinelist404Slug(String(row.slug)))
    .filter((row) => {
      const last = row.last_crawled_at
        ? new Date(row.last_crawled_at as string).getTime()
        : 0;
      if (row.last_crawled_at && now - last < cooldownMs) return false;
      const attempts = Number(row.crawl_attempts ?? 0);
      if (attempts >= 5 && row.last_crawled_at && now - last < staleAfterMs) {
        return false;
      }
      return true;
    })
    .slice(0, limit)
    .map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      crawl_status: row.crawl_status as string,
      crawl_attempts: Number(row.crawl_attempts ?? 0),
      last_crawled_at: (row.last_crawled_at as string | null) ?? null,
    }));
}
