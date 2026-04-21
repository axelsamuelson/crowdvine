import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAppUrl } from "@/lib/app-url";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toImageUrl(path: string | null | undefined): string {
  if (!path) return getAppUrl() + DEFAULT_WINE_IMAGE_PATH;
  const cleanPath = path.trim().replace(/\n/g, "");
  if (cleanPath.startsWith("http")) return cleanPath;
  if (cleanPath.startsWith("/uploads/")) {
    const baseUrl = getAppUrl();
    const fileName = cleanPath.replace("/uploads/", "");
    return `${baseUrl}/api/images/${fileName}`;
  }
  const baseUrl = getAppUrl();
  return `${baseUrl}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

/** Rich select for mixed-case mini-PDP (matches PDP-relevant wine columns where possible). */
const WINES_SELECT_FULL = `
  id,
  wine_name,
  vintage,
  handle,
  base_price_cents,
  label_image_path,
  is_live,
  description,
  description_html,
  tasting_notes,
  grape_varieties,
  color,
  appellation,
  terroir,
  vinification,
  abv,
  summary,
  producers ( name, region )
`;

const WINES_SELECT_NO_SUMMARY = `
  id,
  wine_name,
  vintage,
  handle,
  base_price_cents,
  label_image_path,
  is_live,
  description,
  description_html,
  tasting_notes,
  grape_varieties,
  color,
  appellation,
  terroir,
  vinification,
  abv,
  producers ( name, region )
`;

const WINES_SELECT_MINIMAL = `
  id,
  wine_name,
  vintage,
  handle,
  base_price_cents,
  label_image_path,
  is_live,
  producers ( name, region )
`;

function producerFromRow(w: any): { name: string | null; region: string | null } {
  const p = w.producers;
  if (!p) return { name: null, region: null };
  if (Array.isArray(p)) {
    return {
      name: p[0]?.name ?? null,
      region: p[0]?.region ?? null,
    };
  }
  return {
    name: p.name ?? null,
    region: p.region ?? null,
  };
}

function mapWineRow(w: any, images: { url: string; alt: string }[]) {
  const { name: producer_name, region: producer_region } = producerFromRow(w);
  return {
    id: w.id,
    wine_name: w.wine_name,
    vintage: w.vintage,
    handle: w.handle,
    base_price_cents: w.base_price_cents,
    label_image_path: w.label_image_path ?? null,
    image_url: images[0]?.url ?? toImageUrl(w.label_image_path),
    images,
    description: w.description ?? null,
    description_html: w.description_html ?? null,
    tasting_notes: w.tasting_notes ?? null,
    grape_varieties: w.grape_varieties ?? null,
    color: w.color ?? null,
    appellation: w.appellation ?? null,
    terroir: w.terroir ?? null,
    vinification: w.vinification ?? null,
    abv: w.abv ?? null,
    summary: w.summary ?? null,
    producer_name,
    producer_region,
  };
}

/**
 * GET /api/producers/[producerId]/wines
 * Live wines for a producer (B2C mixed-case builder + mini-PDP).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ producerId: string }> },
) {
  const { producerId } = await params;

  if (!producerId || !UUID_RE.test(producerId)) {
    return NextResponse.json({ error: "Invalid producer id" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  const { data: producer, error: prodErr } = await sb
    .from("producers")
    .select("id, is_live, name")
    .eq("id", producerId)
    .maybeSingle();

  if (prodErr || !producer) {
    return NextResponse.json({ error: "Producer not found" }, { status: 404 });
  }

  if ((producer as { is_live?: boolean }).is_live === false) {
    return NextResponse.json({ error: "Producer not found" }, { status: 404 });
  }

  const producerFallbackName = (producer as { name?: string }).name ?? null;

  async function loadRows(select: string, filterLive: boolean) {
    let q = sb
      .from("wines")
      .select(select)
      .eq("producer_id", producerId)
      .order("wine_name", { ascending: true });
    if (filterLive) q = q.eq("is_live", true);
    return q;
  }

  const attempts: { select: string; live: boolean }[] = [
    { select: WINES_SELECT_FULL, live: true },
    { select: WINES_SELECT_FULL, live: false },
    { select: WINES_SELECT_NO_SUMMARY, live: true },
    { select: WINES_SELECT_NO_SUMMARY, live: false },
    { select: WINES_SELECT_MINIMAL, live: true },
    { select: WINES_SELECT_MINIMAL, live: false },
  ];

  let rows: any[] | null = null;
  let lastError: unknown = null;

  for (const { select, live } of attempts) {
    const { data, error } = await loadRows(select, live);
    if (!error && data) {
      rows = data;
      lastError = null;
      break;
    }
    lastError = error;
  }

  if (!rows) {
    console.error("[producer wines]", lastError);
    return NextResponse.json({ error: "Failed to load wines" }, { status: 500 });
  }

  const wineIds = rows.map((r: any) => r.id);

  const imagesByWine = new Map<string, { url: string; alt: string }[]>();
  if (wineIds.length > 0) {
    const { data: wineImages } = await sb
      .from("wine_images")
      .select("wine_id, image_path, alt_text, sort_order")
      .in("wine_id", wineIds)
      .order("sort_order", { ascending: true });

    for (const img of wineImages || []) {
      const wid = (img as any).wine_id;
      const list = imagesByWine.get(wid) || [];
      list.push({
        url: toImageUrl((img as any).image_path),
        alt: (img as any).alt_text || "",
      });
      imagesByWine.set(wid, list);
    }
  }

  const wines = rows.map((w: any) => {
    const gallery = imagesByWine.get(w.id);
    const images =
      gallery && gallery.length > 0
        ? gallery
        : [
            {
              url: toImageUrl(w.label_image_path),
              alt: `${w.wine_name} ${w.vintage}`,
            },
          ];

    const mapped = mapWineRow(w, images);
    if (!mapped.producer_name && producerFallbackName) {
      mapped.producer_name = producerFallbackName;
    }
    return mapped;
  });

  return NextResponse.json({ wines });
}
