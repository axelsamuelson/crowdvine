# Membership Ladder System - Deployment & Testing Guide

## 🚀 Deployment Steps

### Step 1: Run Database Migrations

**In Supabase SQL Editor, run in order:**

1. **First:** `migrations/034_membership_system.sql`
   - Creates tables, enums, functions
   - Populates membership_perks
   - Sets up triggers

2. **Then:** `migrations/035_migrate_users_to_membership.sql`
   - Migrates existing users to membership system
   - Calculates initial IP from invitation history
   - Creates audit log entries

### Step 2: Verify Migration

Run these queries in Supabase:

```sql
-- 1. Count users by level
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

-- 2. Check migration events
SELECT COUNT(*) as migration_events
FROM impact_point_events
WHERE event_type = 'migration';

-- 3. Verify all users have membership
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT m.user_id) as users_with_membership
FROM auth.users u
LEFT JOIN user_memberships m ON m.user_id = u.id;
```

**Expected Results:**
- All users should have a membership record
- Migration events count should equal user count
- No missing memberships

### Step 3: Set Admin Users

Manually update admin users:

```sql
UPDATE user_memberships 
SET 
  level = 'admin',
  invite_quota_monthly = 999999,
  level_assigned_at = NOW()
WHERE user_id IN (
  SELECT id FROM profiles WHERE role = 'admin'
);
```

### Step 4: Deploy Frontend

The code is already pushed to `original-version-for-vercel` branch.

Vercel will auto-deploy. Wait 1-2 minutes for deployment.

### Step 5: Test Deployment

See testing section below.

---

## 🧪 Testing Checklist

### 1. Profile Page UI ✓

**Test:**
- Visit `https://pactwines.com/profile`
- Should see new Amex-inspired design

**Expected:**
- Metallic level badge (Brons/Silver/Guld gradient)
- Impact Points prominently displayed
- Progress bar to next level
- Perks grid showing active perks
- Invite quota with remaining count
- Recent IP activity timeline

**Check:**
- [ ] Level badge displays correctly
- [ ] IP count matches database
- [ ] Progress bar shows correct percentage
- [ ] Perks match membership level
- [ ] Invite quota displays (X / Y remaining)
- [ ] Timeline shows recent events
- [ ] Mobile responsive

### 2. Invite Generation ✓

**Test:**
- Click "Generate Invite Link" on profile page

**Expected:**
- Button disabled if quota = 0
- Creates new invitation code
- Shows code and shareable URL
- Decrements available invites

**Check:**
- [ ] Can generate invite
- [ ] Code is displayed (12 characters)
- [ ] URL is shareable
- [ ] Quota decreases after generation
- [ ] Can't generate if quota = 0

### 3. Access Gating ✓

**Test:**
- Create a new user without invitation
- Or set existing user to 'requester' level

**Expected:**
- Redirected to `/access-pending` page
- Cannot access /shop, /profile, etc.
- Can redeem invitation code

**Check:**
- [ ] Requester redirected to access-pending
- [ ] Access-pending page displays correctly
- [ ] Can enter and redeem invite code
- [ ] After redeem, gets access to platform

### 4. Level Progression ✓

**Test:**
- Award IP manually via admin API
- Check if level auto-upgrades

**Admin Test:**
```bash
curl -X PUT https://pactwines.com/api/admin/memberships \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "impactPoints": 15
  }'
```

**Expected:**
- User auto-upgrades to Silver (15 IP)
- Invite quota increases to 12/month
- Level badge updates
- Perks update to Silver perks

**Check:**
- [ ] Level upgrades at correct thresholds
- [ ] Invite quota updates automatically
- [ ] UI reflects new level immediately
- [ ] IP event logged for level_upgrade

### 5. Invite Quota Reset ✓

**Test:**
- Run quota reset function manually

```sql
SELECT reset_monthly_invite_quotas();
```

**Expected:**
- All users' `invites_used_this_month` reset to 0
- `last_quota_reset` updated to NOW()

**Check:**
- [ ] All users reset
- [ ] Available invites = quota again
- [ ] UI shows full quota

### 6. Admin Invite with Custom Level ✓

**Test:**
- Use admin invite generation API

```bash
curl -X POST https://pactwines.com/api/admin/invitations/generate \
  -H "Content-Type: application/json" \
  -d '{
    "initialLevel": "silver",
    "expiresInDays": 30
  }'
```

**Expected:**
- Creates invite with `initial_level` = 'silver'
- When redeemed, user starts at Silver (not Basic)
- User gets 12 invites/month from start

**Check:**
- [ ] Invite created with custom level
- [ ] New user starts at specified level
- [ ] Quota matches level (not Basic default)

