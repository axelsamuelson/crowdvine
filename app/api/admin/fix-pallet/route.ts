import { NextRequest, NextResponse } from "next/server";
import { syncPalletShipReadiness } from "@/lib/pallet-completion";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @deprecated Prefer POST /api/admin/fix-pallet-completion with `{ palletId }`.
 * Kept as an alias that syncs ship-readiness (no hardcoded UUID, no force-uncomplete).
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const palletIdRaw =
      body &&
      typeof body === "object" &&
      body !== null &&
      "palletId" in body
        ? (body as { palletId?: unknown }).palletId
        : null;
    const palletId =
      typeof palletIdRaw === "string" ? palletIdRaw.trim() : "";

    if (!palletId || !UUID_RE.test(palletId)) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid palletId. Pass JSON body: { \"palletId\": \"<uuid>\" }. This endpoint no longer hardcodes a pallet UUID.",
        },
        { status: 400 },
      );
    }

    const sync = await syncPalletShipReadiness(palletId);

    return NextResponse.json({
      success: true,
      message:
        "Delegated to syncPalletShipReadiness (use /api/admin/fix-pallet-completion for full diagnostics)",
      palletId,
      sync,
    });
  } catch (error) {
    console.error("❌ [Fix Pallet] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
