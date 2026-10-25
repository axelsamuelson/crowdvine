import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  b2bPalletWriteHttpError,
  createB2bShareLink,
} from "@/lib/admin/b2b-pallet-writes";

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

    const link = await createB2bShareLink({
      shipmentId,
      createdBy: admin.id,
      origin: requestOrigin(request),
    });
    return NextResponse.json(link);
  } catch (err) {
    const mapped = b2bPalletWriteHttpError(err);
    if (mapped.status >= 500) {
      console.error("b2b-pallet share-link POST:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
