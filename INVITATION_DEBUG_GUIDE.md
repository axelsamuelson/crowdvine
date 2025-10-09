# Invitation System Debug Guide

## Deployed Changes

### Phase 1: Enhanced Error Logging ✅
All invitation endpoints now log detailed error information with prefixes:
- `[INVITE-GEN]` - Invitation generation
- `[INVITE-DELETE]` - Invitation deletion

### Phase 2: Diagnostic Endpoint ✅
New endpoint: `GET /api/debug/env-check` (admin-only)

### Phase 3: RLS Policy Migration ✅
New migration: `migrations/037_fix_invitation_rls.sql`

---

## Immediate Steps to Debug

### Step 1: Check Environment Variables (Most Likely Cause)

Visit: **https://pactwines.com/api/debug/env-check**

This will show you:
```json
{
  "checks": {
    "supabaseServiceKey": {
      "exists": true/false,  // ⚠️ If false, this is the problem!
      "format": "JWT-like" or "invalid",
      "length": 0
    },
    "adminClient": {
      "creation": "success" or "failed",
      "canQuery": true/false
    },
    "invitationCodesInsert": {
      "success": true/false,
      "error": { ... }  // Details if it fails
    }
  }
}
```

**If `supabaseServiceKey.exists: false`:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add: `SUPABASE_SERVICE_ROLE_KEY`
3. Value: Get from Supabase Dashboard → Settings → API → `service_role` key
4. Redeploy

### Step 2: Check Vercel Logs

Visit: Vercel Dashboard → Deployments → Latest → Runtime Logs

**Look for:**
```
[INVITE-GEN] Admin client created successfully
[INVITE-GEN] Membership found: { level: 'admin', quota: 50, used: 0 }
[INVITE-GEN] Creating invitation: { code: '...', ... }
[INVITE-GEN] Invitation created successfully: <uuid>
```

**Or look for errors:**
```
[INVITE-GEN] Failed to create admin client: Missing Supabase admin credentials
[INVITE-GEN] Membership error: { code: 'PGRST116', message: '...' }
[INVITE-GEN] Error creating invitation: { code: '42501', message: 'permission denied' }
```

### Step 3: Try Creating an Invitation

1. Go to https://pactwines.com/profile
2. Click "Generate Basic Invite" (or "Generate [Level] Invite" if admin)
3. Check browser console (F12) for:
   ```
   [PROFILE] Invitation generation failed: { status: 500, error: {...} }
   ```
4. Note the error message shown in the toast notification

### Step 4: Check the Error Message

The toast will now show detailed errors:

- **"Server configuration error - admin client failed"**
  → SUPABASE_SERVICE_ROLE_KEY is missing in Vercel

- **"Membership not found: The result contains 0 rows"**
  → Your user doesn't have a membership record (run migration 036)

- **"Failed to create invitation: permission denied for table invitation_codes"**
  → RLS policies are blocking (run migration 037)

- **"Failed to create invitation: duplicate key value"**
  → Code collision (very rare, just retry)

---

## Solutions by Error Type

### Error: "Server configuration error"
**Cause:** `SUPABASE_SERVICE_ROLE_KEY` not set in Vercel

**Fix:**
1. Vercel Dashboard → Settings → Environment Variables
2. Add `SUPABASE_SERVICE_ROLE_KEY` = `<your-service-role-key>`
3. Redeploy

### Error: "Membership not found"
**Cause:** No record in `user_memberships` for your user

**Fix:**
Run in Supabase SQL Editor:
```sql
-- Check if membership exists
SELECT * FROM user_memberships WHERE user_id = '<your-user-id>';

-- If missing, run migration 036
-- (located in migrations/036_create_memberships_simple.sql)
```

### Error: "permission denied" or RLS error
**Cause:** RLS policies blocking operations

**Fix:**
Run migration 037 in Supabase SQL Editor:
```sql
-- Copy and paste contents of migrations/037_fix_invitation_rls.sql
BEGIN;
-- ... (full migration content)
COMMIT;
```

Verify policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'invitation_codes';
```

### Error: Still not working after above fixes
**Cause:** Unknown - need more investigation

**Action:**
1. Send me the output from `/api/debug/env-check`
2. Send me the Vercel logs showing `[INVITE-GEN]` entries
3. Send me the browser console error with full details

---

## Verification Steps

After applying fixes:

1. **Test Generation:**
   - Go to /profile
   - Click "Generate Basic Invite"
   - Should see: ✅ "Invitation code generated!"
   - Should see new invitation card appear

2. **Test Deletion:**
   - Click "Delete" on an invitation
   - Click "Confirm"
   - Should see: ✅ "Invitation deleted"
   - Card should disappear
   - Quota count should increase by 1

3. **Check Logs:**
   ```
   [INVITE-GEN] Invitation created successfully: <uuid>
   [INVITE-DELETE] Delete operation completed
   ```

---

## Quick Reference

### Diagnostic Endpoint
```bash
curl -X GET https://pactwines.com/api/debug/env-check \
  -H "Cookie: <your-session-cookie>"
```

### Check Vercel Env Vars
```bash
vercel env ls
```

### Run Migration in Supabase
1. Supabase Dashboard → SQL Editor
2. New Query
3. Paste migration content
4. Run

### View Logs in Vercel
```bash
vercel logs <deployment-url>
```

---

## Common Patterns in Logs

### Success Pattern
```
[INVITE-GEN] Admin client created successfully
[INVITE-GEN] Fetching membership for user: <uuid>
[INVITE-GEN] Membership found: { level: 'admin', quota: 50, used: 0 }
[INVITE-GEN] Creating invitation: { code: 'ABC123...', ... }
[INVITE-GEN] Invitation created successfully: <uuid>
[INVITE-GEN] Incrementing quota usage
[INVITE-GEN] Quota updated successfully
```

### Failure Pattern
```
[INVITE-GEN] Admin client created successfully
[INVITE-GEN] Fetching membership for user: <uuid>
[INVITE-GEN] Membership found: { level: 'admin', quota: 50, used: 0 }
[INVITE-GEN] Creating invitation: { code: 'ABC123...', ... }
[INVITE-GEN] Error creating invitation: {
  error: { code: '42501', message: 'permission denied for table invitation_codes' }
}
```
→ This indicates RLS is blocking the INSERT

---

## Phase 4: Fallback Mechanism (If Needed)

If all else fails, Phase 4 adds a fallback where the API will:
1. Try admin client first
2. If admin client fails, use user's own authenticated client
3. User's auth should allow them to create their own invitations

This is **not yet implemented** - we'll add it if needed after seeing the diagnostic results.

---

## Contact

If you need help:
1. Send output from `/api/debug/env-check`
2. Send Vercel logs (search for `[INVITE-GEN]` or `[INVITE-DELETE]`)
3. Send browser console logs from /profile page

