import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getCurrentUser } from "@/lib/supabase-server";
import { confirmPalletPickupProducer } from "@/lib/pallet-pickup-selection";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: palletId } = await params;
  if (!palletId || typeof palletId !== "string") {
    return NextResponse.json({ error: "Missing pallet id" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { producerId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const producerId =
    typeof body.producerId === "string" ? body.producerId.trim() : "";
  if (!producerId) {
    return NextResponse.json(
      { error: "producerId is required" },
      { status: 400 },
    );
  }

  const result = await confirmPalletPickupProducer({
    palletId,
    producerId,
    adminUserId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    palletId,
    producerId,
  });
}
