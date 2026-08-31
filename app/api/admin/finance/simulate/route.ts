import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import {
  calculateUnitScenario,
  solveMaxPurchaseCost,
  solveRequiredRetailPrice,
  inboundFreightCentsPerBottle,
  type FinanceUnitScenarioInput,
  type MarginTargetKind,
} from "@/lib/finance";

export const dynamic = "force-dynamic";

/** Coarser steps for pallet-fill / sensitivity tables. */
const SHIP_QTYS = [
  60, 90, 120, 150, 180, 210, 240, 270, 300, 360, 420, 480, 540, 600, 660, 720,
];
/** Finer ship grid for the margin heatmap only. */
const HEATMAP_SHIP_STEP = 15;
const HEATMAP_SHIP_QTYS = (() => {
  const qtys: number[] = [];
  for (let q = 60; q <= 720; q += HEATMAP_SHIP_STEP) qtys.push(q);
  return qtys;
})();
const HEATMAP_PRICE_STEP = 5;
const PRICE_DELTAS = [
  -80, -60, -50, -40, -30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 40,
  50, 60, 80, 100,
];

function buildPalletFillTable(input: FinanceUnitScenarioInput) {
  return SHIP_QTYS.map((qty) => {
    const inboundPer = inboundFreightCentsPerBottle(
      input.inboundFreightTotalCents,
      qty,
    );
    const atQty = calculateUnitScenario({
      ...input,
      assumedShipQuantity: qty,
    });
    return {
      shipQty: qty,
      inboundPerBottleCents: inboundPer,
      gm1PerBottleCents: atQty.gm1CentsPerBottle,
      gm2PerBottleCents: atQty.gm2CentsPerBottle,
      gm3PerBottleCents: atQty.gm3CentsPerBottle,
      gm1Percent: atQty.gm1Percent,
      gm2Percent: atQty.gm2Percent,
      gm3Percent: atQty.gm3Percent,
    };
  });
}

function buildPriceAxis(baseA: number, baseB: number): number[] {
  const a = Math.max(0, Math.round(Number(baseA) || 0));
  const b = Math.max(0, Math.round(Number(baseB) || 0));
  const lo = Math.max(50, Math.min(a, b) - 50);
  const hi = Math.max(a, b) + 100;
  const set = new Set<number>();
  for (let p = lo; p <= hi; p += HEATMAP_PRICE_STEP) set.add(p);
  set.add(a);
  set.add(b);
  return [...set].sort((x, y) => x - y);
}

function buildHeatmapShipAxis(...anchors: number[]): number[] {
  const set = new Set(HEATMAP_SHIP_QTYS);
  for (const raw of anchors) {
    const q = Math.round(Number(raw) || 0);
    if (q > 0) set.add(q);
  }
  return [...set].sort((x, y) => x - y);
}

function buildMarginHeatmap(
  baseInput: FinanceUnitScenarioInput,
  prices: number[],
  shipQtys: number[],
) {
  const cells: Array<{
    price: number;
    shipQty: number;
    gm1CentsPerBottle: number;
    gm1Percent: number | null;
    gm2CentsPerBottle: number;
    gm2Percent: number | null;
    gm3CentsPerBottle: number;
    gm3Percent: number | null;
  }> = [];
  for (const shipQty of shipQtys) {
    for (const price of prices) {
      const at = calculateUnitScenario({
        ...baseInput,
        sellingPriceMajor: price,
        assumedShipQuantity: shipQty,
      });
      cells.push({
        price,
        shipQty,
        gm1CentsPerBottle: at.gm1CentsPerBottle,
        gm1Percent: at.gm1Percent,
        gm2CentsPerBottle: at.gm2CentsPerBottle,
        gm2Percent: at.gm2Percent,
        gm3CentsPerBottle: at.gm3CentsPerBottle,
        gm3Percent: at.gm3Percent,
      });
    }
  }
  return { prices, shipQtys, cells };
}

function buildSensitivity(input: FinanceUnitScenarioInput) {
  return PRICE_DELTAS.map((d) => {
    const at = calculateUnitScenario({
      ...input,
      sellingPriceMajor: input.sellingPriceMajor + d,
    });
    return {
      priceDeltaSek: d,
      sellingPriceMajor: input.sellingPriceMajor + d,
      gm1Percent: at.gm1Percent,
      gm2Percent: at.gm2Percent,
      gm3Percent: at.gm3Percent,
      gm1CentsPerBottle: at.gm1CentsPerBottle,
      gm2CentsPerBottle: at.gm2CentsPerBottle,
      gm3CentsPerBottle: at.gm3CentsPerBottle,
    };
  });
}

/**
 * POST /api/admin/finance/simulate
 * Ephemeral pricing / margin simulation. Does NOT mutate wines, orders, or snapshots.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const mode = String(body.mode || "scenario");

    if (mode === "solve_price") {
      const result = solveRequiredRetailPrice({
        targetKind: body.targetKind as MarginTargetKind,
        target: Number(body.target),
        assumptions: body.assumptions,
      });
      return NextResponse.json({ result });
    }

    if (mode === "solve_purchase") {
      const result = solveMaxPurchaseCost({
        sellingPriceMajor: Number(body.sellingPriceMajor),
        targetKind: body.targetKind as MarginTargetKind,
        target: Number(body.target),
        assumptions: body.assumptions,
      });
      return NextResponse.json({ result });
    }

    const input = body.input as FinanceUnitScenarioInput;
    const current = calculateUnitScenario(input);
    const proposedInput = {
      ...input,
      ...(body.proposed || {}),
    } as FinanceUnitScenarioInput;
    const proposed = calculateUnitScenario(proposedInput);

    const currentPalletFillTable = buildPalletFillTable(input);
    const proposedPalletFillTable = buildPalletFillTable(proposedInput);
    const currentSensitivity = buildSensitivity(input);
    const proposedSensitivity = buildSensitivity(proposedInput);

    const heatmapPrices = buildPriceAxis(
      input.sellingPriceMajor,
      proposedInput.sellingPriceMajor,
    );
    const heatmapShipQtys = buildHeatmapShipAxis(
      input.assumedShipQuantity,
      proposedInput.assumedShipQuantity,
    );
    const marginHeatmap = buildMarginHeatmap(
      proposedInput,
      heatmapPrices,
      heatmapShipQtys,
    );

    return NextResponse.json({
      mode: "scenario",
      disclaimer: "Endast scenario — uppdaterar inte vinpriser eller ordrar.",
      current,
      proposed,
      currentPalletFillTable,
      proposedPalletFillTable,
      currentSensitivity,
      proposedSensitivity,
      marginHeatmap,
      // Back-compat aliases (föreslagen)
      palletFillTable: proposedPalletFillTable,
      sensitivity: proposedSensitivity,
      volumeImpact: {
        bottles: Number(body.volumeBottles) || proposedInput.bottles,
        gm3DeltaCents:
          (proposed.gm3CentsPerBottle - current.gm3CentsPerBottle) *
          (Number(body.volumeBottles) || proposedInput.bottles),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
