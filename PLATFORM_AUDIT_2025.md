# PACT Wines Platform Audit - October 2025

## Executive Summary

This audit reviews the entire PACT Wines platform to identify technical debt, potential bugs, performance improvements, and code quality issues that should be addressed before adding new features.

---

## 🚨 CRITICAL ISSUES (Fix Immediately)

### 1. **Inconsistent Database Column Names**

**Problem:** We've encountered multiple instances where code assumes columns exist that don't:

- `order_reservations.order_id` doesn't exist (only `id`)
- `order_reservation_items.price_cents` doesn't exist
- Caused multiple 500 errors during development

**Impact:** High - causes runtime errors
**Solution:**

- Create a database schema documentation file
- Run `SELECT * FROM [table] LIMIT 0` to verify all column names
- Create TypeScript types from actual schema
- Consider using a schema validation tool

**Files to check:**

- All API routes that query `order_reservations`
- All API routes that query `order_reservation_items`

---

### 2. **Dual Authentication Systems (Admin + User)**

**Problem:** Platform has two separate auth systems:

- Admin auth (cookie-based, middleware)
- User auth (Supabase auth)
- Confusion about which to use where
- Some endpoints unclear about access control

**Impact:** High - security risk, maintenance burden
**Current state:**

- `/admin/*` uses cookie-based auth
- `/api/user/*` uses Supabase auth
- Some `/api/admin/*` endpoints don't check auth at all

**Recommendation:**

- Document which auth is required for each route type
- Add consistent auth checks to all admin endpoints
- Consider consolidating to single auth system long-term

---

### 3. **Missing Database Migrations Tracking**

**Problem:** 30+ migration SQL files in root directory:

- No clear order or versioning
- Hard to know which have been run
- Risk of running migrations twice or in wrong order

**Impact:** Medium-High - data integrity risk
**Solution:**

- Consolidate migrations into `/migrations` directory (already started)
- Add migration tracking table
- Use numbered prefixes: `001_create_pallets.sql`, `002_add_pallet_id.sql`
- Consider using a migration tool (e.g., Supabase migrations, Prisma)

---

## ⚠️ HIGH PRIORITY (Fix Soon)

### 4. **Excessive Debug/Test Files**

**Problem:** Many test and debug files in production:

- `app/debug-checkout/`, `app/debug-realtime/`, `app/debug-token/`
- `app/test-cart/`, `app/test-cookies/`, `app/test-signup/`
- `scripts/` contains 35 files (many are one-off tests)
- All these routes are deployed to production

**Impact:** Medium - security, performance, confusion
**Solution:**

- Move debug routes to development-only (check `process.env.NODE_ENV`)
- Delete or archive old test files
- Keep only essential scripts

**Recommendation:**

```typescript
// middleware.ts - block debug routes in production
if (process.env.NODE_ENV === "production" && pathname.startsWith("/debug")) {
  return NextResponse.redirect(new URL("/", request.url));
}
```

---

### 5. **Inconsistent API Patterns**

**Problem:** Three different patterns for similar operations:

- Server Actions (`lib/actions/*`)
- API Routes (`app/api/*`)
- Some use both (producers, wines)

**Current inconsistencies:**

- Producers: Server Actions + API Routes (recently added)
- Wines: Server Actions only
- Pallets: Server Actions only
- Zones: API Routes only

**Impact:** Medium - maintenance, confusion
**Recommendation:**

- Standardize on API Routes for admin operations (better error messages in production)
- Keep Server Actions for simple client-side mutations
- Document pattern in README

---

### 6. **No Error Boundary Components**

**Problem:** No error boundaries to catch React errors gracefully

- Errors crash entire page
- Poor user experience
- Hard to debug what went wrong

**Impact:** Medium - user experience
**Solution:**

- Add error boundaries for major sections
- Add error boundary for checkout flow
- Log errors to monitoring service (optional)

---

### 7. **Large Checkout Page Component (1100+ lines)**

