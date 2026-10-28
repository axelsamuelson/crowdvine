import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const DISCOUNT_CODE_WEBHOOK_SECRET = "DISCOUNT_CODE_WEBHOOK_SECRET";

const discountWebhookSchema = z
  .object({
    record: z
      .object({
        id: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

function bearerMatchesSecret(header: string, secret: string): boolean {
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const token = header.slice(prefix.length);
  const provided = Buffer.from(token);
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env[DISCOUNT_CODE_WEBHOOK_SECRET];
    if (!secret) {
      console.error(
        "[discount-code-created] DISCOUNT_CODE_WEBHOOK_SECRET is not set",
      );
      return NextResponse.json(
        { error: "Webhook secret is not configured" },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization") ?? "";
    if (!bearerMatchesSecret(authHeader, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = discountWebhookSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const payload = parsed.data;

    console.log("Discount code webhook received:", payload.record.id);

    const supabase = getSupabaseAdmin();

    // Get the discount code details
    const { data: discountCode, error } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("id", payload.record.id)
      .single();

    if (error || !discountCode) {
      console.error("Error fetching discount code:", error);
      return NextResponse.json(
        { error: "Discount code not found" },
        { status: 404 },
      );
    }

    // Get the user's profile
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", discountCode.earned_by_user_id)
      .single();

    if (userError || !user) {
      console.error("Error fetching user:", userError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(
      "New discount code created for user:",
      user.id,
      "Percentage:",
      discountCode.discount_percentage,
    );

    // Here you could send an email notification, push notification, etc.
    // For now, we'll just log it

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
