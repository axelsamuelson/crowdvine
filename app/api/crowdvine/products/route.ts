import { NextResponse } from "next/server";
import { fetchProductsData } from "@/lib/crowdvine/products-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 200;
    const sortKey = searchParams.get("sortKey") || "RELEVANCE";
    const reverse = searchParams.get("reverse") === "true";

    const products = await fetchProductsData({
      limit,
      sortKey: sortKey as "RELEVANCE" | "PRICE" | "CREATED_AT" | "CREATED",
      reverse,
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
