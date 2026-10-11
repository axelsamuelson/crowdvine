export type OpenPageRankResult = {
  domain: string;
  found: boolean;
  openPageRank: number | null;
  globalRank: number | null;
  referringDomains: number | null;
};

type BulkApiRow = {
  domain?: string;
  found?: boolean;
  open_page_rank?: number | null;
  rank?: number | null;
  referring_domains?: number | null;
};

type BulkApiResponse = {
  results?: BulkApiRow[];
  error?: { type?: string; message?: string };
};

/**
 * Open PageRank (Keywords Everywhere) — 0–10 authority from Common Crawl.
 * Requires OPEN_PAGERANK_API_KEY (Bearer opr_live_…).
 */
export async function fetchOpenPageRank(
  domains: string[],
): Promise<{
  ok: true;
  results: OpenPageRankResult[];
} | {
  ok: false;
  reason: "missing_key" | "error";
  message: string;
}> {
  const key = process.env.OPEN_PAGERANK_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      reason: "missing_key",
      message: "Missing env OPEN_PAGERANK_API_KEY",
    };
  }

  const unique = [...new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) {
    return { ok: true, results: [] };
  }

  try {
    const res = await fetch(
      "https://openpagerank.keywordseverywhere.com/v1/domains/bulk",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domains: unique,
          include_history: false,
        }),
        cache: "no-store",
      },
    );

    const json = (await res.json()) as BulkApiResponse;
    if (!res.ok) {
      return {
        ok: false,
        reason: "error",
        message:
          json.error?.message ??
          `Open PageRank HTTP ${res.status}`,
      };
    }

    const byDomain = new Map<string, OpenPageRankResult>();
    for (const row of json.results ?? []) {
      const domain = (row.domain ?? "").toLowerCase();
      if (!domain) continue;
      byDomain.set(domain, {
        domain,
        found: row.found === true,
        openPageRank:
          typeof row.open_page_rank === "number" ? row.open_page_rank : null,
        globalRank: typeof row.rank === "number" ? row.rank : null,
        referringDomains:
          typeof row.referring_domains === "number"
            ? row.referring_domains
            : null,
      });
    }

    return {
      ok: true,
      results: unique.map(
        (domain) =>
          byDomain.get(domain) ?? {
            domain,
            found: false,
            openPageRank: null,
            globalRank: null,
            referringDomains: null,
          },
      ),
    };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
