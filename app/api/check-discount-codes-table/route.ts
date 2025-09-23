import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // First, let's check if the table exists
    const { data: tableCheck, error: checkError } = await supabase
      .from("discount_codes")
      .select("id")
      .limit(1);

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: "Discount codes table already exists",
      });
    }

    // If table doesn't exist, we need to create it via SQL
    // Since we can't create tables via Supabase client, we'll return instructions
    return NextResponse.json({
      success: false,
      message:
        "Discount codes table does not exist. Please run the SQL migration in Supabase Dashboard.",
      sql: `
        CREATE TABLE IF NOT EXISTS discount_codes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          discount_percentage INTEGER NOT NULL,
          is_active BOOLEAN DEFAULT true,
          usage_limit INTEGER DEFAULT 1,
          current_usage INTEGER DEFAULT 0,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          earned_by_user_id UUID REFERENCES auth.users(id),
          earned_for_invitation_id UUID REFERENCES invitation_codes(id),
          used_by_user_id UUID REFERENCES auth.users(id),
          used_at TIMESTAMP WITH TIME ZONE
        );

        ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view their own discount codes" ON discount_codes
          FOR SELECT USING (auth.uid() = earned_by_user_id);
      `,
    });
  } catch (error) {
    console.error("Check discount codes table error:", error);
    return NextResponse.json(
      {
        error: "Failed to check discount codes table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
