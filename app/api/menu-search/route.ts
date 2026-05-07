import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { MenuSearchResponse, MenuSearchVenue, MenuSearchWine } from "@/lib/menu-search-types";

/** Row shape returned by Postgres search_menu_wines (service_role RPC). */
type RpcWineRow = {
  row_id: string;
  producer: string | null;
  wine_name: string | null;
  vintage: string | null;
  region: string | null;
  country: string | null;
  wine_type: string | null;
  price_bottle: number | null;
  price_glass: number | null;
  currency: string | null;
  confidence: number | null;
  source_slug: string | null;
  venue_name: string | null;
  extracted_at: string | null;
  match_score: number | null;
};

function parseIntParam(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function parseBoolParam(value: string | null): boolean {
  if (value == null || value.trim() === "") return false;
  const t = value.trim().toLowerCase();
  return t === "true" || t === "1" || t === "yes";
}

/** Map query param to DB wine_type (DB uses e.g. rose, not rosé). */
function mapWineTypeParam(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    red: "red",
    rött: "red",
    white: "white",
    vitt: "white",
    sparkling: "sparkling",
    mousserande: "sparkling",
    rose: "rose",
    rosé: "rose",
    orange: "orange",
  };
  return map[t] ?? null;
}

function rpcRowToWine(r: RpcWineRow): MenuSearchWine {
  return {
    producer: r.producer,
    wine_name: r.wine_name,
    vintage: r.vintage,
    region: r.region,
    country: r.country,
    wine_type: r.wine_type,
    price_bottle: r.price_bottle != null ? Number(r.price_bottle) : null,
    price_glass: r.price_glass != null ? Number(r.price_glass) : null,
    currency: r.currency,
  };
}

/**
 * Group flat RPC rows into venue cards, then sort by match_count DESC,
 * then cheapest_bottle ASC (nulls last).
 */
function groupRowsToVenues(rows: RpcWineRow[]): MenuSearchVenue[] {
  const bySlug = new Map<
    string,
    {
      slug: string;
      name: string;
      extracted_at: string | null;
      wines: MenuSearchWine[];
    }
  >();

  for (const r of rows) {
    const slug = r.source_slug?.trim() || "";
    if (!slug) continue;

    if (!bySlug.has(slug)) {
      bySlug.set(slug, {
        slug,
        name: (r.venue_name?.trim() || slug) as string,
        extracted_at: r.extracted_at,
        wines: [],
      });
    }
    const venue = bySlug.get(slug)!;
    if (r.extracted_at && (!venue.extracted_at || r.extracted_at > venue.extracted_at)) {
      venue.extracted_at = r.extracted_at;
    }
    venue.wines.push(rpcRowToWine(r));
  }

  const venues: MenuSearchVenue[] = [];
  for (const v of bySlug.values()) {
    const bottles = v.wines.map((w) => w.price_bottle).filter((p): p is number => p != null && !Number.isNaN(p));
    const glasses = v.wines.map((w) => w.price_glass).filter((p): p is number => p != null && !Number.isNaN(p));
    venues.push({
      slug: v.slug,
      name: v.name,
      extracted_at: v.extracted_at,
      match_count: v.wines.length,
      cheapest_bottle: bottles.length ? Math.min(...bottles) : null,
      cheapest_glass: glasses.length ? Math.min(...glasses) : null,
      wines: v.wines,
    });
  }

  venues.sort((a, b) => {
    if (b.match_count !== a.match_count) return b.match_count - a.match_count;
    const pa = a.cheapest_bottle ?? Number.POSITIVE_INFINITY;
    const pb = b.cheapest_bottle ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });

  return venues;
}

type LegacySearchParams = {
  q: string;
  city: string;
  minPrice: number | null;
  maxPrice: number | null;
  wineType: string | null;
  byGlass: boolean;
};

/**
 * In-memory fallback when search_menu_wines / count RPC fails (same response shape, `_fallback: true`).
 */
