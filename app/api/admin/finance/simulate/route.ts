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

    const shipQtys = [120, 180, 240, 360, 480, 720];
    const palletFillTable = shipQtys.map((qty) => {
      const inboundPer = inboundFreightCentsPerBottle(
        proposedInput.inboundFreightTotalCents,
        qty,
      );
      const atQty = calculateUnitScenario({
        ...proposedInput,
        assumedShipQuantity: qty,
      });
      return {
        shipQty: qty,
        inboundPerBottleCents: inboundPer,
        gm3PerBottleCents: atQty.gm3CentsPerBottle,
        gm3Percent: atQty.gm3Percent,
      };
    });

    const deltas = [-30, -20, -10, 0, 10, 20, 30, 50];
    const sensitivity = deltas.map((d) => {
      const at = calculateUnitScenario({
        ...proposedInput,
        sellingPriceMajor: proposedInput.sellingPriceMajor + d,
      });
      return {
        priceDeltaSek: d,
        sellingPriceMajor: proposedInput.sellingPriceMajor + d,
        gm1Percent: at.gm1Percent,
        gm2Percent: at.gm2Percent,
        gm3Percent: at.gm3Percent,
        gm3CentsPerBottle: at.gm3CentsPerBottle,
      };
    });

    return NextResponse.json({
      mode: "scenario",
      disclaimer: "Scenario only — does not update wine prices or orders.",
      current,
      proposed,
      palletFillTable,
      sensitivity,
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