**Problem:** `app/checkout/page.tsx` is 1100+ lines

- Hard to maintain
- Many state variables (15+)
- Complex useEffect chains
- Difficult to test

**Impact:** Medium - maintainability
**Solution:**

- Split into smaller components:
  - `CheckoutProfile.tsx`
  - `CheckoutAddress.tsx`
  - `CheckoutZones.tsx`
  - `CheckoutRewards.tsx`
  - `CheckoutSummary.tsx`
- Extract logic into custom hooks:
  - `useCheckoutZones.ts`
  - `useCheckoutRewards.ts`

---

## 📊 CODE QUALITY ISSUES

### 8. **Duplicate Code / Similar Functions**

**Found duplicates:**

**A) Pallet Reservations API (Public vs Admin):**

- `/api/pallet/[id]/reservations/route.ts` (public)
- `/api/admin/pallets/[id]/reservations/route.ts` (admin)
- ~80% identical code
- Should share common logic

**B) Zone Matching Logic:**

- Appears in multiple places
- `lib/zone-matching.ts` exists but not always used
- Some endpoints do zone matching inline

**C) Price Formatting:**

- `formatCurrency` implemented multiple times
- Should be in shared utility

**Solution:**

- Extract common API logic into shared functions
- Create single source of truth for each operation
- DRY principle

---

### 9. **Inconsistent TypeScript Types**

**Problem:** Types defined in multiple places for same entities:

- `Wine` type in `lib/actions/wines.ts`
- Product types in `lib/shopify/types.ts`
- Component-level interfaces repeated
- Some APIs return `any`

**Impact:** Low-Medium - type safety
**Solution:**

- Create central types directory: `lib/types/`
- Define database types once: `lib/types/database.ts`
- Use TypeScript's utility types (Pick, Omit)
- Generate types from Supabase schema

---

### 10. **Missing Input Validation**

**Problem:** Many API routes lack input validation:

- No schema validation (Zod, Yup)
- Manual checks scattered in code
- Inconsistent error messages

**Examples:**

```typescript
// Current (no validation)
const { name, region } = await request.json();

// Should be
const schema = z.object({
  name: z.string().min(1).max(255),
  region: z.string().min(1).max(255),
  // ...
});
const data = schema.parse(await request.json());
```

**Solution:**

- Add Zod for schema validation
- Create reusable validation schemas
- Consistent error responses

---

### 11. **Console.log Pollution**

**Problem:** Extensive console logging in production:

- Pallet icon: 20+ console.logs
- Checkout: 15+ console.logs
- Profile page: 10+ console.logs
- Shop page: debug logs for colors

**Impact:** Low - performance, security (data exposure)
**Solution:**

- Create logger utility with levels
- Disable debug logs in production
- Use proper logging service (optional)

```typescript
// lib/logger.ts
export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      console.log(...args);
    }
  },
  error: (...args: any[]) => console.error(...args),
  // ...
};
```

---

### 12. **Unused Dependencies & Dead Code**

**Potential unused:**

- Multiple unused migration files in root
- `waitlist/` directory (89 files) - is this still used?
- `out/` directory
- Old test files

**Action:**

- Review and remove unused directories
- Clean up old migration files
- Audit package.json for unused deps

---

## 🚀 PERFORMANCE IMPROVEMENTS

### 13. **No Image Optimization Strategy**

**Issues:**

- Images uploaded without resizing
- No WebP conversion
- No lazy loading in some places
- Full-size images loaded for thumbnails

**Impact:** Medium - page load speed
**Solution:**

- Add image processing on upload (Sharp, Cloudinary)
- Generate multiple sizes (thumbnail, medium, large)
- Use Next.js Image component everywhere
- WebP format with fallbacks

---

### 14. **No Caching Strategy**

**Missing caching:**

- Products API: `{ next: { tags: [TAGS.products] } }` but no revalidation
- Pallet data fetched on every request
- Zone matching recalculated every time
- Payment methods fetched repeatedly

