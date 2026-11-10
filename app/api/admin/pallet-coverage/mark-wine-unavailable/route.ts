import { NextResponse } from "next/server";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";
import { markWineUnavailableOnPallet } from "@/lib/pallet-coverage-close/admin-mark-unavailable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin: mark a wine unavailable on a locked/scheduled coverage-close pallet.
 * Affected lines → pending_choice; email behind PALLET_COVERAGE_CLOSE_SEND_EMAIL (default OFF).
 */
export async function POST(request: Request) {
  const gate = await requireAdminOr401();
  if (isUnauthorizedResponse(gate)) return gate;

  let body: { palletId?: string; wineId?: string; wineTitle?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const palletId = String(body.palletId ?? "").trim();
  const wineId = String(body.wineId ?? "").trim();
  if (!palletId || !wineId) {
    return NextResponse.json(
      { error: "palletId and wineId required" },
      { status: 400 },
    );
  }

  const result = await markWineUnavailableOnPallet({
    palletId,
    wineId,
    wineTitle: body.wineTitle,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
