# Migration 045 & 046: Add Foreign Keys and Admin Views

## Overview

These migrations optimize the relationship between `bookings`, `order_reservations`, and `profiles` tables to make joins automatic and performant.

### What's being fixed:
- **Before**: Manual joins in application code (slow, complex)
- **After**: Database-level foreign keys + views (fast, simple)

## Migration 045: Foreign Keys

**Purpose**: Add foreign key constraints so Supabase can automatically join profiles data.

**Changes**:
1. Cleans up any orphaned records (bookings/reservations without valid profiles)
2. Adds FK: `bookings.user_id` → `profiles.id`
3. Adds FK: `order_reservations.user_id` → `profiles.id`
4. Creates indexes for faster joins

**Impact**:
- ✅ Enables automatic `profiles()` joins in Supabase queries
- ✅ Ensures data integrity (cascade deletes)
- ✅ Improves query performance with indexes

## Migration 046: Admin Views

**Purpose**: Create pre-joined views for admin dashboards.

**Views Created**:

### 1. `bookings_with_customers`
Combines:
- Bookings data
- Customer info (profiles)
- Wine details
- Producer info
- Pallet info

### 2. `orders_with_customers`
Combines:
- Order reservations
- Customer info (profiles)
- Pallet info
- Pickup/delivery zones

**Impact**:
- ✅ Single query instead of multiple joins
- ✅ Consistent data structure across admin pages
- ✅ Much faster admin dashboard loading

## How to Run

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste `migrations/045_add_profiles_foreign_keys.sql`
4. Click **Run**
5. Wait for success ✅
6. Copy and paste `migrations/046_create_admin_views.sql`
7. Click **Run**
8. Wait for success ✅

### Option 2: Supabase CLI

```bash
# Run migration 045
supabase db push --file migrations/045_add_profiles_foreign_keys.sql

# Run migration 046
supabase db push --file migrations/046_create_admin_views.sql
```

### Option 3: psql (if you have direct DB access)

```bash
psql $DATABASE_URL < migrations/045_add_profiles_foreign_keys.sql
psql $DATABASE_URL < migrations/046_create_admin_views.sql
```

## Verification

After running the migrations, verify they worked:

```sql
-- Check foreign keys exist
SELECT 
  constraint_name,
  table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_name IN ('bookings', 'order_reservations')
  AND constraint_name LIKE '%profiles_fkey';

-- Should return:
-- bookings_user_id_profiles_fkey | bookings
-- order_reservations_user_id_profiles_fkey | order_reservations

-- Check views exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name IN ('bookings_with_customers', 'orders_with_customers');

-- Should return:
-- bookings_with_customers | VIEW
-- orders_with_customers | VIEW

-- Test the views
SELECT COUNT(*) FROM bookings_with_customers;
SELECT COUNT(*) FROM orders_with_customers;
```

## What to Update After Migration

After running these migrations, you can simplify your code:

### API Routes (Next Step)

**Before (manual join)**:
```typescript
const bookings = await sb.from("bookings").select("*");
const profiles = await sb.from("profiles").select("*").in("id", userIds);
// ... manual join in memory
```

**After (automatic join)**:
```typescript
const { data: bookings } = await sb
  .from("bookings")
  .select(`
    *,
    profiles(email, first_name, last_name, full_name)
  `);
```

**Or using views (even simpler)**:
```typescript
const { data: bookings } = await sb
  .from("bookings_with_customers")
  .select("*");
```

## Rollback (if needed)

If something goes wrong, you can rollback:

```sql
-- Drop views
DROP VIEW IF EXISTS bookings_with_customers CASCADE;
DROP VIEW IF EXISTS orders_with_customers CASCADE;

-- Remove foreign keys
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_user_id_profiles_fkey;
ALTER TABLE order_reservations DROP CONSTRAINT IF EXISTS order_reservations_user_id_profiles_fkey;

-- Remove indexes
DROP INDEX IF EXISTS idx_bookings_user_id;
DROP INDEX IF EXISTS idx_order_reservations_user_id;
```

## Expected Results

After these migrations:
- Admin pages load faster ⚡
- Code is simpler and more maintainable 📝
- Customer names display correctly without complex joins 👤
- Database queries are more efficient 🚀

## Troubleshooting

### Error: "foreign key constraint violates referential integrity"
**Cause**: Some bookings/reservations have `user_id` that don't exist in profiles table.

**Solution**: The migration automatically deletes orphaned records. If you want to keep them, comment out the DELETE statements and manually fix the data first.

### Error: "relation already exists"
**Cause**: View or constraint already exists.

**Solution**: The migration includes `IF EXISTS` checks. Re-run it, or manually drop the existing view/constraint first.

### Views show no data
**Cause**: RLS (Row Level Security) might be blocking access.

**Solution**: Views inherit RLS from underlying tables. Make sure you're using admin client (`getSupabaseAdmin()`) in your API routes.

## Questions?

If you encounter any issues:
1. Check the Supabase logs
2. Verify foreign keys and views exist (use verification queries above)
3. Test with a simple query to each view
4. Check that profiles table has data for the user_ids in bookings/reservations

