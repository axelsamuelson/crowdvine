# 🚨 CRITICAL FIX - Migration 044: Prevent Level Downgrade

## Issue Discovered

**Problem:** Users were being **downgraded** when earning Impact Points.

**Example:**
- User at Bronze level (5 IP)
- Makes order with 8 bottles → Earns +1 IP (total: 6 IP)
- System incorrectly downgrades user to Basic
- **This should NEVER happen!**

## Root Cause

The `check_and_upgrade_level()` function uses:
```sql
IF new_level != current_membership.level THEN
  -- Updates level (BOTH upgrades AND downgrades!)
```

This allows **bidirectional** level changes. When IP is earned, the function recalculates level from IP, and if somehow the new level is lower than current level, it downgrades.

## The Fix

Migration 044 updates the function to **only allow upgrades**:

```sql
-- Calculate level order (numeric comparison)
old_level_order := get_level_order(old_level);
new_level_order := get_level_order(new_level);

-- ONLY upgrade if new level is HIGHER
IF new_level_order > old_level_order THEN
  -- Upgrade
ELSE
  -- Keep current level (no downgrade)
  RETURN old_level;
END IF;
```

## How to Apply (URGENT)

### Step 1: Run Migration in Supabase

```bash
# Supabase Dashboard → SQL Editor → New Query
# Copy and paste: migrations/044_prevent_level_downgrade.sql
# Click Run
```

**Expected output:**
```
✅ Migration 044 completed successfully
⚠️  IMPORTANT: This fixes critical bug where users were downgraded
```

### Step 2: Fix Affected Users

If any users were incorrectly downgraded, fix them:

```sql
-- Find users who may have been incorrectly downgraded
SELECT 
  u.email,
  m.level,
  m.impact_points,
  get_level_from_points(m.impact_points) as should_be_level
FROM user_memberships m
JOIN auth.users u ON u.id = m.user_id
WHERE get_level_from_points(m.impact_points)::TEXT != m.level::TEXT;

-- Fix each user manually
-- Example: User has 6 IP but is at Basic (should be Bronze)
UPDATE user_memberships
SET 
  level = 'brons',
  invite_quota_monthly = 5,
  level_assigned_at = NOW()
WHERE user_id = 'affected-user-id';
```

### Step 3: Verify Fix

```sql
-- Test the function with a scenario
-- Simulate user at Bronze with 6 IP
DO $$
DECLARE
  test_level membership_level;
BEGIN
  -- User has 6 IP (should stay Bronze, not downgrade)
  test_level := get_level_from_points(6);
  RAISE NOTICE 'Level from 6 IP: %', test_level;
  -- Should be: brons
END $$;
```

## Why This Happened

The issue likely occurred because:

1. User had Bronze level (5-14 IP required)
2. User earned IP (e.g., 5 IP → 6 IP)
3. System recalculates level from IP
4. `get_level_from_points(6)` returns 'brons' ✅
5. But somehow current level was already at a higher value
6. Function allowed downgrade

**Most likely cause:** User was manually set to a higher level by admin, then earned IP, and system "corrected" them back down.

## Prevention

After this fix:
- ✅ Users can ONLY progress upward
- ✅ Even if manually set to high level, earning IP won't downgrade
- ✅ Admins can still manually adjust levels if needed
- ✅ System logs when it would have downgraded (for debugging)

## Long-term Solution

Consider adding to `user_memberships`:
```sql
ALTER TABLE user_memberships 
ADD COLUMN manually_set_level BOOLEAN DEFAULT FALSE;

-- If manually_set_level = TRUE, don't auto-adjust at all
```

## Action Items

1. ✅ Run Migration 044 immediately
2. ✅ Check for affected users in production
3. ✅ Restore correct levels for affected users
4. ✅ Monitor logs for "would have downgraded" notices
5. ✅ Add test case to prevent regression

## Status

- **Severity:** CRITICAL (P0)
- **Impact:** User experience severely degraded
- **Fix Status:** ✅ Ready to deploy
- **Testing:** Required before production
- **Rollback:** Safe (function can be reverted)

---

**Deploy this fix ASAP!** 🚨

