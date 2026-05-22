import { NextResponse } from "next/server";
import { fetchProductsData } from "@/lib/crowdvine/products-data";
import { isB2BHost } from "@/lib/b2b-site";
import { resolveShoppingContext } from "@/lib/shopping-context/resolve";
import { getSekToDisplayRate } from "@/lib/shopping-context/display-currency";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 200;
    const sortKey = searchParams.get("sortKey") || "RELEVANCE";
    const reverse = searchParams.get("reverse") === "true";

    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const isB2BSite = isB2BHost(host, searchParams);
    const cookieStore = await cookies();
    const shopping = await resolveShoppingContext({
      host,
      searchParams,
      cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value ?? null,
      acceptLanguage: request.headers.get("accept-language"),
    });

    const products = await fetchProductsData({
      limit,
      sortKey: sortKey as "RELEVANCE" | "PRICE" | "CREATED_AT" | "CREATED",
      reverse,
      isB2BSite,
      displayCurrencyCode: shopping.currencyCode,
      sekToDisplayRate: await getSekToDisplayRate(shopping.currencyCode),
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching wines:", error);
    return NextResponse.json(
      { error: "Failed to fetch wines" },
      { status: 500 },
    );
  }
}
