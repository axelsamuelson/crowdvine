# Migration 040: Add Discount Perk Type

## Problem

Admin memberships page returns 500 error when trying to save discount:
```
Error: invalid input value for enum perk_type: "discount"
```

The `perk_type` enum does not include `discount` as a valid value.

## Solution

Add `discount` to the `perk_type` enum and insert default discount perks for all levels.

## ⚠️ IMPORTANT: Two-Step Process

PostgreSQL requires enum values to be committed before they can be used. This migration MUST be run in two separate steps.

## Step 1: Add Enum Value

**File:** `migrations/040_add_discount_perk_type.sql`

```sql
ALTER TYPE perk_type ADD VALUE IF NOT EXISTS 'discount';
```

### How to Run Step 1:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this SQL:
   ```sql
   ALTER TYPE perk_type ADD VALUE IF NOT EXISTS 'discount';
   ```
3. ✅ **Commit** (the query executes and commits automatically)
4. **Wait 2-3 seconds** for transaction to complete

## Step 2: Insert Default Discount Perks

**File:** `migrations/040b_insert_discount_perks.sql`

```sql
INSERT INTO membership_perks (level, perk_type, perk_value, description, sort_order, is_active)
VALUES 
  ('basic', 'discount', '0%', 'No discount', 10, true),
  ('brons', 'discount', '3%', '3% discount on all wine purchases', 10, true),
  ('silver', 'discount', '5%', '5% discount on all wine purchases', 10, true),
  ('guld', 'discount', '10%', '10% discount on all wine purchases', 10, true),
  ('admin', 'discount', '15%', '15% discount on all wine purchases', 10, true)
ON CONFLICT (level, perk_type) DO NOTHING;
```

### How to Run Step 2:

1. **After Step 1 is committed**, in **SQL Editor**
2. Run the INSERT statement above
3. ✅ Verify with:
   ```sql
   SELECT level, perk_type, perk_value, description 
   FROM membership_perks 
   WHERE perk_type = 'discount'
   ORDER BY level;
   ```

## Expected Result

After both steps:

```
level  | perk_type | perk_value | description
-------|-----------|------------|---------------------------
basic  | discount  | 0%         | No discount
brons  | discount  | 3%         | 3% discount on all wine purchases
silver | discount  | 5%         | 5% discount on all wine purchases
guld   | discount  | 10%        | 10% discount on all wine purchases
admin  | discount  | 15%        | 15% discount on all wine purchases
```

## Test After Migration

1. Go to https://pactwines.com/admin/memberships
2. Click Edit on Bronze
3. Change discount from 3% to 0%
4. Click Save Changes
5. ✅ Should succeed without 500 error
6. ✅ Page reloads showing 0%
7. ✅ Change persists in database

## Troubleshooting

**If Step 2 still fails:**
- Wait longer after Step 1 (up to 10 seconds)
- Refresh SQL Editor page
- Try Step 2 again

**If discount still not saving:**
- Verify enum: `SELECT enum_range(NULL::perk_type);`
- Should include 'discount' in the list

**To rollback (if needed):**
```sql
-- Delete discount perks
DELETE FROM membership_perks WHERE perk_type = 'discount';

-- Cannot remove from enum once added (PostgreSQL limitation)
-- But can deactivate perks:
UPDATE membership_perks SET is_active = false WHERE perk_type = 'discount';
```

