import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // Create discount_codes table
    const { error: tableError } = await supabase.rpc('exec_sql', {
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
      `
    });

    if (tableError) {
      console.error('Table creation error:', tableError);
    }

    // Enable RLS
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;'
    });

    // Create RLS policy
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can view their own discount codes" ON discount_codes
          FOR SELECT USING (auth.uid() = earned_by_user_id);
      `
    });

    // Create function to generate discount code
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION generate_discount_code()
        RETURNS VARCHAR(50) AS $$
        DECLARE
          new_code VARCHAR(50);
          code_exists BOOLEAN;
        BEGIN
          LOOP
            new_code := upper(substring(md5(random()::text) from 1 for 8));
            SELECT EXISTS(SELECT 1 FROM discount_codes WHERE code = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
          END LOOP;
          RETURN new_code;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    // Create function to create invitation reward discount
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION create_invitation_reward_discount(
          p_user_id UUID,
          p_invitation_id UUID,
          p_discount_percentage INTEGER DEFAULT 5,
          p_reward_tier TEXT DEFAULT 'account_created'
        )
        RETURNS UUID AS $$
        DECLARE
          new_discount_id UUID;
          discount_code VARCHAR(50);
          final_discount_percentage INTEGER;
        BEGIN
          CASE p_reward_tier
            WHEN 'account_created' THEN
              final_discount_percentage := 5;
            WHEN 'reservation_made' THEN
              final_discount_percentage := 10;
            ELSE
              final_discount_percentage := p_discount_percentage;
          END CASE;
          
          discount_code := generate_discount_code();
          
          INSERT INTO discount_codes (
            code,
            discount_percentage,
            is_active,
            usage_limit,
            expires_at,
            earned_by_user_id,
            earned_for_invitation_id
          ) VALUES (
            discount_code,
            final_discount_percentage,
            true,
            1,
            NOW() + INTERVAL '30 days',
            p_user_id,
            p_invitation_id
          ) RETURNING id INTO new_discount_id;
          
          RETURN new_discount_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    return NextResponse.json({ 
      success: true, 
      message: "Discount codes table and functions created successfully" 
    });

  } catch (error) {
    console.error('Setup discount codes error:', error);
    return NextResponse.json({ 
      error: "Failed to setup discount codes",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