**Impact:** Medium - performance, cost
**Solution:**

- Add ISR (Incremental Static Regeneration) for products
- Cache zone calculations (already partially done)
- Add Redis/Vercel KV for frequently accessed data
- Set appropriate `revalidate` times

---

### 15. **N+1 Query Problem**

**Found in:**

- `/api/pallet/[id]/reservations` - fetches profiles one-by-one
- Fetches producers one-by-one for items
- Could batch with `.in()` query

**Current:**

```typescript
reservations.map(async (res) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", res.user_id)
    .single();
  // ...
});
```

**Better:**

```typescript
const userIds = reservations.map((r) => r.user_id);
const { data: profiles } = await supabase
  .from("profiles")
  .select("id, email, full_name")
  .in("id", userIds);
const profileMap = new Map(profiles.map((p) => [p.id, p]));
```

**Impact:** Medium - API response time
**Solution:** Batch all queries

---

### 16. **Large Bundle Sizes**

**Observations:**

- First Load JS: 107 kB (good!)
- Some pages: 175+ kB
- Shop page includes motion/react for all product cards

**Opportunities:**

- Code-split heavy components (motion animations)
- Lazy load admin components
- Dynamic imports for rarely used features

---

## 🏗️ ARCHITECTURE IMPROVEMENTS

### 17. **No Database Indexes Verification**

**Concern:** Do we have proper indexes for:

- `order_reservations.pallet_id` ✅ (added in migration)
- `order_reservations.user_id` ❓
- `order_reservation_items.reservation_id` ❓
- `wines.producer_id` ✅ (from migration)
- `pallets.pickup_zone_id` ✅ (from migration)
- `pallets.delivery_zone_id` ✅ (from migration)

**Action:** Run `EXPLAIN ANALYZE` on common queries to verify index usage

---

### 18. **No API Rate Limiting**

**Problem:** Public endpoints have no rate limiting:

- `/api/pallet/[id]/reservations` (now public)
- `/api/crowdvine/products`
- Vulnerable to abuse/DOS

**Impact:** Low-Medium - security, cost
**Solution:**

- Add rate limiting middleware
- Use Vercel Edge Config or Upstash Redis
- Different limits for auth vs public

---

### 19. **Environment Variable Management**

**Issues:**

- `.env.local` and `.env.production` both used
- Some hardcoded values (e.g., `baseUrl = "https://pactwines.com"`)
- No validation that required vars are set

**Solution:**

- Create `lib/env.ts` with validation
- Use `z.object()` to validate env vars at startup
- Fail fast if missing required vars

---

### 20. **No Monitoring/Observability**

**Missing:**

- Error tracking (Sentry, LogRocket)
- Performance monitoring (Vercel Analytics enabled?)
- Database query performance
- API endpoint metrics

**Recommendation:**

- Add Sentry for error tracking
- Enable Vercel Speed Insights
- Track key metrics (checkout conversion, etc.)

---

## 🐛 POTENTIAL BUGS

### 21. **Race Conditions in Checkout**

**Found:** Zone matching triggers multiple state updates rapidly

- Fixed the wrapper issue
- But still potential for races in `handleZoneMatch`

**Review needed:**

- Debounce zone matching
- Use `useCallback` with stable dependencies
- Consider state machine for checkout flow

---

### 22. **Missing Null Checks**

**Examples:**

```typescript
// Unsafe
const palletName = realPalletData.name; // Could be null/undefined

// Should be
const palletName = realPalletData?.name || "Unknown Pallet";
```

**Found in:**

- Pallet pages
- Profile page
- Some admin pages

**Solution:** Add null checks and fallbacks everywhere

---

### 23. **Unused State Variables**

**Checkout page has:**

- `customAddress` state but validation incomplete
- `zoneInfo.usingFallbackAddress` set but only used once
- Some state that could be derived

**Solution:** Review and remove unused state

---

## 🎨 UX/UI IMPROVEMENTS

### 24. **Inconsistent Loading States**

