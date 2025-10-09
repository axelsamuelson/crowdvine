# Membership System - Post-Deployment Checklist

## ✅ Completed

- [x] Migration 034 körd i Supabase
- [x] Migration 035 körd i Supabase
- [x] Frontend deployed to production
- [x] Profile page responds (200 OK)

---

## 🎯 Next Steps (In Order)

### 1. Set Your Admin User

Run this in Supabase SQL Editor (replace YOUR_EMAIL):

```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';

-- Set to admin level
UPDATE user_memberships 
SET 
  level = 'admin',
  invite_quota_monthly = 999999,
  level_assigned_at = NOW(),
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com');

-- Verify
SELECT 
  u.email,
  m.level,
  m.impact_points,
  m.invite_quota_monthly
FROM user_memberships m
JOIN auth.users u ON u.id = m.user_id
WHERE u.email = 'YOUR_EMAIL@example.com';
```

### 2. Test Profile Page

Visit: `https://pactwines.com/profile`

**Check:**
- [ ] Level badge displays (should show your level)
- [ ] Impact Points shown
- [ ] If not admin: Progress bar to next level
- [ ] Perks grid shows active perks
- [ ] Invite quota displays (X / Y remaining)
- [ ] Personal info section works
- [ ] Payment methods section works
- [ ] My Reservations stats display

**If errors:**
- Check browser console
- Check network tab for failed API calls
- Let me know the error message

### 3. Test Invite Generation

On profile page:

- [ ] Click "Generate Invite Link"
- [ ] Should show invite code (12 characters)
- [ ] Should show shareable URL
- [ ] Available invites should decrease
- [ ] Try copying code

**If errors:**
- Check if quota is 0 (button should be disabled)
- Check browser console
- Verify invitation was created in database

### 4. Verify User Migration

Run in Supabase:

```sql
-- Count users by level
SELECT level, COUNT(*) as user_count
FROM user_memberships
GROUP BY level
ORDER BY CASE level
  WHEN 'requester' THEN 0
  WHEN 'basic' THEN 1
  WHEN 'brons' THEN 2
  WHEN 'silver' THEN 3
  WHEN 'guld' THEN 4
  WHEN 'admin' THEN 5
END;

-- Check all users have membership
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT m.user_id) as users_with_membership,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT m.user_id) as missing
FROM auth.users u
LEFT JOIN user_memberships m ON m.user_id = u.id;
```

**Expected:**
- All users should have membership
- Missing should be 0
- Most users at Basic level (0-4 IP)

### 5. Test Access Gating (Optional)

Create a test user or temporarily set your user to 'requester':

```sql
-- Temporarily set to requester
UPDATE user_memberships SET level = 'requester' WHERE user_id = 'YOUR_ID';

-- Then visit /shop - should redirect to /access-pending

-- Restore to admin after test
UPDATE user_memberships SET level = 'admin' WHERE user_id = 'YOUR_ID';
```

### 6. Test Admin Invite Creation (Optional)

Use admin API to create invite with custom level:

```bash
curl -X POST https://pactwines.com/api/admin/invitations/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{
    "initialLevel": "silver",
    "expiresInDays": 30
  }'
```

**Expected:**
- Returns invitation with `initialLevel: "silver"`
- When redeemed, user starts at Silver (not Basic)

### 7. Monitor for 24 Hours

- [ ] Check Vercel logs for errors
- [ ] Check Supabase logs for database errors
- [ ] Monitor user signups
- [ ] Check if IP accrues correctly on invites

---

## 🐛 Common Issues & Fixes

### Profile Page Shows "Unable to load profile data"

**Cause:** API endpoints failing

**Fix:**
```sql
-- Check if user has membership
SELECT * FROM user_memberships WHERE user_id = 'YOUR_USER_ID';

-- If missing, create one:
INSERT INTO user_memberships (user_id, level, impact_points, invite_quota_monthly)
VALUES ('YOUR_USER_ID', 'basic', 0, 2);
```

### Can't Generate Invite

**Cause:** Quota = 0

**Fix:**
```sql
-- Reset quota for testing
UPDATE user_memberships 
SET 
  invites_used_this_month = 0,
  last_quota_reset = NOW()
WHERE user_id = 'YOUR_USER_ID';
```

### Level Badge Not Showing

**Cause:** Frontend build issue or missing data

**Fix:**
1. Check browser console for errors
2. Hard refresh (Cmd+Shift+R)
3. Clear Vercel cache if needed

### Middleware Redirects Everyone

**Cause:** All users at 'requester' level

**Fix:**
```sql
-- Upgrade all users to basic minimum
UPDATE user_memberships SET level = 'basic' WHERE level = 'requester';
```

---

## 📊 Verification Queries

### Show All Users with Membership
```sql
SELECT 
  u.email,
  m.level,
  m.impact_points,
  m.invite_quota_monthly,
  m.invites_used_this_month,
  (SELECT COUNT(*) FROM invitation_codes WHERE created_by = u.id AND used_at IS NOT NULL) as accepted_invites
FROM user_memberships m
JOIN auth.users u ON u.id = m.user_id
ORDER BY m.impact_points DESC;
```

### Check IP Events
```sql
SELECT 
  u.email,
  e.event_type,
  e.points_earned,
  e.description,
  e.created_at
FROM impact_point_events e
JOIN auth.users u ON u.id = e.user_id
ORDER BY e.created_at DESC
LIMIT 20;
```

### Check Perks Configuration
```sql
SELECT level, COUNT(*) as perk_count
FROM membership_perks
WHERE is_active = true
GROUP BY level
ORDER BY CASE level
  WHEN 'basic' THEN 1
  WHEN 'brons' THEN 2
  WHEN 'silver' THEN 3
  WHEN 'guld' THEN 4
  WHEN 'admin' THEN 5
END;
```

---

## 🎉 Success Criteria

System is working if:
- ✅ All users have membership records
- ✅ Profile page loads with new design
- ✅ Level badge displays correctly
- ✅ Can generate invites (if quota > 0)
- ✅ Perks display for current level
- ✅ No console errors in browser
- ✅ No 500 errors in Vercel logs

---

## 📞 If You Need Help

1. Run test script: `npx tsx scripts/test-membership-system.ts`
2. Check `MEMBERSHIP_DEPLOYMENT_GUIDE.md`
3. Check `REWARDS_SYSTEM_GUIDE.md`
4. Review Vercel deployment logs
5. Check Supabase logs for database errors

---

**Current Status:** ✅ Migrations complete, Frontend deployed, System ready for testing!

**Next:** Set admin user and test profile page in browser.

