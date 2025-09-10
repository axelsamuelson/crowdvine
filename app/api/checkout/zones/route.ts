import { NextResponse } from "next/server";
import { determineZones } from "@/lib/zone-matching";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cartItems, deliveryAddress } = body;

    if (!cartItems || !deliveryAddress) {
      return NextResponse.json(
        { error: "Missing cart items or delivery address" },
        { status: 400 },
      );
    }

    const zones = await determineZones(cartItems, deliveryAddress);

    return NextResponse.json({
      pickupZoneId: zones.pickupZoneId,
      deliveryZoneId: zones.deliveryZoneId,
      pickupZoneName: zones.pickupZoneName,
      deliveryZoneName: zones.deliveryZoneName,
      availableDeliveryZones: zones.availableDeliveryZones || [],
      pallets: zones.pallets || [],
    });
  } catch (error) {
    console.error("Zone determination error:", error);
    return NextResponse.json(
      { error: "Failed to determine zones" },
      { status: 500 },
    );
  }
}
