import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveWineAlcoholTaxCents } from "@/lib/wine-alcohol-tax";

export const dynamic = "force-dynamic";

type PriceUpdate = {
  wineId: string;
  requiredRetailMajor: number;
};

/**
 * Implied gross-margin % from retail vs (import cost + alcohol tax),
 * matching the catalog formula: priceExVat = (cost+tax) / (1 - M).
 */
function impliedMarginPercentage(opts: {
  retailMajor: number;
  priceIncludesVat: boolean;
  purchaseCostCents: number;
  alcoholTaxCents: number;
}): number | null {
  const retail = Math.max(0, opts.retailMajor);
  if (!(retail > 0)) return null;
  const priceExVat = opts.priceIncludesVat ? retail / 1.25 : retail;
  const costBaseSek =
    Math.max(0, opts.purchaseCostCents) / 100 +
    Math.max(0, opts.alcoholTaxCents) / 100;
  if (!(priceExVat > 0) || !(costBaseSek > 0) || costBaseSek >= priceExVat) {
    return null;
  }
  const m = 1 - costBaseSek / priceExVat;
  if (!Number.isFinite(m) || m < 0 || m >= 1) return null;
  return Math.round(m * 1000) / 10; // one decimal, e.g. 34.5
}

/**
 * POST /api/admin/finance/apply-pact-prices
 * Writes required retail prices from the finance heatmap dialog onto live wines.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const rawPrices = Array.isArray(body.prices) ? body.prices : [];
    const exciseRateMultiplier =
      Number(body.exciseRateMultiplier) > 0 &&
      Number(body.exciseRateMultiplier) <= 1
        ? Number(body.exciseRateMultiplier)
        : 1;

    const prices: PriceUpdate[] = [];
    for (const row of rawPrices) {
      const wineId = String(row?.wineId || "").trim();
      const requiredRetailMajor = Number(row?.requiredRetailMajor);
      if (!wineId || !Number.isFinite(requiredRetailMajor) || requiredRetailMajor <= 0) {
        continue;
      }
      prices.push({
        wineId,
        requiredRetailMajor: Math.round(requiredRetailMajor),
      });
    }

    if (prices.length === 0) {
      return NextResponse.json(
        { error: "Inga giltiga vinpriser att uppdatera" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    const ids = prices.map((p) => p.wineId);
    const { data: wines, error } = await sb
      .from("wines")
      .select(
        "id, wine_name, cost_amount, cost_currency, exchange_rate, alcohol_tax_cents, price_includes_vat",
      )
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const byId = new Map((wines || []).map((w) => [String(w.id), w]));
    let updated = 0;
    const failures: Array<{ wineId: string; error: string }> = [];

    for (const item of prices) {
      const wine = byId.get(item.wineId);
      if (!wine) {
        failures.push({ wineId: item.wineId, error: "Vin hittades inte" });
        continue;
      }

      const basePriceCents = Math.round(item.requiredRetailMajor * 100);
      const fullExcise = resolveWineAlcoholTaxCents(
        wine.alcohol_tax_cents as number | null | undefined,
      );
      const alcoholTaxCents = Math.round(fullExcise * exciseRateMultiplier);
      const priceIncludesVat = wine.price_includes_vat !== false;

      const costAmount = Number(wine.cost_amount) || 0;
      const fx =
        String(wine.cost_currency || "SEK").toUpperCase() === "SEK"
          ? 1
          : Number(wine.exchange_rate) > 0
            ? Number(wine.exchange_rate)
            : 1;
      const purchaseCostCents = Math.round(costAmount * fx * 100);

      const marginPercentage = impliedMarginPercentage({
        retailMajor: item.requiredRetailMajor,
        priceIncludesVat,
        purchaseCostCents,
        alcoholTaxCents,
      });

      const patch: Record<string, unknown> = {
        base_price_cents: basePriceCents,
        calculated_price_cents: basePriceCents,
        alcohol_tax_cents: alcoholTaxCents,
        updated_at: new Date().toISOString(),
      };
      if (marginPercentage != null) {
        patch.margin_percentage = marginPercentage;
      }

      const { error: updateError } = await sb
        .from("wines")
        .update(patch)
        .eq("id", item.wineId);

      if (updateError) {
        failures.push({ wineId: item.wineId, error: updateError.message });
      } else {
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      failed: failures.length,
      failures: failures.slice(0, 20),
      exciseRateMultiplier,
    });
  } catch (e) {
    console.error("[finance] apply-pact-prices:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
