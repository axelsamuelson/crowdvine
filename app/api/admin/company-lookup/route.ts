import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

/** Normalize Swedish org number to digits only, then format as XXXXXX-XXXX. */
function normalizeOrgNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 10) return null;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

/**
 * GET /api/admin/company-lookup?orgnr=5560747551
 * Fetches company data from ABPI.se (free tier: 100 requests/day). Returns fields for invoice recipient form.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const orgnr = request.nextUrl.searchParams.get("orgnr")?.trim();
    if (!orgnr) {
      return NextResponse.json({ error: "orgnr is required" }, { status: 400 });
    }

    const normalized = normalizeOrgNumber(orgnr);
    if (!normalized) {
      return NextResponse.json(
        { error: "Ogiltigt organisationsnummer. Ange 10 siffror (t.ex. 556074-7551)." },
        { status: 400 },
      );
    }

    const url = `https://abpi.se/api/${normalized}/data`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: "Företaget hittades inte i ABPI." },
          { status: 404 },
        );
      }
      const text = await res.text();
      console.error("ABPI lookup failed:", res.status, text);
      return NextResponse.json(
        { error: "Kunde inte hämta företagsdata. Försök igen senare." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      basic_info?: { name?: string; legal_name?: string; orgnr?: string; phone?: string };
      addresses?: {
        visitor_address?: { address_line?: string; zip_code?: string; post_place?: string };
        postal_address?: { address_line?: string; zip_code?: string; post_place?: string };
      };
      contact_person?: { name?: string; role?: string };
    };

    const name = data.basic_info?.name || data.basic_info?.legal_name || "";
    const addr = data.addresses?.visitor_address || data.addresses?.postal_address;
    const address = (addr?.address_line || "").trim();
    const postal_code = (addr?.zip_code || "").trim();
    const city = (addr?.post_place || "").trim();
    const contactName = data.contact_person?.name || "";
    const orgNumber = data.basic_info?.orgnr
      ? normalizeOrgNumber(data.basic_info.orgnr) || data.basic_info.orgnr
      : normalized;
    const phone = data.basic_info?.phone || "";

    return NextResponse.json({
      company_name: name,
      contact_name: contactName,
      address,
      postal_code,
      city,
      org_number: orgNumber,
      phone: phone || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
