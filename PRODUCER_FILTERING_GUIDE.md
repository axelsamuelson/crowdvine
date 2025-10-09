# Producer Filtering System - Technical Documentation

## 📋 Overview

This document explains how the producer filtering system works on the shop page (`/shop/[collection]`). This is critical infrastructure that allows users to filter wines by producer (e.g., `/shop/hors-saison`).

**Last Updated:** October 9, 2025  
**Status:** ✅ Working (as of commit `c93ff038`)

---

## 🏗️ Architecture

### Flow Diagram
```
User visits /shop/hors-saison
           ↓
1. Next.js Page Router (app/shop/[collection]/page.tsx)
           ↓
2. getCollectionProducts() (lib/shopify/index.ts)
           ↓
3. Collections API (app/api/crowdvine/collections/route.ts)
   - Converts handle "hors-saison" → Producer ID (UUID)
           ↓
4. Collection Products API (app/api/crowdvine/collections/[id]/products/route.ts)
   - Fetches wines for that Producer ID
           ↓
5. Return products to page → Render
```

---

## 🔑 Critical Components

### 1. Collections API (`/api/crowdvine/collections`)

**File:** `app/api/crowdvine/collections/route.ts`

**Purpose:** Maps producer names to handles (URL-friendly slugs)

**Key Logic:**
```typescript
// Fetches all producers from database
const { data: producers } = await sb
  .from("producers")
  .select("id, name, region")
  .order("name");

// Converts each producer to a collection object
const producerCollections = producers.map((producer: any) => ({
  id: producer.id,                                    // UUID
  handle: producer.name.toLowerCase().replace(/\s+/g, "-"), // "hors-saison"
  title: producer.name,                               // "Hors Saison"
  description: `Wines from ${producer.name} in ${producer.region}`,
}));
```

**Example Output:**
```json
{
  "id": "99508657-2c57-4980-ad47-652a1da040ca",
  "handle": "hors-saison",
  "title": "Hors Saison",
  "description": "Wines from Hors Saison in Languedoc"
}
```

---

### 2. Collection Products API (`/api/crowdvine/collections/[id]/products`)

**File:** `app/api/crowdvine/collections/[id]/products/route.ts`

**Purpose:** Fetches wines for a specific producer (by ID or handle)

**Critical Requirements:**

#### ✅ MUST Use Admin Supabase Client
```typescript
// ❌ WRONG - RLS will block queries
const sb = await supabaseServer();

// ✅ CORRECT - Bypasses RLS
const sb = getSupabaseAdmin();
```

#### ✅ MUST Handle Both UUID and Handle
```typescript
let producerId = resolvedParams.id;

// Check if it's a UUID vs a handle
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedParams.id);

if (resolvedParams.id.includes('-') && !isUUID) {
  // It's a handle like "hors-saison" - need to convert to UUID
  const collections = await getCollections();
  const collection = collections.find(c => c.handle === resolvedParams.id);
  producerId = collection?.id;
}
```

#### ✅ MUST Query Wines Table Correctly
```typescript
const { data, error } = await sb
  .from("wines")
  .select(`
    id,
    wine_name,
    vintage,
    grape_varieties,
    color,
    handle,
    base_price_cents,
    label_image_path,
    producer_id
  `)
  .eq("producer_id", producerId)  // Filter by producer
  .limit(limit);
```

---

### 3. Shop Page (`/shop/[collection]/page.tsx`)

**File:** `app/shop/[collection]/page.tsx`

**Purpose:** Server component that renders the shop page

**Key Points:**
- Uses ISR (Incremental Static Regeneration): `export const revalidate = 60`
- Passes collection handle to ProductList component
- Handles metadata generation gracefully (no `notFound()` calls that break ISR)

---

### 4. Product List Component

**File:** `app/shop/components/product-list.tsx`

**Purpose:** Fetches products using Shopify-compatible helper functions

