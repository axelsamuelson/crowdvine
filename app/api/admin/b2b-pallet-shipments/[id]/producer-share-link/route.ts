import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { createB2bPalletAccessToken } from "@/lib/b2b-pallet-access-tokens";

const bodySchema = z.object({
  producer_id: z.string().uuid(),
});

function requestOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body" },
        { status: 400 },
      );
    }

    try {
      const link = await createB2bPalletAccessToken({
        shipmentId,
        producerId: parsed.data.producer_id,
        createdBy: admin.id,
        origin: requestOrigin(request),
      });
      return NextResponse.json(link);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create link";
      if (message.includes("no wines")) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      throw err;
    }
  } catch (err) {
    console.error("producer-share-link POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
