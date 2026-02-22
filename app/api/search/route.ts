import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";

function toProducerHandle(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function convertToFullUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const cleanPath = String(path).trim().replace(/\n/g, "");
  if (cleanPath.startsWith("http")) return cleanPath;

  const baseUrl = getAppUrl();

  if (cleanPath.startsWith("/uploads/")) {
    const fileName = cleanPath.replace("/uploads/", "");
    return `${baseUrl}/api/images/${fileName}`;
  }

  return `${baseUrl}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const qRaw = (searchParams.get("q") || "").trim();

    if (qRaw.length < 2) {
      return NextResponse.json({ users: [], wines: [], producers: [] });
    }

    const q = qRaw.replace(/[%_]/g, "");
    const sb = getSupabaseAdmin();

    const usersPromise = sb
      .from("profiles")
      .select("id, full_name, avatar_image_path, description")
      .neq("id", user.id)
      .or(`full_name.ilike.%${q}%,description.ilike.%${q}%`)
      .order("updated_at", { ascending: false })
      .limit(5);

    const winesSelect = `
        id,
        wine_name,
        vintage,
        color,
        handle,
        base_price_cents,
        label_image_path,
        producers!inner(name)
      `;
    const winesPromise = (async () => {
      let r = await sb
        .from("wines")
        .select(winesSelect)
        .eq("is_live", true)
        .or(`wine_name.ilike.%${q}%,handle.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(5);
      if (r.error && /is_live|column.*does not exist/i.test(r.error.message ?? "")) {
        r = await sb
          .from("wines")
          .select(winesSelect)
          .or(`wine_name.ilike.%${q}%,handle.ilike.%${q}%`)
          .order("created_at", { ascending: false })
          .limit(5);
      }
      return r;
    })();

    const producersPromise = sb
      .from("producers")
      .select("id, name, region, logo_image_path")
      .or(`name.ilike.%${q}%,region.ilike.%${q}%`)
      .order("name", { ascending: true })
      .limit(5);

    const [{ data: users, error: usersErr }, { data: wines, error: winesErr }, { data: producers, error: producersErr }] =
      await Promise.all([usersPromise, winesPromise, producersPromise]);

    if (usersErr) throw usersErr;
    if (winesErr) throw winesErr;
    if (producersErr) throw producersErr;

    return NextResponse.json({
      users: (users || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        description: u.description,
        avatar_image_path: u.avatar_image_path,
      })),
      wines: (wines || []).map((w: any) => ({
        id: w.id,
        name: `${w.wine_name}${w.vintage ? ` ${w.vintage}` : ""}`.trim(),
        handle: w.handle,
        producerName: w.producers?.name || "Unknown Producer",
        color: w.color,
        priceCents: w.base_price_cents,
        imageUrl:
          convertToFullUrl(w.label_image_path) ||
          "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
      })),
      producers: (producers || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        region: p.region,
        handle: toProducerHandle(p.name || "producer"),
        logoUrl: convertToFullUrl(p.logo_image_path),
      })),
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
