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
import {
  SHIP_QTYS,
  PRICE_DELTAS,
  buildHeatmapShipAxis,
  buildMarginHeatmap,
  buildPriceAxis,
} from "@/lib/finance/margin-heatmap";

export const dynamic = "force-dynamic";

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