### 7. IP Accrual (Integration Test) ✓

**Test:**
- Create invite
- Have friend redeem and register
- Check if inviter gets +1 IP

**Expected:**
- IP increases automatically
- Event logged in `impact_point_events`
- Timeline shows "Friend joined: +1 IP"

**Check:**
- [ ] IP awarded on invite signup
- [ ] Event logged correctly
- [ ] UI updates to show new IP
- [ ] Level upgrades if threshold crossed

---

## 🐛 Troubleshooting

### Migration Failed

**Symptom:** Migration SQL errors

**Fix:**
1. Check if migration 034 ran successfully first
2. Verify enums were created
3. Check for duplicate constraint errors

### No Membership for User

**Symptom:** User can't access profile, redirected to access-request

**Fix:**
```sql
-- Manually create membership
INSERT INTO user_memberships (user_id, level, impact_points, invite_quota_monthly)
VALUES ('USER_ID', 'basic', 0, 2);
```

### Invite Quota Not Resetting

**Symptom:** Users still have invites_used_this_month after month change

**Fix:**
```sql
-- Manual reset
UPDATE user_memberships
SET 
  invites_used_this_month = 0,
  last_quota_reset = NOW();
```

### Level Not Upgrading

**Symptom:** User has enough IP but level hasn't upgraded

**Fix:**
```sql
-- Trigger upgrade check
SELECT check_and_upgrade_level('USER_ID');
```

---

## 📊 Monitoring Queries

### Active Users by Level
```sql
SELECT 
  level,
  COUNT(*) as users,
  ROUND(AVG(impact_points), 1) as avg_ip,
  SUM(invites_used_this_month) as total_invites_used
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
```

### Top Users by IP
```sql
SELECT 
  p.email,
  p.full_name,
  m.level,
  m.impact_points,
  m.invite_quota_monthly,
  m.invites_used_this_month
FROM user_memberships m
JOIN profiles p ON p.id = m.user_id
ORDER BY m.impact_points DESC
LIMIT 20;
```

### Recent IP Events
```sql
SELECT 
  p.email,
  e.event_type,
  e.points_earned,
  e.description,
  e.created_at
FROM impact_point_events e
JOIN profiles p ON p.id = e.user_id
ORDER BY e.created_at DESC
LIMIT 50;
```

### Invite Quota Usage
```sql
SELECT 
  level,
  SUM(invites_used_this_month) as used,
  SUM(invite_quota_monthly) as total_quota,
  ROUND(100.0 * SUM(invites_used_this_month) / NULLIF(SUM(invite_quota_monthly), 0), 1) as usage_percent
FROM user_memberships
GROUP BY level;
```

---

## 🔄 Rollback Plan

If something goes wrong:

### Option 1: Revert Frontend Only
```bash
git checkout rollback-before-performance-audit~1
git push origin rollback-before-performance-audit:original-version-for-vercel --force
```

### Option 2: Revert Database (DESTRUCTIVE)
```sql
-- WARNING: This deletes all membership data
DROP TABLE IF EXISTS impact_point_events CASCADE;
DROP TABLE IF EXISTS user_memberships CASCADE;
DROP TABLE IF EXISTS membership_perks CASCADE;
DROP TYPE IF EXISTS membership_level CASCADE;
DROP TYPE IF EXISTS ip_event_type CASCADE;
DROP TYPE IF EXISTS perk_type CASCADE;

-- Revert invitation_codes
ALTER TABLE invitation_codes DROP COLUMN IF EXISTS initial_level;
```

**Only use Option 2 if absolutely necessary!**

---

## ✅ Post-Deployment Checklist

After deployment:

- [ ] Run migrations 034 and 035 in Supabase
- [ ] Verify all users have memberships
- [ ] Set admin users to admin level
- [ ] Test profile page loads correctly
- [ ] Test invite generation and quota
- [ ] Test access gating for requesters
- [ ] Test admin invite with custom level
- [ ] Monitor error logs for 24h
- [ ] Check IP accrual when invite is used
- [ ] Verify monthly quota reset logic

---

## 🆘 Support

**Issues?**
1. Check Vercel logs for errors
2. Check Supabase logs for database errors
3. Review `REWARDS_SYSTEM_GUIDE.md` for system overview
4. Review `PRODUCER_FILTERING_GUIDE.md` if producer pages break

**Emergency Contact:**
- Review git history: commits around `03722013`
- Check middleware logs for access control issues
- Verify database migration status in Supabase

---

**Deployment Date:** October 9, 2025  
**Version:** 1.0.0 - Membership Ladder System

