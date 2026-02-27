import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { detectPlatform } from "@/lib/external-prices/detect-platform";

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
 * POST /api/admin/price-sources/detect
 * Body: { base_url: string }
 * Returns: { adapter_type: "shopify" | "woocommerce" | null }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { base_url?: string };
    const baseUrl = body?.base_url;
    if (typeof baseUrl !== "string" || !baseUrl.trim()) {
      return NextResponse.json(
        { error: "base_url is required" },
        { status: 400 }
      );
    }
    const adapter_type = await detectPlatform(baseUrl);
    return NextResponse.json({ adapter_type });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
