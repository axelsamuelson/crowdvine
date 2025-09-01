# Crowdvine Migration Audit Report

## 1. Quick Repo + Stack Scan

### Git Status
✅ **Clean working directory** - No uncommitted changes
✅ **Recent commits show successful migration** - Latest commit: "feat: complete Crowdvine migration with working data and API"

### Stack Detection
✅ **Next.js 15.2.4** - Latest version with App Router
✅ **App Router usage** - Confirmed presence of `app/` directory
✅ **TypeScript** - Configured with strict mode and path mapping
✅ **Tailwind + shadcn/ui** - `components.json` and `tailwind.config.js` present
✅ **Dependencies**:
  - `@supabase/supabase-js`: ✅ v2.56.1
  - `@supabase/ssr`: ✅ v0.7.0
  - `stripe`: ✅ v18.5.0
  - `@tanstack/react-query`: ✅ v5.85.6

### Environment Variables
✅ **Supabase keys** - Present in `.env.local`
✅ **Stripe keys** - Present in `.env.local`
✅ **APP_URL** - Configured for localhost:3000

## 2. Adapter State (Shopify → Crowdvine)

### Adapter Implementation
✅ **lib/shopify/index.ts** - Points to Crowdvine API routes
✅ **No leftover Shopify fetches** - All calls go to `/api/crowdvine/*`
✅ **Type compatibility** - Uses `Product`, `Collection`, `Cart` types
✅ **Cart shim** - Maps to Supabase `bookings` table

### API Routes Coverage
✅ **Products**: `/api/crowdvine/products` (GET) - Lists campaign_items
✅ **Product detail**: `/api/crowdvine/products/[handle]` (GET) - Single item
✅ **Collections**: `/api/crowdvine/collections` (GET) - Lists campaigns
✅ **Collection products**: `/api/crowdvine/collections/[id]/products` (GET)
✅ **Cart operations**: 
  - `/api/crowdvine/cart` (POST) - Create cart
  - `/api/crowdvine/cart/[id]/lines/add` (POST) - Add to bookings
  - `/api/crowdvine/cart/[id]/lines/update` (POST) - Update bookings
  - `/api/crowdvine/cart/[id]/lines/remove` (POST) - Remove bookings

### Frontend Compatibility
✅ **32 files import from @/lib/shopify** - All compatible with adapter
✅ **No direct Shopify calls** - All go through adapter
✅ **UI unchanged** - Visual appearance identical to original

## 3. Data Model Coverage (Supabase)

### Database Tables (from seed script)
✅ **producers** - Contains: id, name, region, lat, lon, country_code, address_*, short_description, logo_image_path
✅ **pallet_zones** - Contains: id, name, radius_km, center_lat, center_lon
✅ **campaigns** - Contains: id, title, description, status, producer_id
✅ **campaign_items** - Contains: id, handle, wine_name, vintage, grape_varieties, color, label_image_path, base_price_cents, campaign_id
✅ **bookings** - Contains: item_id, quantity, band (from cart API)

### Generated Columns
✅ **campaign_items.price_t100_cents to price_t700_cents** - Generated from base_price_cents
✅ **Price tier system** - Working correctly

### Missing Tables
❌ **pallet_zone_members** - Not found in seed script
❌ **memberships** - Removed from seed script (table doesn't exist)
❌ **RLS Policies** - No SQL files found in codebase

## 4. Frontend Routes & Placeholders

### Public Storefront Pages
✅ **Homepage**: `/` - Shows featured products
✅ **Shop**: `/shop` - Product grid with filtering
✅ **Collection**: `/shop/[collection]` - Filtered by campaign
✅ **Product**: `/product/[handle]` - Product detail page

### Admin Routes
❌ **No admin pages exist** - 404 on `/admin`
❌ **No producer pages exist** - No `/producer/*` routes

### Cart Implementation
✅ **Add-to-Cart flows** - Hit `/api/crowdvine/cart/**`
✅ **Bookings mapping** - Cart items → Supabase bookings table
✅ **Cart context** - React context for cart state

### Image Usage
✅ **label_image_path mapping** - Maps to product images correctly
✅ **Image dimensions** - Width/height set to 600x600

## 5. Stripe & Checkout Readiness

### Stripe Integration
✅ **Checkout setup**: `/api/checkout/setup` (POST) - Creates SetupIntent
⚠️ **URL validation error** - Stripe requires https URLs in production
❌ **No webhook route** - Missing `/api/stripe/webhook`
❌ **No orders model** - Only bookings, no order tracking

### Payment Flow
✅ **SetupIntent creation** - For payment method collection
❌ **Order processing** - No order creation/confirmation
❌ **Payment outbox** - No payment event handling

## 6. Gaps for Admin (CRUD) - Checklist

### Producers
❌ **List**: No admin page
❌ **Create**: No admin page
❌ **Update**: No admin page
❌ **Delete**: No admin page
❌ **Geocoding**: No lat/lon validation
❌ **Zone membership**: No membership management

### Pallet Zones
❌ **List**: No admin page
❌ **Create**: No admin page
❌ **Update**: No admin page
❌ **Membership viewer**: No admin page

### Campaigns
❌ **List**: No admin page
❌ **Create**: No admin page
❌ **Update**: No admin page
❌ **Status transitions**: No draft/live/triggered/closed management

### Campaign Items (Wines)
❌ **List**: No admin page
❌ **Create**: No admin page
❌ **Update**: No admin page
❌ **Handle uniqueness**: No validation

### Collections/Categories
✅ **Current mapping**: Campaigns map to collections
❌ **Taxonomy needed**: No category management
❌ **Admin interface**: No collection management

### Bookings
❌ **Admin read**: No admin table
❌ **Status filters**: No booking management
❌ **Metrics**: No booking analytics

### Auth/Role Gating
❌ **Admin guard**: No middleware for `/admin`
❌ **Producer guard**: No middleware for `/producer`
❌ **Authentication**: No auth system implemented

## 7. Risks & Blockers

### Critical Issues
1. **Stripe URL validation** - Requires https URLs in production
2. **Missing admin pages** - No admin interface exists
3. **No authentication** - No user management system
4. **Missing webhook handling** - No payment event processing

### Minor Issues
1. **params.id await warnings** - Next.js 15 requires awaiting params
2. **Image width warnings** - Some images missing width property
3. **No RLS policies** - Database security not configured

## 8. Recommended Next Steps

### Phase 1: Fix Critical Issues
1. **Fix Stripe URLs** - Use environment-based URLs
2. **Add authentication** - Implement Supabase Auth
3. **Create admin guard** - Middleware for admin routes

### Phase 2: Admin MVP
1. **Create `/admin` layout** - Basic admin structure
2. **Add producer CRUD** - List, create, update, delete producers
3. **Add campaign CRUD** - Manage campaigns and status
4. **Add wine CRUD** - Manage campaign items
5. **Add booking viewer** - Read-only booking management

### Phase 3: Advanced Features
1. **Add zone management** - Pallet zone CRUD
2. **Add payment processing** - Order creation and confirmation
3. **Add webhook handling** - Stripe event processing
4. **Add analytics** - Booking and sales metrics

## Summary

**Migration Status**: ✅ **COMPLETE** - Shopify → Crowdvine migration successful
**Admin Status**: ❌ **MISSING** - No admin interface exists
**Production Readiness**: ⚠️ **PARTIAL** - Core functionality works, admin missing

The storefront is fully functional with Crowdvine backend, but requires admin interface for content management.
