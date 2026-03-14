import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/menu-search?q=...&city=stockholm
 * Search extracted menu rows by wine query (producer + name + optional vintage).
 * Returns venues (slug/name) with matching rows and cheapest bottle price per venue.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const city = (searchParams.get("city") ?? "stockholm").trim();

    if (q.length < 2) {
      return NextResponse.json({
        query: q,
        city,
        venues: [],
        message: "Query q must be at least 2 characters",
      });
    }

    const sb = getSupabaseAdmin();

    // 1) Get document IDs for this city (via starwinelist_sources)
    const { data: sources, error: sourcesError } = await sb
      .from("starwinelist_sources")
      .select("slug, name")
      .eq("city", city);
    if (sourcesError) {
      return NextResponse.json({ error: sourcesError.message }, { status: 500 });
    }
    const slugSet = new Set((sources ?? []).map((s: { slug: string }) => s.slug));
    const slugToName: Record<string, string> = {};
    (sources ?? []).forEach((s: { slug: string; name: string | null }) => {
      slugToName[s.slug] = s.name ?? s.slug;
    });

    // 2) Get menu_documents with source_slug in these slugs
    const { data: docs, error: docsError } = await sb
      .from("menu_documents")
      .select("id, source_slug, extracted_at")
      .in("source_slug", Array.from(slugSet));
    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 });
    }
    const docIds = (docs ?? []).map((d: { id: string }) => d.id);
    const docById: Record<string, { source_slug: string | null; extracted_at: string | null }> = {};
    (docs ?? []).forEach((d: { id: string; source_slug: string | null; extracted_at: string | null }) => {
      docById[d.id] = { source_slug: d.source_slug, extracted_at: d.extracted_at };
    });

    if (docIds.length === 0) {
      return NextResponse.json({
        query: q,
        city,
        venues: [],
      });
    }

    // 3) Get extracted rows for these documents; filter by q in memory (avoids PostgREST ilike escaping)
    const { data: rowsRaw, error: rowsError } = await sb
      .from("menu_extracted_rows")
      .select("id, document_id, raw_text, wine_name, producer, vintage, price_glass, price_bottle, price_other, currency")
      .in("document_id", docIds);
    if (rowsError) {
      return NextResponse.json({ error: rowsError.message }, { status: 500 });
    }
    const qLower = q.toLowerCase();
    const rowsList = ((rowsRaw ?? []) as Array<{
      id: string;
      document_id: string;
      raw_text: string;
      wine_name: string | null;
      producer: string | null;
      vintage: string | null;
      price_glass: number | null;
      price_bottle: number | null;
      price_other: number | null;
      currency: string | null;
    }>).filter(
      (r) =>
        (r.wine_name?.toLowerCase().includes(qLower) ?? false) ||
        (r.producer?.toLowerCase().includes(qLower) ?? false)
    );

    // 4) Group by document_id, compute min(price_bottle), attach venue info
    const byDoc: Record<string, typeof rowsList> = {};
    for (const row of rowsList) {
      if (!byDoc[row.document_id]) byDoc[row.document_id] = [];
      byDoc[row.document_id].push(row);
    }

    const venues: Array<{
      slug: string;
      name: string;
      document_id: string;
      source_slug: string;
      extracted_at: string | null;
      cheapest_bottle: number | null;
      currency: string | null;
      match_count: number;
      rows: Array<{
        wine_name: string | null;
        producer: string | null;
        vintage: string | null;
        price_bottle: number | null;
        price_glass: number | null;
        currency: string | null;
      }>;
    }> = [];

    for (const [docId, docRows] of Object.entries(byDoc)) {
      const meta = docById[docId];
      const slug = meta?.source_slug ?? docId;
      const name = slugToName[slug] ?? slug;
      const prices = docRows.map((r) => r.price_bottle).filter((p): p is number => p != null && !Number.isNaN(p));
      const cheapest_bottle = prices.length > 0 ? Math.min(...prices) : null;
      const currency = docRows[0]?.currency ?? null;
      const sortedRows = [...docRows].sort((a, b) => {
        const pa = a.price_bottle ?? Infinity;
        const pb = b.price_bottle ?? Infinity;
        return pa - pb;
      });
      venues.push({
        slug,
        name,
        document_id: docId,
        source_slug: slug,
        extracted_at: meta?.extracted_at ?? null,
        cheapest_bottle,
        currency,
        match_count: docRows.length,
        rows: sortedRows.slice(0, 50).map((r) => ({
          wine_name: r.wine_name,
          producer: r.producer,
          vintage: r.vintage,
          price_bottle: r.price_bottle,
          price_glass: r.price_glass,
          currency: r.currency,
        })),
      });
    }

    // Sort by cheapest_bottle ascending (nulls last)
    venues.sort((a, b) => {
      const pa = a.cheapest_bottle ?? Infinity;
      const pb = b.cheapest_bottle ?? Infinity;
      return pa - pb;
    });

    return NextResponse.json({
      query: q,
      city,
      venues,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
