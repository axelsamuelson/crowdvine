import { NextRequest, NextResponse } from "next/server";

import { GUIDE_WINE_CATEGORIES } from "@/lib/systembolaget/guide-wine-categories";
import { revalidateSystembolagetGuideCategory } from "@/lib/systembolaget/publish-curated";

export const dynamic = "force-dynamic";

const ALLOWED = new Set<string>(GUIDE_WINE_CATEGORIES);

/**
 * On-demand revalidation for Systembolaget ranked guides.
 * Authorization: Bearer ${CRON_SECRET}
 * Body: { "categories": ["white", "red", ...] }
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const categoriesRaw =
    typeof body === "object" &&
    body !== null &&
    "categories" in body &&
    Array.isArray((body as { categories: unknown }).categories)
      ? (body as { categories: unknown[] }).categories
      : [];

  const categories = [
    ...new Set(
      categoriesRaw
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => ALLOWED.has(value)),
    ),
  ];

  if (categories.length === 0) {
    return NextResponse.json(
      { error: "Provide categories: string[]" },
      { status: 400 },
    );
  }

  for (const category of categories) {
    revalidateSystembolagetGuideCategory(category);
  }

  return NextResponse.json({ ok: true, categories });
}
