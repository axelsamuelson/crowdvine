import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.development
dotenv.config({ path: ".env.development" });

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function runMigration() {
  console.log("🚀 Running analytics migration...");

  try {
    // Create user_events table
    console.log("Creating user_events table...");
    const { error: tableError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_events (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          session_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_category TEXT NOT NULL,
          event_metadata JSONB DEFAULT '{}',
          page_url TEXT,
          referrer TEXT,
          user_agent TEXT,
          ip_address TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (tableError) {
      console.error("❌ Table creation error:", tableError);
      return;
    }

    // Create indexes
    console.log("Creating indexes...");
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);",
      "CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON user_events(session_id);",
      "CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type);",
      "CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at DESC);",
      "CREATE INDEX IF NOT EXISTS idx_user_events_category ON user_events(event_category);"
    ];

    for (const indexSQL of indexes) {
      const { error } = await supabase.rpc('exec', { sql: indexSQL });
      if (error) {
        console.error("❌ Index creation error:", error);
        return;
      }
    }

    // Create view
    console.log("Creating user_journey_funnel view...");
    const { error: viewError } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE VIEW user_journey_funnel AS
        SELECT 
          user_id,
          MIN(CASE WHEN event_type = 'access_request_submitted' THEN created_at END) as access_requested_at,
          MIN(CASE WHEN event_type = 'access_approved' THEN created_at END) as access_approved_at,
          MIN(CASE WHEN event_type = 'user_first_login' THEN created_at END) as first_login_at,
          MIN(CASE WHEN event_type = 'product_viewed' THEN created_at END) as first_product_view_at,
          MIN(CASE WHEN event_type = 'add_to_cart' THEN created_at END) as first_add_to_cart_at,
          MIN(CASE WHEN event_type = 'cart_validation_passed' THEN created_at END) as cart_validation_passed_at,
          MIN(CASE WHEN event_type = 'checkout_started' THEN created_at END) as checkout_started_at,
          MIN(CASE WHEN event_type = 'reservation_completed' THEN created_at END) as reservation_completed_at
        FROM user_events
        WHERE user_id IS NOT NULL
        GROUP BY user_id;
      `
    });

    if (viewError) {
      console.error("❌ View creation error:", viewError);
      return;
    }

    // Enable RLS
    console.log("Enabling RLS...");
    const { error: rlsError } = await supabase.rpc('exec', {
      sql: "ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;"
    });

    if (rlsError) {
      console.error("❌ RLS error:", rlsError);
      return;
    }

    // Create policies
    console.log("Creating RLS policies...");
    const policies = [
      `CREATE POLICY IF NOT EXISTS "Admins can view all events" ON user_events
       FOR SELECT USING (
         EXISTS (
           SELECT 1 FROM profiles 
           WHERE profiles.id = auth.uid() 
           AND profiles.role = 'admin'
         )
       );`,
      `CREATE POLICY IF NOT EXISTS "Users can insert their own events" ON user_events
       FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);`
    ];

    for (const policySQL of policies) {
      const { error } = await supabase.rpc('exec', { sql: policySQL });
      if (error) {
        console.error("❌ Policy creation error:", error);
        return;
      }
    }

    // Create function
    console.log("Creating cohort analysis function...");
    const { error: functionError } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION get_cohort_analysis()
        RETURNS TABLE (
          week TEXT,
          cohort_size BIGINT,
          active_users BIGINT,
          converted_users BIGINT
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-WW') as week,
            COUNT(DISTINCT user_id) as cohort_size,
            COUNT(DISTINCT CASE WHEN event_type = 'user_login' THEN user_id END) as active_users,
            COUNT(DISTINCT CASE WHEN event_type = 'reservation_completed' THEN user_id END) as converted_users
          FROM user_events
          WHERE created_at >= NOW() - INTERVAL '12 weeks'
          GROUP BY week
          ORDER BY week;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (functionError) {
      console.error("❌ Function creation error:", functionError);
      return;
    }

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

export { runMigration };