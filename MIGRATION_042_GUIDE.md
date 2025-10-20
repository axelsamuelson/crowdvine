# Migration 042: Progression Buffs & Rewards System

## Overview

This migration adds support for the PACT Membership Ladder v2 progression rewards system, including:

- Temporary progression buffs (percentage discounts)
- Configurable rewards per level segment
- Helper functions for buff management

## What's Included

### New Tables

1. **`user_progression_buffs`**
   - Stores temporary percentage bonuses earned during level progression
   - Buffs accumulate until used (on next order) or cleared (on level-up)
   - Tracks which level segment the buff was earned in

2. **`progression_rewards`**
   - Configurable rewards per level segment (basic-bronze, bronze-silver, silver-gold)
   - Defines IP thresholds and reward types
   - Can be enabled/disabled and reordered

### Helper Functions

- `get_active_progression_buffs(user_id)` - Get all unused buffs for a user
- `calculate_total_buff_percentage(user_id)` - Sum of all active buff percentages
- `apply_progression_buffs(user_id, order_id)` - Mark buffs as used
- `clear_progression_buffs_on_level_up(user_id)` - Clear all buffs on level upgrade
- `get_progression_rewards_for_segment(level_segment)` - Get rewards config for a segment

### Baseline Rewards

The migration inserts default progression rewards:

**Basic → Bronze (0-4 IP):**

- At 2 IP: +0.5% buff
- At 4 IP: +0.5% buff + "PACT Initiate" badge

**Bronze → Silver (5-14 IP):**

- At 10 IP: Early Drop Access Token
- At 14 IP: Free service fee (one-time)

**Silver → Gold (15-34 IP):**

- At 20, 25, 30 IP: +1% buff each
- At 30 IP: "Silver Collector Pack" badge
- At 35 IP: Gold unlock celebration

## How to Run This Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `crowdvine_01` (or your project name)

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste Migration**
   - Open `migrations/042_progression_buffs.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run Migration**
   - Click "Run" button (or press Cmd/Ctrl + Enter)
   - Wait for completion message

5. **Verify Success**
   - You should see: `✅ Migration 042 completed successfully`
   - Check the "Table Editor" to verify new tables exist

### Option 2: Via Supabase CLI

```bash
# Make sure you're in the project directory
cd /Users/axelsamuelson/Downloads/crowdvine_01

# Run the migration
supabase db push migrations/042_progression_buffs.sql
```

### Option 3: Via psql (Direct Database)

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" -f migrations/042_progression_buffs.sql
```

## Verification Steps

After running the migration, verify everything is working:

### 1. Check Tables Exist

```sql
-- Should return 2 tables
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('user_progression_buffs', 'progression_rewards');
```

### 2. Check Baseline Rewards

```sql
-- Should return 10 rewards
SELECT level_segment, ip_threshold, reward_type, reward_description
FROM progression_rewards
ORDER BY level_segment, sort_order;
```

Expected output:

```
basic-bronze    | 2  | buff_percentage      | Progress bonus: +0.5% on next reservation
basic-bronze    | 4  | buff_percentage      | Progress bonus: +0.5% on next reservation
basic-bronze    | 4  | badge                | Unlock: PACT Initiate badge
bronze-silver   | 10 | early_access_token   | Early Drop Access Token (one-time)
bronze-silver   | 14 | fee_waiver           | Free service fee (one-time)
silver-gold     | 20 | buff_percentage      | Progress bonus: +1% on next reservation
silver-gold     | 25 | buff_percentage      | Progress bonus: +1% on next reservation
silver-gold     | 30 | buff_percentage      | Progress bonus: +1% on next reservation
silver-gold     | 30 | badge                | Unlock: Silver Collector Pack
silver-gold     | 35 | celebration          | Gold level unlocked! 🎉
```

### 3. Test Helper Functions

```sql
-- Test calculate_total_buff_percentage (should return 0 for new users)
SELECT calculate_total_buff_percentage('your-user-id-here');

-- Test get_progression_rewards_for_segment
SELECT * FROM get_progression_rewards_for_segment('basic-bronze');
```

### 4. Check RLS Policies

```sql
-- Should return policies for both tables
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('user_progression_buffs', 'progression_rewards');
```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop tables (cascade to remove dependencies)
DROP TABLE IF EXISTS user_progression_buffs CASCADE;
DROP TABLE IF EXISTS progression_rewards CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_active_progression_buffs(UUID);
DROP FUNCTION IF EXISTS calculate_total_buff_percentage(UUID);
DROP FUNCTION IF EXISTS apply_progression_buffs(UUID, UUID);
DROP FUNCTION IF EXISTS clear_progression_buffs_on_level_up(UUID);
DROP FUNCTION IF EXISTS get_progression_rewards_for_segment(VARCHAR);
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

## Next Steps

After running this migration:

1. ✅ Update TypeScript types to include new tables
2. ✅ Implement progression buff logic in `lib/membership/progression-rewards.ts`
3. ✅ Update UI components to display buffs
4. ✅ Integrate buff application into checkout flow
5. ✅ Update admin panel to manage rewards

## Troubleshooting

### Error: "relation already exists"

The tables already exist. You can either:

- Skip this migration (already run)
- Drop the existing tables and re-run (use rollback SQL above)

### Error: "permission denied"

You need service_role or postgres role to run this migration. Make sure you're using the correct credentials.

### Error: "function already exists"

The migration uses `CREATE OR REPLACE` for functions, so this shouldn't happen. If it does, try dropping functions manually first.

## Questions?

If you encounter issues:

1. Check Supabase logs in Dashboard → Database → Logs
2. Verify your database connection
3. Ensure you have proper permissions (service_role or postgres)

---

**Migration Status:** ✅ Ready to run
**Estimated Time:** ~2-3 seconds
**Rollback:** Safe (reversible)
**Breaking Changes:** None