**Key Logic:**
```typescript
try {
  products = await getCollectionProducts({
    collection,  // "hors-saison"
    query,
    sortKey,
    reverse,
  });
} catch (error) {
  console.error("Error fetching products:", error);
  products = [];  // Graceful fallback
}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: API Returns Empty Array `[]`

**Symptoms:**
- API call succeeds (200 OK)
- But returns `[]` instead of products
- Database has wines for that producer

**Root Cause:**
Using `supabaseServer()` instead of `getSupabaseAdmin()`

**Solution:**
```typescript
// In app/api/crowdvine/collections/[id]/products/route.ts
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const sb = getSupabaseAdmin(); // NOT: await supabaseServer()
```

**Why:** Row Level Security (RLS) blocks unauthenticated queries. Admin client bypasses RLS.

---

### Issue 2: DYNAMIC_SERVER_USAGE Error

**Symptoms:**
```
Error: DYNAMIC_SERVER_USAGE
digest: 'DYNAMIC_SERVER_USAGE'
page: '/shop/hors-saison'
```

**Root Causes:**

#### A) `notFound()` Called in `generateMetadata`
```typescript
// ❌ BAD - Breaks ISR
export async function generateMetadata() {
  const collection = await getCollection(handle);
  if (!collection) return notFound(); // BREAKS ISR!
  return { title: collection.title };
}

// ✅ GOOD - Graceful fallback
export async function generateMetadata() {
  try {
    const collection = await getCollection(handle);
    if (!collection) {
      return { 
        title: `PACT Wines | ${handle}`,
        description: `Shop wines from ${handle}`
      };
    }
    return { title: collection.title };
  } catch (error) {
    console.error("Error in generateMetadata:", error);
    return { title: "PACT Wines" };
  }
}
```

#### B) Uncaught Errors in Data Fetching
```typescript
// ❌ BAD - Error propagates to Next.js
export async function getCollectionProducts() {
  const url = new URL(API.collectionProducts(id));
  return j(await fetch(url));  // j() throws on non-200
}

// ✅ GOOD - Graceful error handling
export async function getCollectionProducts() {
  try {
    const url = new URL(API.collectionProducts(id));
    return j(await fetch(url));
  } catch (error) {
    console.error("Error:", error);
    return [];  // Fallback to empty array
  }
}
```

#### C) Inconsistent `searchParams` Type (Next.js 15+)
```typescript
// ❌ BAD - Causes type mismatch
export default async function ShopPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) { }

// ✅ GOOD - Next.js 15 requires Promise
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) { }
```

---

### Issue 3: Handle Not Found / Collection Not Found

**Symptoms:**
- Console: `"Collection not found for handle: hors-saison"`
- API returns `[]`

**Root Cause:**
Handle-to-ID mapping logic is broken

**Solution:**
Ensure Collections API uses consistent logic:

```typescript
// In /api/crowdvine/collections
const producerCollections = producers.map((producer: any) => ({
  handle: producer.name.toLowerCase().replace(/\s+/g, "-"),
  // ...
}));

// In /api/crowdvine/collections/[id]/products
if (handle.includes('-') && !isUUID) {
  const collections = await getCollections();
  const match = collections.find(c => c.handle === handle);
  producerId = match?.id;
}
```

**Both must use identical handle generation logic!**

---

## 🧪 Testing Checklist

Before deploying changes to producer filtering:

### 1. Test Collections API
```bash
curl https://pactwines.com/api/crowdvine/collections | jq '.[] | select(.handle == "hors-saison")'
```
**Expected:** Returns collection with `id`, `handle`, `title`

### 2. Test Collection Products API (by UUID)
```bash
curl "https://pactwines.com/api/crowdvine/collections/99508657-2c57-4980-ad47-652a1da040ca/products"
```
**Expected:** Returns array of products (not empty)

### 3. Test Collection Products API (by handle)
```bash
curl "https://pactwines.com/api/crowdvine/collections/hors-saison/products"
```
**Expected:** Returns array of products (not empty)

### 4. Test Shop Page
```bash
curl -I "https://pactwines.com/shop/hors-saison"
```
**Expected:** HTTP 200 (not 500 or 404)

### 5. Test in Browser
Visit: `https://pactwines.com/shop/hors-saison`
**Expected:** See wines, no DYNAMIC_SERVER_USAGE error in console

---

## 📊 Database Schema

### Producers Table
```sql
CREATE TABLE producers (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(255),
  -- ... other fields
);
```

### Wines Table
```sql
CREATE TABLE wines (
  id UUID PRIMARY KEY,
  wine_name VARCHAR(255) NOT NULL,
  vintage VARCHAR(10),
  producer_id UUID REFERENCES producers(id),
  -- ... other fields
);
```

