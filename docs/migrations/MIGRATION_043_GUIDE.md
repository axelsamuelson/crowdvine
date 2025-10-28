# Migration 043: Integrate Progression with Level-Up

## Overview

This migration updates the `check_and_upgrade_level()` database function to automatically clear progression buffs when a user levels up, and adds new IP event types to the enum.

**⚠️ Important:** This migration must be run **AFTER** Migration 042 (progression buffs tables).

## What's Included

### 1. New IP Event Types

Adds the following event types to `ip_event_type` enum:

- `invite_second_order` - When invited user makes 2nd order
- `own_order_large` - Large orders (≥12 bottles)
- `pallet_milestone_6` - 6 unique pallets milestone
- `pallet_milestone_12` - 12 unique pallets milestone
- `review_submitted` - User submits a review
- `share_action` - User shares wine/pallet

### 2. Enhanced Level-Up Function

Updates `check_and_upgrade_level()` to:

- Store old level before upgrade
- Call `clear_progression_buffs_on_level_up()` when level changes
- Log upgrade with "from X to Y" description
- Add RAISE NOTICE for debugging

## Prerequisites

1. ✅ Migration 042 must be completed
2. ✅ `user_progression_buffs` table must exist
3. ✅ `clear_progression_buffs_on_level_up()` function must exist

## How to Run This Migration

### Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy Migration**
   - Open `migrations/043_integrate_progression_with_levelup.sql`
   - Copy entire contents
   - Paste into SQL Editor

4. **Run Migration**
   - Click "Run" (or Cmd/Ctrl + Enter)
   - Wait for completion

5. **Verify Success**
   - Should see: `✅ Migration 043 completed successfully`

## Verification

### Check Event Types Added

```sql
-- Should return all new event types
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'ip_event_type'
)
ORDER BY enumlabel;
```

Expected to include:

- invite_second_order
- own_order_large
- pallet_milestone_6
- pallet_milestone_12
- review_submitted
- share_action

### Test Level-Up Function

```sql
-- Test that function includes buff clearing
SELECT routine_definition
FROM information_schema.routines
WHERE routine_name = 'check_and_upgrade_level';
```

Should contain: `PERFORM clear_progression_buffs_on_level_up(p_user_id);`

### Manual Test

```sql
-- Create test scenario
-- 1. Give user some progression buffs
INSERT INTO user_progression_buffs (user_id, buff_percentage, buff_description, level_segment)
VALUES ('test-user-id', 0.5, 'Test buff', 'basic-bronze');

-- 2. Upgrade user level
UPDATE user_memberships
SET impact_points = 5
WHERE user_id = 'test-user-id';

-- 3. Trigger level check
SELECT check_and_upgrade_level('test-user-id');

-- 4. Verify buff was cleared
SELECT * FROM user_progression_buffs
WHERE user_id = 'test-user-id';
-- Should show used_at is NOT NULL
```

## Rollback

If needed, rollback by restoring old function:

```sql
-- Restore original check_and_upgrade_level (without buff clearing)
CREATE OR REPLACE FUNCTION check_and_upgrade_level(p_user_id UUID)
RETURNS membership_level AS $$
DECLARE
  current_membership RECORD;
  new_level membership_level;
BEGIN
  SELECT * INTO current_membership
  FROM user_memberships
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN 'requester';
  END IF;

  IF current_membership.level = 'admin' THEN
    RETURN 'admin';
  END IF;

  new_level := get_level_from_points(current_membership.impact_points);

  IF new_level != current_membership.level THEN
    UPDATE user_memberships
    SET
      level = new_level,
      invite_quota_monthly = get_invite_quota_for_level(new_level),
      level_assigned_at = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO impact_point_events (
      user_id,
      event_type,
      points_earned,
      description
    ) VALUES (
      p_user_id,
      'level_upgrade',
      0,
      'Upgraded to ' || new_level::TEXT
    );
  END IF;

  RETURN new_level;
END;
$$ LANGUAGE plpgsql;
```

## Common Issues

### Error: "type already exists"

The enum values already exist. This is fine - the migration uses `ADD VALUE IF NOT EXISTS`.

### Error: "function clear_progression_buffs_on_level_up does not exist"

Migration 042 hasn't been run yet. Run it first.

### Error: "unsafe use of new value"

PostgreSQL requires enum values to be added in a separate transaction from being used. Solution:

1. Run only the ALTER TYPE statements first
2. Wait 1-2 seconds
3. Run the rest of the migration

Or split into two migrations.

## Next Steps

After running this migration:

1. ✅ Test level-up clears buffs
2. ✅ Verify new event types work
3. ✅ Test end-to-end order flow
4. ✅ Monitor Supabase logs for RAISE NOTICE messages

---

**Migration Status:** ✅ Ready to run  
**Dependencies:** Migration 042  
**Estimated Time:** ~1 second  
**Breaking Changes:** None  
**Rollback:** Safe (reversible)
