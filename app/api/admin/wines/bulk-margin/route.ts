import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAppUrl } from "@/lib/app-url";

function computeFinalPriceCents(opts: {
  costAmount: number;
  exchangeRate: number;
  priceIncludesVat: boolean;
  marginPercentage: number;
}) {
  const exchangeRate = opts.exchangeRate || 1.0;
  const costAmountInSek = (opts.costAmount || 0) * exchangeRate;
  const alcoholTaxInSek = 22.19; // fixed per bottle
  const costInSek = costAmountInSek + alcoholTaxInSek; // ex VAT

  const marginDecimal = (opts.marginPercentage || 0) / 100;
  const vatRate = opts.priceIncludesVat ? 0.25 : 0;

  // Guard against invalid margin (>= 100%)
  const denom = 1 - marginDecimal;
  if (denom <= 0) return null;

  const priceExVat = costInSek / denom;
  const finalPrice = priceExVat * (1 + vatRate);
  return Math.round(finalPrice * 100);
}

async function fetchExchangeRate(origin: string, from: string) {
  if (!from || from === "SEK") return 1.0;
  try {
    const url = new URL("/api/exchange-rates", origin);
    url.searchParams.set("from", from);
    url.searchParams.set("to", "SEK");
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return 1.0;
    const data: any = await res.json();
    const rate = Number(data?.rate);
    return Number.isFinite(rate) && rate > 0 ? rate : 1.0;
  } catch {
    return 1.0;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Admin auth (same convention as other admin APIs in this repo)
    const adminAuth = req.cookies.get("admin-auth")?.value;
    if (adminAuth !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const margin = body?.margin_percentage;
    const b2bMargin = body?.b2b_margin_percentage;

    const hasB2C =
      margin !== undefined &&
      margin !== null &&
      Number.isFinite(Number(margin)) &&
      Number(margin) >= 0 &&
      Number(margin) < 100;
    const hasB2B = b2bMargin !== undefined;
    const b2bValue =
      b2bMargin === null || b2bMargin === ""
        ? null
        : Number.isFinite(Number(b2bMargin)) && Number(b2bMargin) >= 0 && Number(b2bMargin) < 100
          ? Number(b2bMargin)
          : "invalid";

    if (!hasB2C && !hasB2B) {
      return NextResponse.json(
        { error: "Provide margin_percentage and/or b2b_margin_percentage" },
        { status: 400 },
      );
    }
    if (hasB2B && b2bValue === "invalid") {
      return NextResponse.json(
        { error: "b2b_margin_percentage must be null or 0–99.9" },
        { status: 400 },
      );
    }

    const wineIds = body?.wine_ids;
    const hasFilteredIds = Array.isArray(wineIds) && wineIds.length > 0;

    const sb = getSupabaseAdmin();
    const origin = req.headers.get("origin") || getAppUrl();

    const marginNum = hasB2C ? Number(margin) : 0;

    let query = sb
      .from("wines")
      .select("id, cost_currency, cost_amount, price_includes_vat")
      .order("wine_name");

    if (hasFilteredIds) {
      query = query.in("id", wineIds);
    }

    const { data: wines, error } = await query;

    if (error) throw error;

    const currencies = Array.from(
      new Set((wines || []).map((w: any) => w.cost_currency).filter(Boolean)),
    ) as string[];
    const rateMap = new Map<string, number>();
    for (const c of currencies) {
      rateMap.set(c, await fetchExchangeRate(origin, c));
    }

    let updated = 0;
    let skipped = 0;
    const failures: Array<{ id: string; error: string }> = [];

    const concurrency = 10;
    let idx = 0;

    async function worker() {
      while (idx < (wines || []).length) {
        const i = idx++;
        const w: any = (wines || [])[i];

        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (hasB2C) {
          const costAmount = Number(w.cost_amount || 0);
          if (!Number.isFinite(costAmount) || costAmount <= 0) {
            skipped++;
            if (!hasB2B) continue;
          } else {
            const costCurrency = String(w.cost_currency || "SEK");
            const exchangeRate = rateMap.get(costCurrency) ?? 1.0;
            const priceIncludesVat = w.price_includes_vat !== false;

            const finalPriceCents = computeFinalPriceCents({
              costAmount,
              exchangeRate,
              priceIncludesVat,
              marginPercentage: marginNum,
            });

            if (finalPriceCents === null) {
              failures.push({ id: w.id, error: "invalid margin calculation" });
              continue;
            }

            updateData.margin_percentage = marginNum;
            updateData.calculated_price_cents = finalPriceCents;
            updateData.base_price_cents = finalPriceCents;
          }
        }

        if (hasB2B) {
          updateData.b2b_margin_percentage = b2bValue;
        }

        if (Object.keys(updateData).length <= 1) continue;

        const { error: updateError } = await sb
          .from("wines")
          .update(updateData)
          .eq("id", w.id);

        if (updateError) {
          failures.push({ id: w.id, error: updateError.message });
        } else {
          updated++;
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    return NextResponse.json({
      success: true,
      ...(hasB2C && { margin_percentage: marginNum }),
      ...(hasB2B && { b2b_margin_percentage: b2bValue }),
      updated,
      skipped,
      failed: failures.length,
      failures: failures.slice(0, 20),
    });
  } catch (e: any) {
    console.error("Bulk margin update error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

