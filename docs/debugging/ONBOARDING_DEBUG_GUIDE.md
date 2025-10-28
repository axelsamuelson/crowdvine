# Onboarding & Cart Issues - Debug Guide

## Current Problems

### 1. Onboarding Modal Not Showing

- Modal doesn't appear after new user signup
- Tested on: Instagram browser, Chrome, Safari, Incognito
- Tested with: Basic, Bronze, Silver memberships
- Result: Never shows

### 2. Cart Sharing Between Users

- New user sees 6 products in cart
- Cart appears to be shared between users
- Cart is linked to `session_id` (cookies) not `user_id`

## Debug Steps

### Step 1: Check if Migration 048 is Run

```sql
-- In Supabase SQL Editor
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'onboarding_seen';

-- Should return:
-- column_name      | data_type | column_default
-- onboarding_seen  | boolean   | false
```

If empty, **RUN MIGRATION 048**:

```sql
-- Copy and paste from migrations/048_add_onboarding_seen.sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_seen BOOLEAN DEFAULT FALSE;

UPDATE profiles
SET onboarding_seen = TRUE
WHERE created_at < NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_seen ON profiles(onboarding_seen);
```

### Step 2: Check New User's onboarding_seen Value

```sql
-- Get the newest user
SELECT id, email, onboarding_seen, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- If a new test user has onboarding_seen = TRUE, that's the problem!
-- It should be FALSE for new users
```

**Fix if needed:**

```sql
-- Reset for specific test user
UPDATE profiles
SET onboarding_seen = FALSE
WHERE email = 'your-test-email@example.com';
```

### Step 3: Check Browser Console Logs

After deploying the latest code with debug logging:

1. Open browser console (F12 or Cmd+Opt+I)
2. Sign up with new test account
3. Get redirected to app
4. Look for logs starting with 🎓

**Expected log sequence:**

```
🎓 [Onboarding] Checking onboarding status...
🎓 [API] GET /api/user/onboarding-seen called
🎓 [API] User authenticated: <user-id>
🎓 [API] Profile onboarding_seen: false
🎓 [Onboarding] Response status: 200
🎓 [Onboarding] Data: { onboardingSeen: false }
🎓 [Onboarding] User has NOT seen onboarding, showing modal in 800ms
🎓 [Onboarding] Opening modal now
```

**If you see different logs:**

#### Problem: `onboardingSeen: true`

```
🎓 [Onboarding] Data: { onboardingSeen: true }
🎓 [Onboarding] User has already seen onboarding, skipping modal
```

**Solution:** User's `onboarding_seen` is TRUE in database. Reset it:

```sql
UPDATE profiles SET onboarding_seen = FALSE WHERE id = '<user-id>';
```

#### Problem: 401 Unauthorized

```
🎓 [Onboarding] Response status: 401
```

**Solution:** User not authenticated. Check:

- Is user actually logged in?
- Are auth cookies present?
- Try logout and login again

#### Problem: 500 Error

```
🎓 [API] Error fetching onboarding status: <error>
```

**Solution:** Database query failed. Check:

- Does `onboarding_seen` column exist?
- Does user exist in `profiles` table?

#### Problem: No logs at all

**Solution:**

- Code not deployed (check Vercel)
- JavaScript error preventing execution (check console for errors)
- User on auth page (modal skipped intentionally)

### Step 4: Cart Sharing Issue

The cart is currently tied to `session_id` from cookies, not `user_id`. This means:

- If cookies are shared or reused, cart is shared
- Different users can see same cart
- Cart persists across user logins

**Check in database:**

```sql
-- See all carts and their items
SELECT
  c.id as cart_id,
  c.session_id,
  c.created_at as cart_created,
  ci.id as item_id,
  ci.quantity,
  w.wine_name
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN wines w ON ci.wine_id = w.id
ORDER BY c.created_at DESC
LIMIT 20;
```

**To fix cart isolation:**

Option 1: Link cart to user_id instead of session_id

```sql
-- Add user_id to carts table
ALTER TABLE carts ADD COLUMN user_id UUID REFERENCES profiles(id);

-- Update existing carts (optional)
-- UPDATE carts SET user_id = ... WHERE session_id = ...;
```

Option 2: Clear cart on new user signup

```typescript
// In signup flow, after user created:
await clearCartId(); // Clear cookie
// Create new cart for new user
```

Option 3: Use user_id + session_id composite key

```sql
-- More complex but supports logged-out + logged-in carts
```

### Step 5: Test Flow Checklist

- [ ] Migration 048 run in Supabase
- [ ] Column `onboarding_seen` exists in `profiles`
- [ ] New users have `onboarding_seen = FALSE` by default
- [ ] Latest code deployed to Vercel
- [ ] Open browser console (F12)
- [ ] Create new test user via invitation
- [ ] Check console for 🎓 logs
- [ ] Modal appears after 800ms
- [ ] Cart is empty (not 6 items)
- [ ] Click through modal
- [ ] Check DB: `onboarding_seen = TRUE` for that user
- [ ] Logout and login again
- [ ] Modal does NOT appear (already seen)

## Quick Fixes

### Force Show Modal for Testing

```typescript
// In browser console:
localStorage.removeItem("pact-welcome-seen"); // Old system
// Then manually call:
fetch("/api/user/onboarding-seen", {
  method: "POST",
  body: JSON.stringify({ seen: false }),
});
```

### Reset Onboarding for User

```sql
UPDATE profiles
SET onboarding_seen = FALSE
WHERE email = 'test@example.com';
```

### Clear Cart for User

```sql
-- Find user's cart
SELECT c.id FROM carts c
JOIN profiles p ON c.session_id = p.id -- or however it's linked
WHERE p.email = 'test@example.com';

-- Clear cart items
DELETE FROM cart_items WHERE cart_id = '<cart-id>';
```

## Next Steps if Still Not Working

1. **Share Console Logs:** Copy all 🎓 logs from console
2. **Share Database State:** Run and share results:
   ```sql
   SELECT id, email, onboarding_seen, created_at
   FROM profiles
   WHERE email = 'your-test-email';
   ```
3. **Check Network Tab:**
   - F12 → Network
   - Filter by "onboarding-seen"
   - Check request/response
4. **Vercel Logs:**
   - Check function logs in Vercel dashboard
   - Look for 🎓 [API] logs

## Common Causes

1. ❌ Migration not run → Column doesn't exist → 500 error
2. ❌ Default value wrong → New users get TRUE → Modal skipped
3. ❌ Auth not working → 401 error → No user check
4. ❌ Code not deployed → Old code running → localStorage check
5. ❌ Cart from previous session → session_id reused → Shared cart
