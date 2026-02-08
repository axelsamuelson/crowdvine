import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";

/**
 * GET /api/admin/wines/with-cost
 * Returns wines with computed costCentsExVat (cost ex VAT in öre).
 * Fetches exchange rates when cost_currency is not SEK and exchange_rate is null.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    const user = await getCurrentUser();

    let isAdmin = !!admin;
    if (!isAdmin && user) {
      const sb = getSupabaseAdmin();
      const { data: profile } = await sb
        .from("profiles")
        .select("roles, role")
        .eq("id", user.id)
        .single();
      isAdmin =
        profile?.roles?.includes("admin") ||
        profile?.role === "admin" ||
        (user as { roles?: string[] }).roles?.includes("admin") ||
        (user as { role?: string }).role === "admin";
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const sb = getSupabaseAdmin();
    const { data: wines, error } = await sb
      .from("wines")
      .select(`
        id,
        wine_name,
        vintage,
        grape_varieties,
        color,
        label_image_path,
        cost_amount,
        cost_currency,
        exchange_rate,
        alcohol_tax_cents,
        producers(name)
      `)
      .order("wine_name")
      .order("vintage", { ascending: false });

    if (error || !wines) {
      return NextResponse.json(
        { error: error?.message || "Failed to fetch wines" },
        { status: 500 },
      );
    }

    // Get unique currencies that need exchange rate (not SEK, or exchange_rate null)
    const currenciesNeedingRate = new Set<string>();
    for (const w of wines) {
      const currency = (w.cost_currency || "SEK") as string;
      const needsRate =
        currency !== "SEK" ||
        (w.exchange_rate == null && (w.cost_amount ?? 0) > 0);
      if (needsRate && currency !== "SEK") {
        currenciesNeedingRate.add(currency);
      }
    }

    // Fetch exchange rates
    const rateMap = new Map<string, number>();
    rateMap.set("SEK", 1);

    for (const currency of currenciesNeedingRate) {
      try {
        const res = await fetch(
          `${getAppUrl()}/api/exchange-rates?from=${currency}&to=SEK`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.rate != null) rateMap.set(currency, data.rate);
        }
      } catch {
        // Keep default
      }
    }

    // Compute costCentsExVat for each wine
    const result = wines.map((w: any) => {
      const costAmount = w.cost_amount ?? 0;
      const costCurrency = (w.cost_currency || "SEK") as string;
      const exchangeRate =
        w.exchange_rate ?? rateMap.get(costCurrency) ?? 1;
      const alcoholTaxCents = w.alcohol_tax_cents ?? 0;

      const costInSek = costAmount * exchangeRate + alcoholTaxCents / 100;
      const costCentsExVat = Math.round(costInSek * 100);

      return {
        ...w,
        exchange_rate: exchangeRate,
        costCentsExVat,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error in GET /api/admin/wines/with-cost:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch wines",
        details: err instanceof Error ? err.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
