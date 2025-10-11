# 🚀 PACT Membership Ladder v2 - Deployment Guide

## Quick Start

This guide will get you from **current system** to **v2 live** in production.

---

## Step 1: Run Database Migrations

### Migration 042: Progression Buffs Tables

```bash
# In Supabase Dashboard → SQL Editor
# Run: migrations/042_progression_buffs.sql
```

**Creates:**
- `user_progression_buffs` table
- `progression_rewards` table
- Helper functions for buff management
- Baseline rewards (10 rewards across 3 segments)

**Verify:**
```sql
SELECT COUNT(*) FROM progression_rewards;
-- Should return: 10
```

**See:** `MIGRATION_042_GUIDE.md` for detailed instructions.

---

### Migration 043: Level-Up Integration

```bash
# In Supabase Dashboard → SQL Editor
# Run: migrations/043_integrate_progression_with_levelup.sql
```

**Updates:**
- Adds new IP event types to enum
- Updates `check_and_upgrade_level()` to clear buffs on level-up

**Verify:**
```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ip_event_type')
ORDER BY enumlabel;
-- Should include: invite_second_order, own_order_large, etc.
```

**See:** `MIGRATION_043_GUIDE.md` for detailed instructions.

---

## Step 2: Deploy Code

### Already Deployed to Vercel

All code changes have been pushed to `original-version-for-vercel` branch.

**Commits:**
1. `e1f0a07c` - Phase 1 & 2: Database + IP events
2. `9afbf608` - Phase 3: UI components
3. `1d8994a9` - Phase 5: Component enhancements
4. `7134df5c` - Profile integration
5. `7e3c7a55` - Checkout integration
6. `b9bc20b4` - **Critical: Order completion flow**
7. `5fd7a28a` - Admin UI
8. `ee4a3214` - Documentation

### Verify Deployment

```bash
# Check Vercel deployment status
https://vercel.com/[your-project]/deployments
```

---

## Step 3: Verify Everything Works

### Test 1: Progression Buffs Display

1. Login as any user
2. Go to `/profile`
3. Check if progression buffs display (if user has any)

**Expected:** If user has earned buffs, they show in amber card with breakdown.

---

### Test 2: IP Award for Order

1. Add 8 bottles to cart (should award +1 IP)
2. Complete checkout
3. Check Vercel logs for: `✅ [PROGRESSION] Awarded IP for own order`
4. Verify `impact_point_events` table has new event

**Expected:** +1 IP awarded, event logged.

---

### Test 3: Large Order Bonus

1. Add 15 bottles to cart
2. Complete checkout
3. Check logs for: `Large order with 15 bottles`
4. Verify +2 IP awarded (not +1)

**Expected:** `own_order_large` event type, +2 IP.

---

### Test 4: Progression Buff Award

1. User at 1 IP in Basic level
2. Award +1 IP (any method) to reach 2 IP
3. Check `user_progression_buffs` table
4. Should have new buff: 0.5%

**Expected:** Buff created at IP threshold.

---

### Test 5: Buff Application

1. User with active buff (e.g., 1% total)
2. Go to `/checkout`
3. See buff display at top
4. See "Progress bonus (1.0%)" in order summary
5. Complete order
6. Check `user_progression_buffs` - `used_at` should be set

**Expected:** Buff applied, discount calculated, buff marked as used.

---

### Test 6: Level-Up Clears Buffs

1. User at 4 IP with active buffs (Basic level)
2. Award +1 IP to reach 5 IP (Bronze level)
3. Check `user_progression_buffs` - all should be marked used
4. User should see "Upgraded from basic to brons" in events

**Expected:** Level upgraded, buffs cleared, event logged.

---

### Test 7: Admin Progression Rewards View

1. Login as admin
2. Go to `/admin/memberships`
3. Click "Progression Rewards" tab
4. Should see all 10 baseline rewards

**Expected:** Clean display of rewards by segment.

---

## Step 4: Monitor Production

### Supabase Logs

Check for:
```
✅ [PROGRESSION] Applied X buff(s) (Y%) to order
✅ [PROGRESSION] Awarded IP for own order
🎉 [PROGRESSION] Pallet milestone X reached!
```

### Vercel Logs

Monitor `/api/checkout/confirm` for progression logging.

### Database Queries

```sql
-- Active buffs across all users
SELECT 
  u.email,
  b.buff_percentage,
  b.buff_description,
  b.level_segment
FROM user_progression_buffs b
JOIN auth.users u ON u.id = b.user_id
WHERE b.used_at IS NULL
ORDER BY b.earned_at DESC;

-- Recent IP events (v2 types)
SELECT 
  u.email,
  e.event_type,
  e.points_earned,
  e.description,
  e.created_at
FROM impact_point_events e
JOIN auth.users u ON u.id = e.user_id
WHERE e.event_type IN (
  'invite_second_order',
  'own_order_large',
  'pallet_milestone_6',
  'pallet_milestone_12',
  'review_submitted',
  'share_action'
)
ORDER BY e.created_at DESC
LIMIT 20;
```

---

## Configuration Changes (Optional)

### Adjust IP Values

Edit `lib/membership/points-engine.ts`:

```typescript
export const IP_CONFIG = {
  INVITE_SIGNUP: 1,        // Change to 2 for more generous
  INVITE_RESERVATION: 2,
  // ... etc
}
```

### Modify Progression Rewards

Update `progression_rewards` table:

