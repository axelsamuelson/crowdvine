# Impact Points Award Verification Guide

## After Deployment - Test Complete IP System

### Test 1: Verify invite_signup IP Award

#### Step 1: Note Current IP
1. Log in as admin (ave.samuelson@gmail.com or admin@pactwines.com)
2. Go to https://pactwines.com/profile
3. Note your current Impact Points (e.g., "5 IP")

#### Step 2: Generate Invitation
1. On profile page, select level: "Silver"
2. Click "Generate Silver Invite"
3. Copy the invitation link
4. Note: Your "Available invites" count should decrease by 1

#### Step 3: Create New Account
1. Open invitation link in incognito/private mode
2. See: Silver circle badge, perks, pallet info
3. Fill form with **completely NEW email** (e.g., test123@example.com)
4. Click "Join the platform"
5. Expected: Auto sign-in, redirect to home

#### Step 4: Check Vercel Logs
Go to Vercel Dashboard → Latest Deployment → Runtime Logs

Search for: `[INVITE-REDEEM] Step 5`

You should see:
```
[INVITE-REDEEM] Step 5: Awarding +1 IP to inviter: <your-admin-uuid>
[INVITE-REDEEM] New user ID: <new-user-uuid>
[INVITE-REDEEM] STEP-5A SUCCESS - Inviter membership found: { currentPoints: 5, level: 'admin' }
[INVITE-REDEEM] STEP-5B SUCCESS - Inviter points updated: 5 → 6
[INVITE-REDEEM] VERIFICATION - Points after update: 6
[INVITE-REDEEM] STEP-5C SUCCESS - IP event logged: <event-uuid>
[INVITE-REDEEM] IP Award Status: { success: true, pointsBefore: 5, pointsAfter: 6, eventLogged: true }
```

**If you see STEP-5X FAILED:**
- Send me the full error object
- I'll fix the specific issue

#### Step 5: Verify in Admin Profile
1. Go back to admin account
2. Refresh https://pactwines.com/profile
3. Expected:
   - ✅ Impact Points: 6 (increased from 5)
   - ✅ Recent Activity shows: "Friend signed up using invite code"
   - ✅ Shows related user email
   - 🔔 If Realtime works: Toast "Your invite was just used! +1 IP awarded"

#### Step 6: Visit Activity Page
1. Go to https://pactwines.com/profile/activity
2. Expected:
   - ✅ Page loads (no 404)
   - ✅ Timeline shows invite_signup event
   - ✅ Blue UserPlus icon
   - ✅ "+1 IP" badge
   - ✅ "Just now" or timestamp
   - ✅ Related user: test123@example.com

#### Step 7: Verify in Database
Run in Supabase SQL Editor:
```sql
-- Check admin's current points
SELECT email, impact_points, level 
FROM user_memberships um
JOIN profiles p ON p.id = um.user_id
WHERE p.email = 'ave.samuelson@gmail.com';
-- Should show: 6 points

-- Check IP event was created
SELECT 
  ipe.event_type,
  ipe.points_earned,
  ipe.description,
  ipe.created_at,
  p.email as related_user_email
FROM impact_point_events ipe
LEFT JOIN profiles p ON p.id = ipe.related_user_id
WHERE ipe.user_id = (SELECT id FROM profiles WHERE email = 'ave.samuelson@gmail.com')
ORDER BY ipe.created_at DESC
LIMIT 5;
-- Should show: invite_signup event with test123@example.com
```

---

### Test 2: Verify Activity Page Filters

On https://pactwines.com/profile/activity:

1. **All Events (default)**
   - Should show all your IP events

2. **Click "Invites" filter**
   - Should show only invite_signup and invite_reservation events
   - Other events hidden

3. **Click "Orders" filter**
   - Should show only own_order events
   - Empty if you haven't made orders

4. **Click "Milestones" filter**
   - Should show only pallet_milestone events
   - Empty if you haven't hit milestones

5. **Click "All Events" again**
   - Should show everything again

---

### Test 3: Mobile Responsiveness

1. Open https://pactwines.com/profile/activity on mobile or resize browser
2. Check:
   - Filter buttons wrap nicely
   - Event cards stack vertically
   - Icons and text readable
   - Back button works
   - No horizontal scroll

---

## If IP Award Still Doesn't Work

### Debug Steps:

1. **Check Vercel Logs** for Step 5 execution
   - Look for any STEP-5X FAILED messages
   - Note the error code and message

2. **Check Database Manually**
   ```sql
   -- Find admin's user_id
   SELECT id, email FROM profiles WHERE email = 'ave.samuelson@gmail.com';
   
   -- Check membership exists
   SELECT * FROM user_memberships WHERE user_id = '<admin-uuid>';
   
   -- Check recent IP events
   SELECT * FROM impact_point_events 
   WHERE user_id = '<admin-uuid>' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Check invitation.created_by**
   ```sql
   -- Check who created the invitation
   SELECT 
     ic.code,
     ic.created_by,
     p.email as creator_email,
     ic.used_by,
     p2.email as used_by_email
   FROM invitation_codes ic
   LEFT JOIN profiles p ON p.id = ic.created_by
   LEFT JOIN profiles p2 ON p2.id = ic.used_by
   WHERE ic.code = '<your-invitation-code>'
   LIMIT 1;
   ```

4. **Send me:**
   - Vercel logs from Step 5
   - SQL query results from above
   - Any error messages you see

---

## Common Issues and Solutions

### Issue: No Step 5 logs in Vercel
**Cause:** invitation.created_by is null
**Fix:** Check invitation in database, ensure created_by is set

### Issue: STEP-5A FAILED
**Cause:** Inviter doesn't have membership
**Fix:** Run migration 039 to create missing memberships

### Issue: STEP-5B SUCCESS but points don't show in UI
**Cause:** Frontend cache or Realtime not working
**Fix:** Hard refresh profile page (Cmd+Shift+R or Ctrl+Shift+R)

### Issue: STEP-5C FAILED
**Cause:** RLS policy blocking impact_point_events INSERT
**Fix:** Check RLS policies, might need to use admin client

---

## Next Steps

After verifying invite_signup works:

1. Test invite_reservation (+2 IP):
   - Have invited user make their first order
   - Verify inviter gets +2 IP
   - Verify event appears

2. Test own_order (+1 IP):
   - Make an order with ≥6 bottles
   - Verify +1 IP awarded
   - Verify event appears

3. Test pallet_milestone (+3 IP):
   - Participate in 3 different pallets
   - Verify +3 IP awarded
   - Verify event appears

For now, focus on getting invite_signup working first!

