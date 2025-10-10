# 🚨 CRITICAL: Run Migration 038 Before Testing

## The Problem We Solved

Your database triggers `on_auth_user_created` and `on_user_membership_created` are **broken**.

They cause `admin.createUser()` to fail with:
```
Database error creating new user
Code: unexpected_failure
```

This prevents ALL invitation signups from working.

## The Solution

**Drop the broken triggers** and handle user creation manually in the API.

---

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor

1. Go to: **https://supabase.com/dashboard/project/YOUR_PROJECT**
2. Click: **SQL Editor** in left sidebar
3. Click: **New Query**

### 2. Copy Migration 038

Open this file in your codebase:
```
migrations/038_drop_signup_triggers.sql
```

Copy the ENTIRE contents.

### 3. Paste and Execute

1. Paste into Supabase SQL Editor
2. Click: **Run** (or press Cmd/Ctrl + Enter)

### 4. Verify Success

You should see:
```
NOTICE: All signup triggers successfully dropped
```

If you see an error, send me the error message.

### 5. Verify Triggers Are Gone

Run this query to confirm:
```sql
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname IN ('on_auth_user_created', 'on_user_membership_created');
```

Should return: **0 rows** (or empty result)

---

## After Migration is Complete

### Test Invitation Signup (Should Work Now!)

1. **Generate invitation:**
   - Go to: https://pactwines.com/profile
   - Select level (e.g., "Silver")
   - Click "Generate Silver Invite"
   - Copy the link

2. **Open in incognito/private mode:**
   - Paste the invitation URL
   - You should see:
     - ✅ No header
     - ✅ PACT logo at top
     - ✅ Silver circle badge with icon
     - ✅ "Silver Membership" pill
     - ✅ Perks: "12/month • Fee Capped • Early Drops"
     - ✅ Pallet info with bottle count

3. **Create account:**
   - Full Name: "Test User"
   - Email: **test@example.com** (use a NEW email!)
   - Password: at least 6 characters
   - Click "Join the platform"

4. **Expected result:**
   - ✅ "Account created and signed in successfully!"
   - ✅ Auto redirect to homepage
   - ✅ You are logged in

5. **Verify membership:**
   - Go to: https://pactwines.com/profile
   - You should see:
     - ✅ Silver membership badge
     - ✅ "12 invites available" (or whatever quota for Silver)
     - ✅ All profile data

6. **Verify inviter got IP:**
   - Log in as admin (the account that created the invite)
   - Go to: https://pactwines.com/profile
   - You should see:
     - ✅ Impact Points increased by +1
     - ✅ Event in IP Timeline: "Friend signed up using invite code"

---

## What Changed

### Before Migration 038:
```
admin.createUser()
  └─→ Trigger fires → ERROR → "Database error creating new user"
  └─→ FAILS before our code even runs
```

### After Migration 038:
```
admin.createUser()
  └─→ No triggers → Creates user successfully ✓
  └─→ Our code manually creates profile ✓
  └─→ Our code manually creates membership with correct level ✓
  └─→ Everything works!
```

## Logs You Should See (After Migration)

When testing signup, check Vercel logs for:
```
[INVITE-REDEEM] MANUAL CREATION FLOW - Step 1: Create auth.users
[INVITE-REDEEM] STEP-1 SUCCESS - User created: <uuid>
[INVITE-REDEEM] MANUAL CREATION FLOW - Step 2: Create profile
[INVITE-REDEEM] STEP-2 SUCCESS - Profile created
[INVITE-REDEEM] MANUAL CREATION FLOW - Step 3: Create membership with level: silver
[INVITE-REDEEM] STEP-3 SUCCESS - Membership created
[INVITE-REDEEM] All manual creation steps completed successfully
[INVITE-REDEEM] Awarding IP to inviter: <uuid>
[INVITE-REDEEM] Marking invitation as used
[INVITE-REDEEM] Session available from signUp
```

## If It Still Doesn't Work

Send me:
1. The Vercel logs showing `[INVITE-REDEEM]` entries
2. Specifically which STEP failed (STEP-1, STEP-2, or STEP-3)
3. The error code and message from that step

---

## Summary

✅ **Code is deployed** (automatic via GitHub push)  
⚠️ **Migration 038 MUST be run manually** (one-time, takes 1 second)  
🎯 **After migration, invitation signup will work**

**RUN MIGRATION 038 NOW!** Then test and let me know the result!

