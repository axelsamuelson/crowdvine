import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const OCCASIONS = ["aperitif", "casual", "dinner", "special"] as const;
const STYLES = [
  "fresh_fruity",
  "mineral_dry",
  "rich_complex",
  "aromatic_floral",
] as const;
const COLORS = ["red", "white", "orange", "any"] as const;
const BUDGETS = ["low", "mid", "high"] as const;

type Occasion = (typeof OCCASIONS)[number];
type Style = (typeof STYLES)[number];
type Color = (typeof COLORS)[number];
type Budget = (typeof BUDGETS)[number];

interface TasteProfile {
  occasion: Occasion;
  style: Style;
  color: Color;
  adventure: number;
  budget: Budget;
  saved_at: string;
}

function isOccasion(value: unknown): value is Occasion {
  return (
    typeof value === "string" &&
    (OCCASIONS as readonly string[]).includes(value)
  );
}

function isStyle(value: unknown): value is Style {
  return (
    typeof value === "string" && (STYLES as readonly string[]).includes(value)
  );
}

function isColor(value: unknown): value is Color {
  return (
    typeof value === "string" && (COLORS as readonly string[]).includes(value)
  );
}

function isBudget(value: unknown): value is Budget {
  return (
    typeof value === "string" && (BUDGETS as readonly string[]).includes(value)
  );
}

function isAdventure(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function parseTasteProfileBody(body: unknown): TasteProfile | null {
  if (body == null || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const { occasion, style, color, adventure, budget } = record;

  if (
    !isOccasion(occasion) ||
    !isStyle(style) ||
    !isColor(color) ||
    !isAdventure(adventure) ||
    !isBudget(budget)
  ) {
    return null;
  }

  return {
    occasion,
    style,
    color,
    adventure,
    budget,
    saved_at: new Date().toISOString(),
  };
}

/**
 * GET /api/taste-profile
 *
 * Returns the logged-in user's saved taste profile.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("profiles")
      .select("taste_profile, taste_profile_updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      profile: data?.taste_profile ?? null,
      updatedAt: data?.taste_profile_updated_at ?? null,
    });
  } catch (error) {
    console.error("Error fetching taste profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch taste profile" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/taste-profile
 *
 * Saves or updates the logged-in user's taste profile.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const profile = parseTasteProfileBody(body);
    if (!profile) {
      return NextResponse.json(
        { error: "Invalid taste profile payload" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error } = await sb
      .from("profiles")
      .update({
        taste_profile: profile,
        taste_profile_updated_at: now,
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Error saving taste profile:", error);
    return NextResponse.json(
      { error: "Failed to save taste profile" },
      { status: 500 },
    );
  }
}
