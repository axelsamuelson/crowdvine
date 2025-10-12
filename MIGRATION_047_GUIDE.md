# Migration 047: Producer Groups for 6-Bottle Rule

## Overview

This migration implements the 6-bottle checkout rule with producer grouping functionality.

### Business Rule

Customers must order bottles in **multiples of 6 per producer** (6, 12, 18, 24...) because wines are packed in 6-bottle cases.

**Examples:**
- ✅ Valid: 6 different wines from Producer A (6 bottles total)
- ✅ Valid: 12 bottles from Producer B (can be mixed wines)
- ❌ Invalid: 4 bottles from Producer C
- ❌ Invalid: 3 bottles Producer A + 3 bottles Producer B (different producers)

**With Producer Groups:**
- ✅ Valid: 3 bottles from Linked Producer A + 3 bottles from Linked Producer B (both in same group)

## What This Migration Creates

### Tables

**1. `producer_groups`**
- Stores groups of linked producers (e.g., "Southern France Partners")
- Admins create and manage these groups

**2. `producer_group_members`**
- Many-to-many relationship between groups and producers
- A producer can be in one group at a time (enforced by UNIQUE constraint)

### RLS Policies

- **View**: Anyone can view groups and members (needed for checkout validation)
- **Manage**: Only admins can create, update, delete groups

### Helper Function

**`get_grouped_producers(producer_id)`**
- Returns all producers in the same group as the given producer
- Used for validation logic

## How to Run

### Step 1: Run Migration in Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `migrations/047_producer_groups.sql`
3. Paste and click **Run** ▶️

### Step 2: Verify Migration

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('producer_groups', 'producer_group_members');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('producer_groups', 'producer_group_members');

-- Check function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_grouped_producers';
```

Expected results:
- ✅ 2 tables created
- ✅ RLS enabled on both
- ✅ Helper function created

## How It Works

### For Admins

1. Go to `/admin/producer-groups`
2. Click "Create Group"
3. Name the group (e.g., "Languedoc Partners")
4. Add producers to the group
5. Customers can now combine bottles from these producers

### For Customers

**Scenario 1: No Producer Groups**
```
Cart:
- Producer A: 3 bottles ❌ (need 3 more)
- Producer B: 6 bottles ✅
```
→ Cannot checkout until Producer A has 6 bottles

**Scenario 2: With Producer Group**
```
Group: "Languedoc Partners" (Producer A + Producer B)

Cart:
- Producer A: 3 bottles } 
- Producer B: 3 bottles } 6 total ✅
```
→ Can checkout! Group total is 6 bottles

### Validation Flow

1. **Cart sidebar**: Live validation shows status per producer/group
2. **Checkout page**: Validates before submitting order
3. **Server-side**: Final validation in API before creating reservation

## What Happens After Migration

### Immediate Changes

- ✅ Cart shows validation warnings for producers with < 6 bottles
- ✅ Checkout blocks orders that don't meet the 6-bottle rule
- ✅ Admins can create producer groups
- ✅ Server validates all orders

### No Breaking Changes

- ✅ Existing orders are not affected
- ✅ Customers can still order as before (if they have 6+ bottles)
- ✅ Graceful fallback if validation fails (fail open)

## Admin UI Features

### Producer Groups Page (`/admin/producer-groups`)

**Features:**
- Create new producer groups
- View all groups with their members
- Add producers to groups
- Remove producers from groups
- Delete entire groups

**Layout:**
```
Producer Groups
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Info Card: 6-Bottle Rule Explanation]

┌─────────────────────────┐  ┌─────────────────────────┐
│ Languedoc Partners      │  │ Bordeaux Collection     │
│                         │  │                         │
│ Producers:              │  │ Producers:              │
│ • Domaine A [×]        │  │ • Château X [×]        │
│ • Domaine B [×]        │  │ • Château Y [×]        │
│ [+ Add Producer]        │  │ [+ Add Producer]        │
│                         │  │                         │
│ 2 producers in group    │  │ 2 producers in group    │
└─────────────────────────┘  └─────────────────────────┘

[+ Create Group]
```

## Testing

After migration, test these scenarios:

### Test 1: Single Producer, Invalid Quantity
1. Add 3 bottles from Producer A
2. Open cart → Should show warning "Need 3 more bottles for 6 total"
3. Try to checkout → Should be blocked

### Test 2: Single Producer, Valid Quantity
1. Add 6 bottles from Producer A (can be different wines)
2. Open cart → Should show green checkmark "Ready to order"
3. Checkout → Should work

### Test 3: Multiple Producers, All Valid
1. Add 6 bottles from Producer A
2. Add 12 bottles from Producer B
3. Open cart → Both should show green checkmarks
4. Checkout → Should work

### Test 4: Producer Group
1. Admin: Create group "Test Group"
2. Admin: Add Producer A and B to group
3. User: Add 3 bottles from Producer A + 3 bottles from Producer B
4. Open cart → Should show "Test Group: 6 bottles ✅"
5. Checkout → Should work

## Troubleshooting

### Issue: Validation not showing in cart
**Solution:** Check browser console for errors. Make sure `validateSixBottleRule` is being called.

### Issue: Producer groups not appearing
**Solution:** Verify RLS policies allow public SELECT on producer_groups and producer_group_members.

### Issue: Can't add producer to group
**Solution:** Check that producer isn't already in another group (UNIQUE constraint).

## Rollback

If needed, rollback the migration:

```sql
-- Drop function
DROP FUNCTION IF EXISTS get_grouped_producers(UUID);

-- Drop tables (CASCADE will drop members table too)
DROP TABLE IF EXISTS producer_group_members CASCADE;
DROP TABLE IF EXISTS producer_groups CASCADE;
```

## Next Steps

After migration:
1. Test validation in cart
2. Test checkout blocking
3. Create a few producer groups
4. Test grouped producer validation
5. Monitor logs for any issues

## Questions?

- See `OPTIMIZATION_COMPLETE.md` for overall system architecture
- Check Vercel logs for validation messages (🔍 ✅ ❌ emojis)
- Test thoroughly before going live

