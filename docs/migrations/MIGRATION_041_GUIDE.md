# Migration 041: Add Initial Level to Access System

## Problem

Getting "Failed to update access request" error when approving access requests in admin panel.

## Root Cause

The `initial_level` column doesn't exist in the `access_requests` and `access_tokens` tables yet.

## Solution: Run Migration

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Click "New query"

### Step 2: Run Migration SQL

Copy and paste this SQL:

```sql
-- Migration: Add initial_level to access_requests and access_tokens tables
-- This allows admins to specify the membership level when approving access requests

-- Add initial_level column to access_requests table
ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS initial_level VARCHAR(20) DEFAULT 'basic';

-- Add comment to explain the column
COMMENT ON COLUMN access_requests.initial_level IS 'The membership level to assign when user completes signup (basic, brons, silver, guld)';

-- Add initial_level column to access_tokens table
ALTER TABLE access_tokens
ADD COLUMN IF NOT EXISTS initial_level VARCHAR(20) DEFAULT 'basic';

-- Add comment to explain the column
COMMENT ON COLUMN access_tokens.initial_level IS 'The membership level to assign when user uses this token to signup (basic, brons, silver, guld)';

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_access_requests_initial_level ON access_requests(initial_level);
CREATE INDEX IF NOT EXISTS idx_access_tokens_initial_level ON access_tokens(initial_level);
```

### Step 3: Click "Run"

You should see:

```
Success. No rows returned
```

### Step 4: Verify Migration

Run this query to verify the columns were added:

```sql
-- Check access_requests table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'access_requests'
AND column_name = 'initial_level';

-- Check access_tokens table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'access_tokens'
AND column_name = 'initial_level';
```

You should see both columns with:

- `data_type`: character varying
- `column_default`: 'basic'::character varying

### Step 5: Test the Flow

1. Go to https://pactwines.com/admin/access-control
2. Find a pending access request
3. Select a membership level (Basic/Bronze/Silver/Gold)
4. Click "Approve"
5. Should work without error now!

## What This Migration Does

1. **Adds `initial_level` to `access_requests`**
   - Stores the membership level selected by admin when approving
   - Default: 'basic'
   - Used by `/api/generate-signup-url` to create token with level

2. **Adds `initial_level` to `access_tokens`**
   - Stores the membership level in the signup token
   - Default: 'basic'
   - Used by `/api/create-user` to assign correct membership level

3. **Creates Indexes**
   - Improves query performance for filtering by level

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove columns
ALTER TABLE access_requests DROP COLUMN IF EXISTS initial_level;
ALTER TABLE access_tokens DROP COLUMN IF EXISTS initial_level;

-- Remove indexes
DROP INDEX IF EXISTS idx_access_requests_initial_level;
DROP INDEX IF EXISTS idx_access_tokens_initial_level;
```

## After Migration

The complete flow will work:

1. User requests access
2. Admin selects level (Basic/Bronze/Silver/Gold) and approves
3. Level stored in `access_requests.initial_level`
4. Email sent with signup link
5. Token created with level stored in `access_tokens.initial_level`
6. User creates account
7. Membership created with correct level
8. Invite quota assigned based on level:
   - Basic: 2 invites/month
   - Bronze: 5 invites/month
   - Silver: 12 invites/month
   - Gold: 50 invites/month
