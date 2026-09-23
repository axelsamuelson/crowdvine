import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { createB2bPalletOverviewAccessToken } from "@/lib/b2b-pallet-access-tokens";

function requestOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * POST /api/admin/b2b-pallet-shipments/[id]/share-link
 * Mint a whole-pallet status overview share URL (no login required for viewers).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: shipmentId } = await params;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        shipmentId,
      )
    ) {
      return NextResponse.json({ error: "Invalid shipment id" }, { status: 400 });
    }

    try {
      const link = await createB2bPalletOverviewAccessToken({
        shipmentId,
        createdBy: admin.id,
        origin: requestOrigin(request),
      });
      return NextResponse.json(link);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create link";
      if (message.includes("not found")) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      throw err;
    }
  } catch (err) {
    console.error("b2b-pallet share-link POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