```sql
-- Change buff percentage at 2 IP
UPDATE progression_rewards
SET reward_value = '1.0'  -- Change from 0.5% to 1%
WHERE level_segment = 'basic-bronze' 
  AND ip_threshold = 2 
  AND reward_type = 'buff_percentage';

-- Add new custom reward
INSERT INTO progression_rewards (
  level_segment,
  ip_threshold,
  reward_type,
  reward_value,
  reward_description,
  sort_order
) VALUES (
  'bronze-silver',
  8,
  'buff_percentage',
  '0.5',
  'Bonus: +0.5% on next reservation',
  15
);
```

### Adjust Rate Limits

Edit `lib/membership/points-engine.ts`:

```typescript
export const IP_CONFIG = {
  // ...
  RATE_LIMIT_HOURS: 12,  // Change from 24h to 12h
}
```

---

## Common Post-Deployment Tasks

### Give User Progression Buff Manually

```sql
INSERT INTO user_progression_buffs (
  user_id,
  buff_percentage,
  buff_description,
  level_segment,
  expires_on_use
) VALUES (
  'user-uuid',
  2.0,
  'Special bonus from support team',
  'silver-gold',
  TRUE
);
```

### Award IP Manually (Admin)

Use existing admin panel at `/admin/users` or:

```sql
SELECT award_impact_points(
  'user-uuid'::UUID,
  'manual_adjustment'::ip_event_type,
  5,  -- points to award
  NULL,
  NULL,
  'Manual bonus from admin'
);
```

### Check User's Progression Status

```sql
SELECT 
  m.level,
  m.impact_points,
  (SELECT SUM(buff_percentage) 
   FROM user_progression_buffs 
   WHERE user_id = m.user_id AND used_at IS NULL) as active_buff_total,
  (SELECT COUNT(*) 
   FROM user_progression_buffs 
   WHERE user_id = m.user_id AND used_at IS NULL) as active_buff_count
FROM user_memberships m
WHERE m.user_id = 'user-uuid';
```

---

## Troubleshooting

### Issue: Buffs not showing in profile

**Check:**
1. Migration 042 completed?
2. `/api/user/progression-buffs` endpoint working?
3. User has earned IP in current segment?

**Fix:**
```bash
# Check API
curl https://pactwines.com/api/user/progression-buffs

# Check database
SELECT * FROM user_progression_buffs WHERE user_id = 'user-id';
```

---

### Issue: IP not awarded for order

**Check:**
1. Order has ≥6 bottles?
2. Progression logic in `/api/checkout/confirm`?
3. Check Vercel logs for errors

**Fix:**
Look for `[PROGRESSION]` logs in Vercel to see where it failed.

---

### Issue: Buffs not clearing on level-up

**Check:**
1. Migration 043 completed?
2. Function updated correctly?

**Fix:**
```sql
-- Manually clear buffs
SELECT clear_progression_buffs_on_level_up('user-id');
```

---

## Performance Considerations

### Database Indexes

All critical indexes created in migrations:
- `idx_user_progression_buffs_user_id`
- `idx_user_progression_buffs_active` (partial index for unused buffs)
- `idx_progression_rewards_segment`
- `idx_progression_rewards_segment_threshold` (unique)

### Caching

Consider adding Redis cache for:
- Active progression rewards (rarely change)
- IP_CONFIG values (static)

### Rate Limiting

Current implementation queries database for rate limit check. For high volume:
- Move to Redis with TTL
- Or use Vercel Edge Config

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Buff Usage Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE used_at IS NOT NULL) * 100.0 / COUNT(*) as usage_rate
   FROM user_progression_buffs;
   ```

2. **Average Time to Use Buff**
   ```sql
   SELECT AVG(EXTRACT(EPOCH FROM (used_at - earned_at)) / 3600) as avg_hours
   FROM user_progression_buffs
   WHERE used_at IS NOT NULL;
   ```

3. **Most Popular Buffs**
   ```sql
   SELECT 
     level_segment,
     COUNT(*) as times_earned,
     AVG(buff_percentage) as avg_percentage
   FROM user_progression_buffs
   GROUP BY level_segment
   ORDER BY times_earned DESC;
   ```

4. **Level-Up Rate**
   ```sql
   SELECT 
     description,
     COUNT(*) as upgrades,
     DATE_TRUNC('day', created_at) as date
   FROM impact_point_events
   WHERE event_type = 'level_upgrade'
   GROUP BY description, DATE_TRUNC('day', created_at)
   ORDER BY date DESC;
   ```

---

## Success Criteria

After deployment, you should see:

✅ Users earning progression buffs at correct IP milestones  
✅ Buffs displaying in profile with amber styling  
✅ Buffs applying discount in checkout  
✅ Buffs marked as used after order  
✅ Buffs clearing on level-up  
✅ New IP events appearing in timeline with correct icons  
✅ Large orders awarding +2 IP instead of +1  
✅ Pallet milestones at 6 and 12 pallets working  
✅ Admin can view progression rewards configuration  
✅ Gold celebration triggering at 35 IP  

---

## Support & Questions

**Documentation:**
- `MEMBERSHIP_LADDER_V2_GUIDE.md` - Full technical reference
- `MIGRATION_042_GUIDE.md` - Database setup
- `MIGRATION_043_GUIDE.md` - Integration setup
- `REWARDS_SYSTEM_GUIDE.md` - Original v1 system

**Code Locations:**
- IP Logic: `lib/membership/points-engine.ts`
- Progression Logic: `lib/membership/progression-rewards.ts`
- Order Integration: `app/api/checkout/confirm/route.ts`
- UI Components: `components/membership/*`
- Admin: `app/admin/memberships/*`

---

**Deployment Status:** ✅ Ready for Production  
**Last Updated:** 2025-01-11  
**Version:** 2.0

