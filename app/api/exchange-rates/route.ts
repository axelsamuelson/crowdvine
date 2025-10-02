import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.toUpperCase();
  const to = searchParams.get("to")?.toUpperCase();

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing 'from' or 'to' currency parameters" },
      { status: 400 },
    );
  }

  try {
    // Use an exchange rate API - using exchangerate-api.com which is free
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      },
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    const rate = data.rates[to];

    if (!rate) {
      return NextResponse.json(
        { error: `Cannot convert ${from} to ${to}` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      from,
      to,
      rate,
      timestamp: data.date,
    });
  } catch (error) {
    console.error("Exchange rate fetch error:", error);

    // Fallback to hardcoded rates for EUR and USD if API fails
    const fallbackRates: Record<string, Record<string, number>> = {
      EUR: {
        SEK: 11.25, // Approximate EUR to SEK rate
      },
      USD: {
        SEK: 10.50, // Approximate USD to SEK rate
      },
      GBP: {
        SEK: 13.20, // Approximate GBP to SEK rate
      },
    };

    const fallbackRate = fallbackRates[from]?.[to];
    if (fallbackRate) {
      console.warn(`Using fallback rate for ${from} to ${to}: ${fallbackRate}`);
      return NextResponse.json({
        from,
        to,
        rate: fallbackRate,
        timestamp: new Date().toISOString().split("T")[0],
        fallback: true,
      });
    }

    return NextResponse.json(
      {
        error: "Failed to fetch exchange rate and no fallback available",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}