**Some components have:**

- Skeleton loaders ✅
- Spinner loaders ✅
- No loader at all ❌

**Missing loaders:**

- Zone matching (has spinner now)
- Some admin pages
- Image uploads

**Solution:** Consistent loading patterns everywhere

---

### 25. **No Empty States Consistency**

**Good examples:**

- Pallet icon dropdown: "Your pallets will show here" ✅
- Profile rewards: Shows 0 values ✅

**Missing:**

- Some admin tables show nothing when empty
- No helpful text

**Solution:** Add empty states everywhere with helpful CTAs

---

### 26. **Mobile Responsiveness Gaps**

**Recently fixed:**

- Profile page ✅
- Pallet pages ✅
- Header alignment ✅

**Still needs review:**

- Checkout page (very dense on mobile)
- Admin pages (not mobile-friendly)
- Some tables overflow on mobile

---

## 📝 DOCUMENTATION GAPS

### 27. **Missing Documentation**

**What we have:**

- `README.md` (outdated - mentions campaigns)
- `ADMIN_README.md`
- Some feature docs (`WINE_IMAGES_FEATURE.md`)

**Missing:**

- API documentation
- Database schema docs
- Setup guide for new developers
- Deployment guide
- Environment variables reference

---

### 28. **No Code Comments in Complex Logic**

**Needs documentation:**

- Zone matching algorithm
- Pallet fill percentage calculation
- Gross margin vs markup pricing
- Reward system logic

---

## 🔒 SECURITY CONCERNS

### 29. **RLS Policies Not Fully Verified**

**Questions:**

- Are all tables protected by RLS?
- Are public endpoints properly scoped?
- Can users access other users' data?

**Action:**

- Audit all Supabase RLS policies
- Test with different user roles
- Document expected access patterns

---

### 30. **Sensitive Data in Logs**

**Found:**

- Email addresses logged
- User IDs logged
- Some payment method data in logs

**Solution:**

- Sanitize logs before production
- Use log levels appropriately
- Never log PII in production

---

### 31. **CORS and Security Headers**

**Missing:**

- CSP (Content Security Policy)
- Rate limiting (mentioned above)
- CSRF protection for forms

**Solution:**

- Add security headers in `next.config.mjs`
- Review middleware for security

---

## 🧹 CODE CLEANUP (Low Priority)

### 32. **Unused Imports**

**Many files have:**

- Imported but unused components
- Unused types
- Commented-out imports

**Solution:** Run ESLint with unused imports rule

---

### 33. **Inconsistent Code Style**

**Variations:**

- Some files use `async/await`, others use `.then()`
- Mix of `function` and `const fn = () =>`
- Inconsistent error handling patterns

**Solution:**

- Establish coding standards
- Add Prettier configuration
- Consistent error handling pattern

---

### 34. **Magic Numbers**

**Examples:**

- `alcohol_tax_cents: 2219` (22.19 SEK) - hardcoded
- `radius_km: 100` - default pickup zone radius
- `CACHE_DURATION = 2 * 60 * 1000` - scattered

**Solution:**

- Create constants file for business logic
- Document why each number exists

---

## 💡 QUICK WINS (Low Hanging Fruit)

### 35. **Remove Temporary Analysis Files**

**Delete these:**

- `PALLET_DATA_FLOW_ANALYSIS.md` ✅ (created during debugging)
- Various `test-*.js` files in root
- `cookies.txt`
- Old migration files after consolidation

---

### 36. **Consolidate Utility Functions**

**Current state:**

- `formatCurrency` defined in multiple files
- Color mapping in multiple places
- Date formatting repeated

**Solution:**

- Create `lib/utils/formatting.ts`
- Single source for all formatting

---

### 37. **Optimize Image Loading**

**Quick wins:**

- Add `loading="lazy"` to all non-critical images ✅ (footer logo already has it)
- Use `priority` for above-fold images
- Add proper `width` and `height` to prevent CLS

---

### 38. **Add Database Transactions**

