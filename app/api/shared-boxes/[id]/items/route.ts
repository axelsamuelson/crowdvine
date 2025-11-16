import { NextResponse } from "next/server";
import { addWineToSharedBox } from "@/lib/shared-boxes";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { wineId, quantity = 1 } = await request.json();
    if (!wineId) {
      return NextResponse.json({ error: "Missing wineId" }, { status: 400 });
    }

    await addWineToSharedBox(params.id, wineId, quantity);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Shared box add wine error:", error);
    return NextResponse.json(
      { error: "Failed to add wine to box" },
      { status: 500 },
    );
  }
}

