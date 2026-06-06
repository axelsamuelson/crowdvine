import { NextRequest, NextResponse } from "next/server";
import { validatePostalCode } from "@/lib/instabee/home-delivery";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postalCode = searchParams.get("postalCode");
  const countryCode = searchParams.get("countryCode") ?? "SE";

  if (!postalCode) {
    return NextResponse.json(
      { error: "postalCode required" },
      { status: 400 },
    );
  }

  const available = await validatePostalCode(postalCode, countryCode);

  return NextResponse.json({ available });
}