async function legacyMenuSearch(
  sb: ReturnType<typeof getSupabaseAdmin>,
  params: LegacySearchParams,
): Promise<MenuSearchResponse> {
  const { q, city, minPrice, maxPrice, wineType, byGlass } = params;
  const qLower = q.toLowerCase();

  const { data: sources, error: sourcesError } = await sb
    .from("starwinelist_sources")
    .select("slug, name")
    .eq("city", city);
  if (sourcesError) throw new Error(sourcesError.message);

  const slugSet = new Set((sources ?? []).map((s: { slug: string }) => s.slug));
  const slugToName: Record<string, string> = {};
  (sources ?? []).forEach((s: { slug: string; name: string | null }) => {
    slugToName[s.slug] = s.name ?? s.slug;
  });

  if (slugSet.size === 0) {
    return {
      query: q,
      city,
      total_matches: 0,
      page: 1,
      per_page: 0,
      venues: [],
      _fallback: true,
    };
  }

  const { data: docs, error: docsError } = await sb
    .from("menu_documents")
    .select("id, source_slug, updated_at, extracted_at")
    .eq("extraction_status", "completed")
    .in("source_slug", Array.from(slugSet));
  if (docsError) throw new Error(docsError.message);

  const docIds = (docs ?? []).map((d: { id: string }) => d.id);
  const docById: Record<string, { source_slug: string | null; extracted_at: string | null }> = {};
  (docs ?? []).forEach(
    (d: {
      id: string;
      source_slug: string | null;
      updated_at: string | null;
      extracted_at: string | null;
    }) => {
      const at = d.updated_at ?? d.extracted_at ?? null;
      docById[d.id] = { source_slug: d.source_slug, extracted_at: at };
    },
  );

  if (docIds.length === 0) {
    return {
      query: q,
      city,
      total_matches: 0,
      page: 1,
      per_page: 0,
      venues: [],
      _fallback: true,
    };
  }

  const { data: rowsRaw, error: rowsError } = await sb
    .from("menu_extracted_rows")
    .select(
      "id, document_id, wine_name, producer, vintage, region, country, wine_type, price_glass, price_bottle, currency, needs_review, row_type",
    )
    .eq("row_type", "wine_row")
    .eq("needs_review", false)
    .in("document_id", docIds);
  if (rowsError) throw new Error(rowsError.message);

  type LegacyRow = {
    id: string;
    document_id: string;
    wine_name: string | null;
    producer: string | null;
    vintage: string | null;
    region: string | null;
    country: string | null;
    wine_type: string | null;
    price_glass: number | null;
    price_bottle: number | null;
    currency: string | null;
  };

  const filtered = ((rowsRaw ?? []) as LegacyRow[]).filter((r) => {
    const textHit =
      (r.wine_name?.toLowerCase().includes(qLower) ?? false) ||
      (r.producer?.toLowerCase().includes(qLower) ?? false) ||
      (r.region?.toLowerCase().includes(qLower) ?? false);
    if (!textHit) return false;
    const pb = r.price_bottle != null ? Number(r.price_bottle) : null;
    if (minPrice != null && (pb == null || pb < minPrice)) return false;
    if (maxPrice != null && (pb == null || pb > maxPrice)) return false;
    if (wineType != null && r.wine_type !== wineType) return false;
    if (byGlass && (r.price_glass == null || Number.isNaN(Number(r.price_glass)))) return false;
    return true;
  });

  const rpcLike: RpcWineRow[] = filtered.map((r) => {
    const meta = docById[r.document_id];
    const slug = meta?.source_slug ?? "";
    return {
      row_id: r.id,
      producer: r.producer,
      wine_name: r.wine_name,
      vintage: r.vintage,
      region: r.region,
      country: r.country,
      wine_type: r.wine_type,
      price_bottle: r.price_bottle != null ? Math.round(Number(r.price_bottle)) : null,
      price_glass: r.price_glass != null ? Math.round(Number(r.price_glass)) : null,
      currency: r.currency,
      confidence: null,
      source_slug: slug,
      venue_name: slugToName[slug] ?? slug,
      extracted_at: meta?.extracted_at ?? null,
      match_score: 0.3,
    };
  });

  const venues = groupRowsToVenues(rpcLike);
  return {
    query: q,
    city,
    total_matches: filtered.length,
    page: 1,
    per_page: filtered.length,
    venues,
    _fallback: true,
  };
}

/**
 * GET /api/menu-search
 *
 * Query: q (min 2), city, min_price, max_price, wine_type, by_glass, page, per_page
 * Uses Postgres search_menu_wines + count_search_menu_wines; falls back to legacy in-memory search on RPC failure.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const city = (searchParams.get("city") ?? "stockholm").trim().toLowerCase();

    if (q.length < 2) {
      return NextResponse.json({
        query: q,
        city,
        total_matches: 0,
        page: 1,
        per_page: 20,
        venues: [],
        message: "Query q must be at least 2 characters",
      } satisfies MenuSearchResponse & { message: string });
    }

    const minPrice = parseIntParam(searchParams.get("min_price"));
    const maxPrice = parseIntParam(searchParams.get("max_price"));
    const wineType = mapWineTypeParam(searchParams.get("wine_type"));
    const byGlass = parseBoolParam(searchParams.get("by_glass"));

    let page = parseIntParam(searchParams.get("page")) ?? 1;
    if (page < 1) page = 1;
    let perPage = parseIntParam(searchParams.get("per_page")) ?? 20;
    if (perPage < 1) perPage = 20;
    if (perPage > 50) perPage = 50;

    const offset = (page - 1) * perPage;
    const sb = getSupabaseAdmin();

    try {
      const { data: countData, error: countErr } = await sb.rpc("count_search_menu_wines", {
        p_query: q,
        p_city: city,
        p_min_price: minPrice,
        p_max_price: maxPrice,
        p_wine_type: wineType,
        p_by_glass: byGlass,
      });
      if (countErr) throw countErr;

      const totalMatches = Number(countData ?? 0);

      const { data: rows, error: searchErr } = await sb.rpc("search_menu_wines", {
        p_query: q,
        p_city: city,
        p_min_price: minPrice,
        p_max_price: maxPrice,
        p_wine_type: wineType,
        p_by_glass: byGlass,
        p_limit: perPage,
        p_offset: offset,
      });
      if (searchErr) throw searchErr;

      const venues = groupRowsToVenues((rows ?? []) as RpcWineRow[]);

      const body: MenuSearchResponse = {
        query: q,
        city,
        total_matches: Number.isFinite(totalMatches) ? totalMatches : 0,
        page,
        per_page: perPage,
        venues,
      };

      return NextResponse.json(body);
    } catch (rpcErr) {
      console.warn("[menu-search] RPC failed, using legacy search:", rpcErr);
      const legacy = await legacyMenuSearch(sb, {
        q,
        city,
        minPrice,
        maxPrice,
        wineType,
        byGlass,
      });
      legacy.page = page;
      legacy.per_page = perPage;
      return NextResponse.json(legacy);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
