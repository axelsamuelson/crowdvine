import { NextResponse } from "next/server";
import { fetchCollectionProductsData } from "@/lib/crowdvine/products-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 200;

    const resolvedParams = await params;
    const products = await fetchCollectionProductsData(resolvedParams.id, {
      limit,
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
