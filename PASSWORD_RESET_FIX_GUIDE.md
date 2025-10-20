# Password Reset URL Fix Guide

## Problem

Password reset emails contain localhost URLs instead of production URLs, causing users to be redirected to non-working pages.

## Root Cause

The issue is likely in the Supabase project configuration where the Site URL is set to localhost instead of the production domain.

## Solution Steps

### 1. Update Supabase Site URL Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Update the **Site URL** from `http://localhost:3000` to `https://pactwines.com`
4. Add `https://pactwines.com` to **Redirect URLs** if not already present
5. Save the configuration

### 2. Verify Redirect URLs

Make sure these URLs are in your **Redirect URLs** list:

- `https://pactwines.com/auth/callback`
- `https://pactwines.com/auth/callback?next=/reset-password`
- `https://pactwines.com/reset-password`

### 3. Test the Fix

1. Request a new password reset from the production site
2. Check the email - the link should now point to `https://pactwines.com` instead of localhost
3. Click the link to verify it works correctly

### 4. Alternative: Force Production URL in Code

If the Supabase configuration can't be changed immediately, we can hardcode the production URL:

```typescript
// In app/api/auth/forgot-password/route.ts
const redirectUrl = "https://pactwines.com/auth/callback?next=/reset-password";
```

## Current Status

- ✅ Auth callback route created
- ✅ Reset password page created
- ✅ Error handling page created
- ✅ Dynamic URL detection improved
- ✅ Supabase Site URL configuration updated to https://pactwines.com
- ✅ Hardcoded production URL in forgot-password API

## Next Steps

1. ✅ ~~Update Supabase Site URL configuration~~ **COMPLETED**
2. Test password reset flow end-to-end
3. Verify emails contain correct production URLs
