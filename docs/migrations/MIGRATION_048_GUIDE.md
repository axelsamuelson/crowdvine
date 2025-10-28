# Migration 048: Add Onboarding Seen Flag

## Overview

This migration adds a database column to track whether users have seen the onboarding modal, replacing the browser localStorage approach with a user-specific database flag.

## Problem Solved

- **Before:** `localStorage` was browser-based, not user-based
  - Clearing cookies showed modal again
  - Different browsers = different state
  - No way to track per user across devices
- **After:** Database flag per user
  - Tied to user account, not browser
  - Works across all devices
  - Survives cookie clearing
  - Only shows once per user account

## Changes

### 1. Database Schema

```sql
-- Add onboarding_seen column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_seen BOOLEAN DEFAULT FALSE;

-- Set existing users to true (they don't need to see it again)
UPDATE profiles
SET onboarding_seen = TRUE
WHERE created_at < NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_seen ON profiles(onboarding_seen);
```

### 2. New API Endpoint

`/api/user/onboarding-seen`

**GET:** Check if user has seen onboarding

```json
{ "onboardingSeen": false }
```

**POST:** Mark onboarding as seen

```json
{ "success": true }
```

### 3. Updated Onboarding Provider

- Replaced `localStorage.getItem("pact-welcome-seen")` with API call
- Replaced `localStorage.setItem(...)` with POST request
- Now checks database instead of browser storage

## Migration Steps

### Step 1: Run SQL Migration in Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `migrations/048_add_onboarding_seen.sql`
3. Click "Run"
4. Verify:
   - Column `onboarding_seen` exists in `profiles` table
   - Existing users have `onboarding_seen = TRUE`
   - Index `idx_profiles_onboarding_seen` exists

### Step 2: Verify API Endpoint

```bash
# Test GET (should return current user's status)
curl -X GET https://pactwines.com/api/user/onboarding-seen \
  -H "Cookie: your-session-cookie"

# Test POST (should mark as seen)
curl -X POST https://pactwines.com/api/user/onboarding-seen \
  -H "Cookie: your-session-cookie"
```

### Step 3: Deploy Code

```bash
git add -A
git commit -m "Add database-backed onboarding tracking"
git push origin main
```

### Step 4: Test Flow

1. Create a new test user via invitation
2. Complete signup
3. Get redirected to app
4. **Onboarding modal should appear**
5. Click through or skip
6. Verify in Supabase: `onboarding_seen = TRUE` for that user
7. Log out and log back in
8. **Modal should NOT appear** (already seen)
9. Clear browser cookies
10. Log in again
11. **Modal should still NOT appear** (database remembers)

## Benefits

### User Experience

✅ Modal shows exactly once per user account
✅ Works across all devices (phone, desktop, etc.)
✅ Survives cookie clearing
✅ More reliable tracking

### Technical

✅ User-specific, not browser-specific
✅ Survives localStorage clearing
✅ Can query which users have completed onboarding
✅ Can reset onboarding for specific users if needed

### Admin Control

✅ Can manually reset: `UPDATE profiles SET onboarding_seen = FALSE WHERE id = 'user-id'`
✅ Can see completion stats: `SELECT COUNT(*) FROM profiles WHERE onboarding_seen = TRUE`
✅ Can filter users who haven't seen it: `SELECT * FROM profiles WHERE onboarding_seen = FALSE`

## Rollback (if needed)

```sql
-- Remove column
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_seen;

-- Remove index
DROP INDEX IF EXISTS idx_profiles_onboarding_seen;
```

Then revert code changes to use localStorage again.

## Notes

- Existing users are marked as `onboarding_seen = TRUE` to avoid showing modal to everyone
- New users default to `FALSE` and will see modal on first login
- The modal still respects auth page exclusions (signup, login, etc.)
