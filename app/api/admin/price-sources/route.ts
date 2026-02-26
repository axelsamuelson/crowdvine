import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  listPriceSources,
  createPriceSource,
  type CreatePriceSourceInput,
} from "@/lib/external-prices/db";

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (admin) return;
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const sb = getSupabaseAdmin();
  const { data: profile } = await sb
    .from("profiles")
    .select("roles, role")
    .eq("id", user.id)
    .single();
  const isAdmin =
    profile?.roles?.includes("admin") ||
    profile?.role === "admin" ||
    (user as { roles?: string[]; role?: string }).roles?.includes("admin") ||
    (user as { role?: string }).role === "admin";
  if (!isAdmin) throw new Error("Admin access required");
}

/**
 * GET /api/admin/price-sources
 * List all price sources (competitor shops).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const activeOnly = request.nextUrl.searchParams.get("active") === "true";
    const sources = await listPriceSources(activeOnly);
    return NextResponse.json(sources);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/price-sources
 * Create a new price source.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as CreatePriceSourceInput;
    if (!body.name || !body.slug || !body.base_url) {
      return NextResponse.json(
        { error: "name, slug, and base_url are required" },
        { status: 400 }
      );
    }
    const source = await createPriceSource(body);
    return NextResponse.json(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
