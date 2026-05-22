import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { MenuSearchGroupedWine, MenuSearchResponse, MenuSearchVenueRef } from "@/lib/menu-search-types";

/** Row shape returned by Postgres search_menu_wines (service_role RPC). */
type RpcWineRow = {
  row_id: string;
  document_id: string;
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

type RpcGroupedRow = {
  producer: string | null;
  wine_name: string | null;
  vintage: string | null;
  region: string | null;
  country: string | null;
  wine_type: string | null;
  currency: string | null;
  price_glass_min: number | null;
  price_glass_max: number | null;
  price_bottle_min: number | null;
  price_bottle_max: number | null;
  place_count: number | string | null;
  match_score: number | string | null;
  newest_menu_at: string | null;
  venues: unknown;
};

const SORT_KEYS = new Set(["producer", "price_bottle", "price_glass", "places", "relevance", "newest"]);

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

function parseSortParams(
  searchParams: URLSearchParams,
  browseMode: boolean,
): { sort: string; sort_dir: "asc" | "desc" } {
  const raw = (searchParams.get("sort") ?? "").trim().toLowerCase();
  const dirRaw = (searchParams.get("sort_dir") ?? searchParams.get("dir") ?? "").trim().toLowerCase();
  const sort_dir: "asc" | "desc" = dirRaw === "asc" ? "asc" : "desc";
  if (SORT_KEYS.has(raw)) {
    return { sort: raw, sort_dir };
  }
  if (browseMode) {
    return { sort: "newest", sort_dir: "desc" };
  }
  return { sort: "relevance", sort_dir: "desc" };
}

function rpcGroupedToWine(r: RpcGroupedRow): MenuSearchGroupedWine {
  let venuesRaw: unknown[] = [];
  if (Array.isArray(r.venues)) {
    venuesRaw = r.venues as unknown[];
  } else if (typeof r.venues === "string" && r.venues.trim()) {
    try {
      const p = JSON.parse(r.venues) as unknown;
      if (Array.isArray(p)) venuesRaw = p;
    } catch {
      venuesRaw = [];
    }
  }
  const venues: MenuSearchVenueRef[] = venuesRaw.map((v: Record<string, unknown>) => ({
    document_id: String(v.document_id ?? ""),
    venue_name: (v.venue_name != null ? String(v.venue_name) : "Meny") as string,
    starwinelist_slug: v.starwinelist_slug != null ? String(v.starwinelist_slug).trim() || null : null,
    extracted_at: v.extracted_at != null ? String(v.extracted_at) : null,
  }));

  return {
    producer: r.producer,
    wine_name: r.wine_name,
    vintage: r.vintage,
    region: r.region,
    country: r.country,
    wine_type: r.wine_type,
    currency: r.currency,
    price_glass_min: r.price_glass_min != null ? Number(r.price_glass_min) : null,
    price_glass_max: r.price_glass_max != null ? Number(r.price_glass_max) : null,
    price_bottle_min: r.price_bottle_min != null ? Number(r.price_bottle_min) : null,
    price_bottle_max: r.price_bottle_max != null ? Number(r.price_bottle_max) : null,
    place_count: Number(r.place_count ?? 0),
    match_score: r.match_score != null ? Number(r.match_score) : null,
    newest_menu_at: r.newest_menu_at,
    venues,
  };
}

function normKeyPart(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function groupKey(r: RpcWineRow): string {
  return `${normKeyPart(r.producer)}|${normKeyPart(r.wine_name)}|${normKeyPart(r.vintage)}`;
}

function sortGroupedWines(rows: MenuSearchGroupedWine[], sort: string, sort_dir: "asc" | "desc"): void {
  const dir = sort_dir === "asc" ? 1 : -1;
  const cmpStr = (a: string | null | undefined, b: string | null | undefined) =>
    (a ?? "").localeCompare(b ?? "", "sv", { sensitivity: "base" });
  const ts = (iso: string | null | undefined) => {
    if (!iso) return 0;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  rows.sort((a, b) => {
    if (sort === "producer") {
      const c = cmpStr(a.producer, b.producer);
      if (c !== 0) return c * dir;
      return cmpStr(a.wine_name, b.wine_name) * dir;
    }
    if (sort === "price_bottle") {
      const pa = a.price_bottle_min;
      const pb = b.price_bottle_min;
      if (pa == null && pb == null) return cmpStr(a.producer, b.producer) * dir;
      if (pa == null) return 1;
      if (pb == null) return -1;
      if (pa !== pb) return (pa - pb) * dir;
      return cmpStr(a.producer, b.producer) * dir;
    }
    if (sort === "price_glass") {
      const ga = a.price_glass_min;
      const gb = b.price_glass_min;
      if (ga == null && gb == null) return cmpStr(a.producer, b.producer) * dir;
      if (ga == null) return 1;
      if (gb == null) return -1;
      if (ga !== gb) return (ga - gb) * dir;
      return cmpStr(a.producer, b.producer) * dir;
    }
    if (sort === "places") {
      if (a.place_count !== b.place_count) return (a.place_count - b.place_count) * dir;
      return cmpStr(a.producer, b.producer) * dir;
    }
    if (sort === "relevance") {
      const ma = Number(a.match_score ?? 0);
      const mb = Number(b.match_score ?? 0);
      if (ma !== mb) return (ma - mb) * dir;
      const td = ts(b.newest_menu_at) - ts(a.newest_menu_at);
      if (td !== 0) return td * dir;
      return cmpStr(a.producer, b.producer) * dir;
    }
    const td = ts(a.newest_menu_at) - ts(b.newest_menu_at);
    if (td !== 0) return td * dir;
    return cmpStr(a.producer, b.producer) * dir;
  });
}

function rpcRowsToGroupedWines(rows: RpcWineRow[]): MenuSearchGroupedWine[] {
  type Acc = {
    producer: string | null;
    wine_name: string | null;
    vintage: string | null;
    region: string | null;
    country: string | null;
    wine_type: string | null;
    currency: string | null;
    glasses: number[];
    bottles: number[];
    byDoc: Map<string, MenuSearchVenueRef>;
    match_score: number;
    newest_menu_at: string | null;
  };

  const m = new Map<string, Acc>();

  for (const r of rows) {
    const k = groupKey(r);
    if (!m.has(k)) {
      m.set(k, {
        producer: r.producer,
        wine_name: r.wine_name,
        vintage: r.vintage,
        region: r.region,
        country: r.country,
        wine_type: r.wine_type,
        currency: r.currency,
        glasses: [],
        bottles: [],
        byDoc: new Map(),
        match_score: Number(r.match_score ?? 0),
        newest_menu_at: r.extracted_at,
      });
    }
    const a = m.get(k)!;
    if (r.producer?.trim()) a.producer = r.producer;
    if (r.wine_name?.trim()) a.wine_name = r.wine_name;
    if (r.vintage?.trim()) a.vintage = r.vintage;
    if (r.region?.trim()) a.region = r.region;
    if (r.country?.trim()) a.country = r.country;
    if (r.wine_type?.trim()) a.wine_type = r.wine_type;
    if (r.currency?.trim()) a.currency = r.currency;
    if (r.price_glass != null && !Number.isNaN(Number(r.price_glass))) {
      a.glasses.push(Math.round(Number(r.price_glass)));
    }
    if (r.price_bottle != null && !Number.isNaN(Number(r.price_bottle))) {
      a.bottles.push(Math.round(Number(r.price_bottle)));
    }
    const docId = String(r.document_id);
    const slug = r.source_slug?.trim() || null;
    const name = (r.venue_name?.trim() || slug || "Meny") as string;
    if (!a.byDoc.has(docId)) {
      a.byDoc.set(docId, {
        document_id: docId,
        venue_name: name,
        starwinelist_slug: slug,
        extracted_at: r.extracted_at,
      });
    } else {
      const v = a.byDoc.get(docId)!;
      if (r.extracted_at && (!v.extracted_at || r.extracted_at > v.extracted_at)) {
        v.extracted_at = r.extracted_at;
      }
      if (slug && !v.starwinelist_slug) v.starwinelist_slug = slug;
    }
    a.match_score = Math.max(a.match_score, Number(r.match_score ?? 0));
    if (r.extracted_at && (!a.newest_menu_at || r.extracted_at > a.newest_menu_at)) {
      a.newest_menu_at = r.extracted_at;
    }
  }

  const out: MenuSearchGroupedWine[] = [];
  for (const a of m.values()) {
    const venues = [...a.byDoc.values()].sort((u, v) =>
      u.venue_name.localeCompare(v.venue_name, "sv", { sensitivity: "base" }),
    );
    out.push({
      producer: a.producer,
      wine_name: a.wine_name,
      vintage: a.vintage,
      region: a.region,
      country: a.country,
      wine_type: a.wine_type,
      currency: a.currency,
      price_glass_min: a.glasses.length ? Math.min(...a.glasses) : null,
      price_glass_max: a.glasses.length ? Math.max(...a.glasses) : null,
      price_bottle_min: a.bottles.length ? Math.min(...a.bottles) : null,
      price_bottle_max: a.bottles.length ? Math.max(...a.bottles) : null,
      place_count: venues.length,
      match_score: a.match_score,
      newest_menu_at: a.newest_menu_at,
      venues,
    });
  }
  return out;
}

type LegacySearchParams = {
  q: string;
  city: string;
  minPrice: number | null;
  maxPrice: number | null;
  wineType: string | null;
  byGlass: boolean;
  page: number;
  perPage: number;
  sort: string;
  sort_dir: "asc" | "desc";
};

function cmpStr(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? "").localeCompare(b ?? "", "sv", { sensitivity: "base" });
}

function ts(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * In-memory fallback when grouped RPC fails (same response shape, `_fallback: true`).
 */
async function legacyMenuSearch(
  sb: ReturnType<typeof getSupabaseAdmin>,
  params: LegacySearchParams,
): Promise<MenuSearchResponse> {
  const { q, city, minPrice, maxPrice, wineType, byGlass, page, perPage, sort, sort_dir } = params;
  const qTrim = q.trim();
  const qLower = qTrim.toLowerCase();
  const browseMode = qTrim.length === 0;

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
      query: qTrim,
      city,
      total_matches: 0,
      page,
      per_page: perPage,
      venues: [],
      grouped_wines: [],
      sort,
      sort_dir,
      _fallback: true,
    };
  }

  const slugList = Array.from(slugSet);
  const { data: docsWithSlug, error: docsErr1 } = await sb
    .from("menu_documents")
    .select("id, source_slug, updated_at, extracted_at, file_name")
    .eq("extraction_status", "completed")
    .in("source_slug", slugList);
  const { data: docsNoSlug, error: docsErr2 } = await sb
    .from("menu_documents")
    .select("id, source_slug, updated_at, extracted_at, file_name")
    .eq("extraction_status", "completed")
    .is("source_slug", null);
  if (docsErr1) throw new Error(docsErr1.message);
  if (docsErr2) throw new Error(docsErr2.message);

  const seen = new Set<string>();
  const docs: Array<{
    id: string;
    source_slug: string | null;
    updated_at: string | null;
    extracted_at: string | null;
    file_name: string | null;
  }> = [];
  for (const d of [...(docsWithSlug ?? []), ...(docsNoSlug ?? [])]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    docs.push(d);
  }

  const docIds = docs.map((d) => d.id);
  const docById: Record<
    string,
    { source_slug: string | null; extracted_at: string | null; file_name: string | null }
  > = {};
  docs.forEach((d) => {
    const at = d.updated_at ?? d.extracted_at ?? null;
    docById[d.id] = { source_slug: d.source_slug, extracted_at: at, file_name: d.file_name };
  });

  if (docIds.length === 0) {
    return {
      query: qTrim,
      city,
      total_matches: 0,
      page,
      per_page: perPage,
      venues: [],
      grouped_wines: [],
      sort,
      sort_dir,
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
    if (!browseMode) {
      const textHit =
        (r.wine_name?.toLowerCase().includes(qLower) ?? false) ||
        (r.producer?.toLowerCase().includes(qLower) ?? false) ||
        (r.region?.toLowerCase().includes(qLower) ?? false);
      if (!textHit) return false;
    }
    const pb = r.price_bottle != null ? Number(r.price_bottle) : null;
    if (minPrice != null && pb != null && pb < minPrice) return false;
    if (maxPrice != null && pb != null && pb > maxPrice) return false;
    if (wineType != null && r.wine_type !== wineType) return false;
    if (byGlass && (r.price_glass == null || Number.isNaN(Number(r.price_glass)))) return false;
    return true;
  });

  const rpcLike: RpcWineRow[] = filtered.map((r) => {
    const meta = docById[r.document_id];
    const starSlug = meta?.source_slug?.trim() || null;
    const fileName = meta?.file_name?.trim() || null;
    const venueName =
      (starSlug ? slugToName[starSlug] : null) ?? fileName ?? "Meny (saknar Starwinelist-slug)";
    return {
      row_id: r.id,
      document_id: r.document_id,
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
      source_slug: starSlug,
      venue_name: venueName,
      extracted_at: meta?.extracted_at ?? null,
      match_score: browseMode ? 0 : 0.3,
    };
  });

  if (browseMode) {
    rpcLike.sort((a, b) => {
      const td = ts(b.extracted_at) - ts(a.extracted_at);
      if (td !== 0) return td;
      const p = cmpStr(a.producer, b.producer);
      if (p !== 0) return p;
      return cmpStr(a.wine_name, b.wine_name);
    });
  }

  let grouped = rpcRowsToGroupedWines(rpcLike);
  sortGroupedWines(grouped, sort, sort_dir);

  const totalMatches = grouped.length;
  const offset = (page - 1) * perPage;
  const pageSlice = grouped.slice(offset, offset + perPage);

  return {
    query: qTrim,
    city,
    total_matches: totalMatches,
    page,
    per_page: perPage,
    venues: [],
    grouped_wines: pageSlice,
    sort,
    sort_dir,
    _fallback: true,
  };
}

/**
 * GET /api/menu-search
 *
 * Platform admin only (`getCurrentAdmin`). Used by `/admin/wine-search`.
 *
 * Query: q, city, min_price, max_price, wine_type, by_glass, page, per_page, sort, sort_dir
 * Uses search_menu_wines_grouped + count_search_menu_wines_grouped; falls back to legacy on RPC failure.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const city = (searchParams.get("city") ?? "stockholm").trim().toLowerCase();

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
    const browseMode = q.length === 0;
    const { sort, sort_dir } = parseSortParams(searchParams, browseMode);

    try {
      const { data: countData, error: countErr } = await sb.rpc("count_search_menu_wines_grouped", {
        p_query: q,
        p_city: city,
        p_min_price: minPrice,
        p_max_price: maxPrice,
        p_wine_type: wineType,
        p_by_glass: byGlass,
      });
      if (countErr) throw countErr;

      const totalMatches = Number(countData ?? 0);

      const { data: rows, error: searchErr } = await sb.rpc("search_menu_wines_grouped", {
        p_query: q,
        p_city: city,
        p_min_price: minPrice,
        p_max_price: maxPrice,
        p_wine_type: wineType,
        p_by_glass: byGlass,
        p_sort: sort,
        p_sort_dir: sort_dir,
        p_limit: perPage,
        p_offset: offset,
      });
      if (searchErr) throw searchErr;

      const grouped_wines = ((rows ?? []) as RpcGroupedRow[]).map(rpcGroupedToWine);

      const defaultFilters =
        minPrice == null && maxPrice == null && wineType == null && !byGlass;

      if (browseMode && defaultFilters && totalMatches === 0 && grouped_wines.length === 0) {
        const legacyFull = await legacyMenuSearch(sb, {
          q,
          city,
          minPrice,
          maxPrice,
          wineType,
          byGlass,
          page,
          perPage,
          sort,
          sort_dir,
        });
        if (legacyFull.total_matches > 0) {
          return NextResponse.json(legacyFull);
        }
      }

      const body: MenuSearchResponse = {
        query: q,
        city,
        total_matches: Number.isFinite(totalMatches) ? totalMatches : 0,
        page,
        per_page: perPage,
        venues: [],
        grouped_wines,
        sort,
        sort_dir,
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
        page,
        perPage,
        sort,
        sort_dir,
      });
      return NextResponse.json(legacy);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