**Missing in:**

- Checkout flow (creates reservation + items + updates pallet)
- Bulk upload (inserts many wines)
- Order confirmation

**Risk:** Partial data if one operation fails
**Solution:**

```typescript
const { data, error } = await supabase.rpc("create_reservation_transaction", {
  // ...
});
```

---

### 39. **Standardize Error Messages**

**Current:**

- Mix of generic and specific errors
- Inconsistent format
- Some expose stack traces in production

**Solution:**

- Create error response helper
- Consistent structure: `{ error: string, code?: string, details?: any }`
- Never expose stack traces in production

---

### 40. **Add TypeScript Strict Mode**

**Current:** `tsconfig.json` likely not in strict mode
**Benefits:**

- Catch more bugs at compile time
- Better IDE support
- Forced null checks

**Solution:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true
  }
}
```

---

## 🎯 RECOMMENDED ACTION PLAN

### Phase 1: Critical Fixes (This Week)

1. ✅ Document database schema (create `DATABASE_SCHEMA.md`)
2. ✅ Remove or gate debug/test routes
3. ✅ Fix dual auth confusion (document patterns)
4. ✅ Consolidate migrations

### Phase 2: Code Quality (Next Week)

5. ✅ Refactor checkout page into smaller components
6. ✅ Remove duplicate code (create shared utilities)
7. ✅ Add error boundaries
8. ✅ Fix N+1 queries

### Phase 3: Performance (Week After)

9. ✅ Add image optimization
10. ✅ Implement caching strategy
11. ✅ Add database transactions
12. ✅ Optimize bundle size

### Phase 4: Polish (Ongoing)

13. ✅ Add monitoring/error tracking
14. ✅ Improve documentation
15. ✅ TypeScript strict mode
16. ✅ Security audit

---

## 📋 CHECKLIST BEFORE NEW FEATURES

**Before adding major features, ensure:**

- [ ] Database schema is documented
- [ ] Migration system is organized
- [ ] Debug routes are removed/gated
- [ ] Checkout page is refactored
- [ ] Error boundaries are added
- [ ] Critical N+1 queries are fixed
- [ ] Image optimization is in place
- [ ] Auth patterns are documented
- [ ] Input validation is consistent
- [ ] Console logs are cleaned up

---

## 🎓 LESSONS LEARNED

**From recent development:**

1. **Test with actual schema** - Multiple column name mismatches
2. **Don't assume fields exist** - Always check database first
3. **Avoid complex conditional wrappers** - Causes React DOM errors
4. **Use API routes for admin** - Better error messages than Server Actions
5. **Server Actions hide errors in production** - Hard to debug
6. **Always normalize string comparisons** - Case sensitivity issues
7. **Test public endpoints** - Don't assume auth is always present

---

## 💰 ESTIMATED IMPACT

**If all issues are fixed:**

- **Performance:** 20-30% faster page loads
- **Maintainability:** 50% easier to add new features
- **Bug reduction:** 70% fewer runtime errors
- **Developer happiness:** Significantly improved
- **Security:** Much stronger posture

---

## 🔧 TOOLS TO CONSIDER

**For better DX:**

- [ ] Zod - Schema validation
- [ ] Prisma - Type-safe database client
- [ ] Sentry - Error tracking
- [ ] Vercel Analytics - Performance monitoring
- [ ] Storybook - Component documentation
- [ ] Vitest - Unit testing
- [ ] Playwright - E2E testing

---

## FINAL RECOMMENDATIONS

**Top 5 priorities before adding features:**

1. **Document database schema** - Prevents column name errors
2. **Refactor checkout page** - Current bottleneck for bugs
3. **Remove debug routes** - Security and clarity
4. **Fix N+1 queries** - Performance impact
5. **Add error boundaries** - Better user experience

**Once these are done, the platform will be much more stable for rapid feature development.**

---

_Generated: October 9, 2025_
_Platform: PACT Wines (CrowdVine)_
_Status: Production_
