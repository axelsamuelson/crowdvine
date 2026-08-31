import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { loadAssortmentWineCostRows } from "@/lib/finance/assortment-defaults";
import {
  solveRequiredRetailPrice,
  type MarginTargetKind,
  type SolverCostAssumptions,
} from "@/lib/finance/solvers";

export const dynamic = "force-dynamic";

const TARGET_KINDS = new Set<MarginTargetKind>([
  "gm1_percent",
  "gm2_percent",
  "gm3_percent",
  "gm1_sek_per_bottle",
  "gm2_sek_per_bottle",
  "gm3_sek_per_bottle",
]);

/**
 * POST /api/admin/finance/assortment-margin-prices
 * For a target margin + scenario assumptions, return required retail price per live wine.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const targetKind = String(body.targetKind || "") as MarginTargetKind;
    const target = Number(body.target);
    if (!TARGET_KINDS.has(targetKind) || !Number.isFinite(target)) {
      return NextResponse.json(
        { error: "Ogiltig targetKind eller target" },
        { status: 400 },
      );
    }

    const base = (body.assumptions || {}) as Partial<SolverCostAssumptions> & {
      exciseRateMultiplier?: number;
    };
    const exciseRateMultiplier =
      Number(base.exciseRateMultiplier) > 0 &&
      Number(base.exciseRateMultiplier) <= 1
        ? Number(base.exciseRateMultiplier)
        : 1;
    const wines = await loadAssortmentWineCostRows();

    const rows = wines.map((w) => {
      const assumptions: SolverCostAssumptions = {
        priceIncludesVat: base.priceIncludesVat !== false,
        vatRate: Number(base.vatRate) || 0.25,
        bottlesPerOrder: Math.max(1, Math.floor(Number(base.bottlesPerOrder) || 6)),
        purchaseCostCentsPerBottle: w.purchaseCostCents,
        purchaseCostCurrency: "SEK",
        purchaseFxRate: 1,
        exciseCentsPerBottle: Math.round(w.exciseCents * exciseRateMultiplier),
        eprCentsPerBottle: Math.max(0, Math.round(Number(base.eprCentsPerBottle) || 50)),
        refundBreakageReserveRate: Math.max(
          0,
          Number(base.refundBreakageReserveRate) || 0.01,
        ),
        stripeFeePercent: Math.max(0, Number(base.stripeFeePercent) || 0),
        stripeFeeFixedCentsPerOrder: Math.max(
          0,
          Math.round(Number(base.stripeFeeFixedCentsPerOrder) || 0),
        ),
        shippingRevenueGrossCentsPerOrder: Math.max(
          0,
          Math.round(Number(base.shippingRevenueGrossCentsPerOrder) || 0),
        ),
        shippingPriceIncludesVat: base.shippingPriceIncludesVat !== false,
        outboundCarrierCostCentsPerOrder: Math.max(
          0,
          Math.round(Number(base.outboundCarrierCostCentsPerOrder) || 0),
        ),
        inboundFreightTotalCents: Math.max(
          0,
          Math.round(Number(base.inboundFreightTotalCents) || 0),
        ),
        assumedShipQuantity: Math.max(
          1,
          Math.floor(Number(base.assumedShipQuantity) || 120),
        ),
      };

      const solved = solveRequiredRetailPrice({
        targetKind,
        target,
        assumptions,
      });

      return {
        wineId: w.id,
        wineName: w.wineName,
        vintage: w.vintage,
        purchaseCostCents: w.purchaseCostCents,
        exciseCents: w.exciseCents,
        ...(solved.ok
          ? {
              ok: true as const,
              requiredRetailMajor: solved.requiredRetailMajor,
              gm1Cents: solved.gm1Cents,
              gm2Cents: solved.gm2Cents,
              gm1Percent: solved.gm1Percent,
              gm2Percent: solved.gm2Percent,
            }
          : {
              ok: false as const,
              reason: solved.reason,
            }),
      };
    });

    rows.sort((a, b) => {
      if (a.ok && b.ok) return a.requiredRetailMajor - b.requiredRetailMajor;
      if (a.ok) return -1;
      if (b.ok) return 1;
      return a.wineName.localeCompare(b.wineName, "sv");
    });

    return NextResponse.json({
      targetKind,
      target,
      shipQty: Math.max(1, Math.floor(Number(base.assumedShipQuantity) || 120)),
      count: rows.length,
      rows,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status =
      msg === "Unauthorized" || msg.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
