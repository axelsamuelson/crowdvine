import { NextRequest, NextResponse } from "next/server";
import { getPalletZoneStatusForHandle } from "@/lib/pallet/get-zone-status";

export async function GET(request: NextRequest) {
  const productHandle = request.nextUrl.searchParams.get("productHandle");
  const requestHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  const payload = await getPalletZoneStatusForHandle(productHandle, {
    requestHost,
    searchParams: request.nextUrl.searchParams,
  });

  return NextResponse.json(payload);
}