**Critical Index:**
```sql
CREATE INDEX idx_wines_producer_id ON wines(producer_id);
```

---

## 🔧 Debugging Steps

If producer filtering stops working:

### Step 1: Check API Response
```bash
curl -s "https://pactwines.com/api/crowdvine/collections/hors-saison/products" | python3 -c "import sys, json; data = json.load(sys.stdin); print(f'Products: {len(data)}')"
```

**If 0 products:**
- Check if admin client is being used
- Check database for wines with that producer_id
- Check RLS policies

### Step 2: Check Database
```sql
-- Get producer ID
SELECT id, name FROM producers WHERE name = 'Hors Saison';

-- Check wines exist
SELECT COUNT(*) FROM wines WHERE producer_id = '99508657-2c57-4980-ad47-652a1da040ca';
```

### Step 3: Check Server Logs
```bash
vercel logs
```
Look for:
- `Collection not found for handle: ...`
- `Error fetching wines: ...`
- `DYNAMIC_SERVER_USAGE`

### Step 4: Check Supabase Client
In `app/api/crowdvine/collections/[id]/products/route.ts`:
```typescript
// Must be:
import { getSupabaseAdmin } from "@/lib/supabase-admin";
const sb = getSupabaseAdmin();

// NOT:
import { supabaseServer } from "@/lib/supabase-server";
const sb = await supabaseServer();
```

---

## 📝 Changelog

### October 9, 2025 - Working Version (commit `c93ff038`)
- ✅ Uses `supabaseServer()` but works
- ✅ Handle-to-ID mapping functional
- ✅ No DYNAMIC_SERVER_USAGE errors
- ✅ ISR working correctly

### October 9, 2025 - Broken After Performance Audit (commit `3b49e466`)
- ❌ Changed to use admin client but something broke
- ❌ DYNAMIC_SERVER_USAGE errors appeared
- ❌ Multiple fix attempts (UUID detection, try/catch, etc.)
- ✅ Eventually rolled back to working version

### Lessons Learned
1. **Test producer filtering after EVERY performance optimization**
2. **Don't batch multiple changes** - makes debugging impossible
3. **Admin client is required** for collections products API
4. **ISR + `notFound()` = DYNAMIC_SERVER_USAGE error**
5. **Cache can mask issues** - always test with cache bypass

---

## 🎯 Best Practices

### DO:
- ✅ Use `getSupabaseAdmin()` in collections products API
- ✅ Handle errors gracefully (return `[]` instead of throwing)
- ✅ Test with multiple producers (not just one)
- ✅ Use try/catch in all async functions
- ✅ Add logging for debugging (but remove in production)
- ✅ Use ISR (`export const revalidate = 60`)

### DON'T:
- ❌ Call `notFound()` in `generateMetadata` with ISR
- ❌ Use `supabaseServer()` in public APIs (RLS will block)
- ❌ Make multiple changes at once without testing
- ❌ Assume cache has cleared (test with bypass)
- ❌ Remove debug endpoints until confirmed working

---

## 🆘 Emergency Rollback

If producer filtering breaks in production:

```bash
cd /path/to/crowdvine_01
git checkout -b emergency-rollback c93ff038
git push origin emergency-rollback:original-version-for-vercel --force
```

This reverts to last known working version (Oct 9, 2025).

Then investigate and fix incrementally.

---

## 📚 Related Files

### Core Files
- `app/shop/[collection]/page.tsx` - Shop page component
- `app/shop/components/product-list.tsx` - Product fetching logic
- `app/api/crowdvine/collections/route.ts` - Collections API
- `app/api/crowdvine/collections/[id]/products/route.ts` - Collection products API
- `lib/shopify/index.ts` - Helper functions (getCollections, getCollectionProducts)

### Supporting Files
- `lib/supabase-admin.ts` - Admin Supabase client
- `lib/supabase-server.ts` - Server Supabase client
- `app/shop/layout.tsx` - Shop layout with ISR

---

## 💡 Future Improvements

1. **Add E2E Tests** for producer filtering
2. **Cache collection-to-ID mapping** in Redis/memory
3. **Add monitoring** for empty API responses
4. **Create debug dashboard** showing all producer handles
5. **Add Sentry** for DYNAMIC_SERVER_USAGE errors

---

**Need Help?** Review this document first, then check git history around commits `c93ff038` (working) and `3b49e466` (broken).

