import { NextResponse } from "next/server";
import {
  createSharedBox,
  listSharedBoxesForUser,
} from "@/lib/shared-boxes";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const boxes = await listSharedBoxesForUser();
    return NextResponse.json({ boxes });
  } catch (error) {
    console.error("Shared boxes GET error:", error);
    return NextResponse.json(
      { error: "Failed to load shared boxes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { producerId, producerName, wineId, inviteeIds, title, quantity } =
      await request.json();

    if (!producerId) {
      return NextResponse.json(
        { error: "Missing producerId" },
        { status: 400 },
      );
    }

    const sharedBoxId = await createSharedBox({
      producerId,
      producerName,
      wineId,
      title,
      inviteeIds,
      initialQuantity: quantity ?? 1,
    });

    return NextResponse.json({ sharedBoxId });
  } catch (error) {
    console.error("Shared boxes POST error:", error);
    return NextResponse.json(
      { error: "Failed to create shared box" },
      { status: 500 },
    );
  }
}

