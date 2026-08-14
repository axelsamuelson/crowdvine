import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listProducerB2bPallets } from "@/lib/producer-b2b-pallets";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "producer" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.producer_id) {
      return NextResponse.json(
        { error: "No producer linked to this account" },
        { status: 400 },
      );
    }

    const pallets = await listProducerB2bPallets(user.producer_id);
    return NextResponse.json({ pallets });
  } catch (err) {
    console.error("[producer/b2b-pallets] GET:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list pallets" },
      { status: 500 },
    );
  }
}
