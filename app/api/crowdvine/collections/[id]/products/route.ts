import { NextResponse } from "next/server";
import { fetchCollectionProductsData } from "@/lib/crowdvine/products-data";
import { resolveShoppingContext } from "@/lib/shopping-context/resolve";
import { getSekToDisplayRate } from "@/lib/shopping-context/display-currency";
import { isB2BHost } from "@/lib/b2b-site";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 200;

    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const cookieStore = await cookies();
    const shopping = await resolveShoppingContext({
      host,
      searchParams,
      cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value ?? null,
      acceptLanguage: request.headers.get("accept-language"),
    });

    const resolvedParams = await params;
    const products = await fetchCollectionProductsData(resolvedParams.id, {
      limit,
      isB2BSite: isB2BHost(host, searchParams),
      displayCurrencyCode: shopping.currencyCode,
      sekToDisplayRate: await getSekToDisplayRate(shopping.currencyCode),
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching collection products:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection products" },
      { status: 500 },
    );
  }
}
