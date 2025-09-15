# Cloudflare Pages Functions Migration Map

## Overview
This document maps all Next.js API routes and Server Actions to their corresponding Cloudflare Pages Functions, including environment variables, authentication requirements, caching strategies, and migration status.

## Migration Status Legend
- ✅ **Completed** - Fully migrated and tested
- 🔄 **In Progress** - Currently being migrated
- ❌ **Pending** - Not yet started
- ⚠️ **Blocked** - Requires additional work

## Functions Structure
```
functions/
├── _middleware.ts              # Access control (cookies)
├── api/
│   ├── health.ts              # Health check endpoint
│   ├── auth/
│   │   ├── login.ts           # User authentication
│   │   ├── logout.ts          # User logout
│   │   └── session.ts          # Session status
│   ├── checkout/
│   │   └── create-payment-intent.ts
│   ├── stripe/
│   │   └── webhook.ts         # Stripe webhook handler
│   ├── upload/
│   │   └── index.ts           # File upload handling
│   ├── user/
│   │   └── reservations.ts    # User reservations
│   └── admin/
│       └── wines.ts           # Admin wine management
└── _lib/
    ├── supabase.ts            # Supabase client helpers
    ├── stripe.ts              # Stripe client helpers
    └── response.ts            # Response helpers
```

## Migration Table

| Old Route | New Function Path | Environment Variables | Auth Required | Cache TTL | Status |
|-----------|------------------|---------------------|---------------|-----------|---------|
| `/api/auth/login` | `functions/api/auth/login.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ❌ | 0 | ❌ |
| `/api/auth/logout` | `functions/api/auth/logout.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 0 | ❌ |
| `/api/auth/signup` | `functions/api/auth/login.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ❌ | 0 | ❌ |
| `/api/me/access` | `functions/api/auth/session.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 60 | ❌ |
| `/api/checkout/create-payment-intent` | `functions/api/checkout/create-payment-intent.ts` | `STRIPE_SECRET_KEY` | ✅ | 0 | ❌ |
| `/api/checkout/confirm` | `functions/api/checkout/confirm.ts` | `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 0 | ❌ |
| `/api/checkout/setup` | `functions/api/checkout/setup.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 0 | ❌ |
| `/api/checkout/zones` | `functions/api/checkout/zones.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 300 | ❌ |
| `/api/stripe/webhook` | `functions/api/stripe/webhook.ts` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | ❌ | 0 | ❌ |
| `/api/stripe/setup-intent` | `functions/api/stripe/setup-intent.ts` | `STRIPE_SECRET_KEY` | ✅ | 0 | ❌ |
| `/api/upload` | `functions/api/upload/index.ts` | `SUPABASE_SERVICE_ROLE_KEY`, `R2_*` | ✅ | 0 | ❌ |
| `/api/user/reservations` | `functions/api/user/reservations.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 60 | ❌ |
| `/api/user/reservations/[id]` | `functions/api/user/reservations/[id].ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 60 | ❌ |
| `/api/user/profile` | `functions/api/user/profile.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 300 | ❌ |
| `/api/user/payment-methods` | `functions/api/user/payment-methods.ts` | `STRIPE_SECRET_KEY`, `SUPABASE_URL` | ✅ | 60 | ❌ |
| `/api/admin/wines` | `functions/api/admin/wines.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/admin/wines/[id]` | `functions/api/admin/wines/[id].ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/admin/users` | `functions/api/admin/users.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/admin/reservations` | `functions/api/admin/reservations.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 60 | ❌ |
| `/api/admin/bookings` | `functions/api/admin/bookings.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 60 | ❌ |
| `/api/admin/pallets` | `functions/api/admin/pallets.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/admin/pallets/[id]` | `functions/api/admin/pallets/[id].ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/admin/zones` | `functions/api/admin/zones.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/admin/zones/[id]` | `functions/api/admin/zones/[id].ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/admin/wine-boxes` | `functions/api/admin/wine-boxes.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/admin/wine-boxes/[id]` | `functions/api/admin/wine-boxes/[id].ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/admin/wine-boxes/[id]/items` | `functions/api/admin/wine-boxes/[id]/items.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/admin/access-requests` | `functions/api/admin/access-requests.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 60 | ❌ |
| `/api/admin/invitation-codes` | `functions/api/admin/invitation-codes.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 300 | ❌ |
| `/api/crowdvine/products` | `functions/api/crowdvine/products.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 300 | ❌ |
| `/api/crowdvine/products/[handle]` | `functions/api/crowdvine/products/[handle].ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 300 | ❌ |
| `/api/crowdvine/collections` | `functions/api/crowdvine/collections.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 300 | ❌ |
| `/api/crowdvine/collections/[id]/products` | `functions/api/crowdvine/collections/[id]/products.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 300 | ❌ |
| `/api/crowdvine/cart` | `functions/api/crowdvine/cart.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 0 | ❌ |
| `/api/crowdvine/cart/lines/update` | `functions/api/crowdvine/cart/lines/update.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 0 | ❌ |
| `/api/crowdvine/cart/lines/remove` | `functions/api/crowdvine/cart/lines/remove.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 0 | ❌ |
| `/api/reservation-details` | `functions/api/reservation-details.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 60 | ❌ |
| `/api/reservation-status` | `functions/api/reservation-status.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 60 | ❌ |
| `/api/exchange-rates` | `functions/api/exchange-rates.ts` | `EXCHANGE_RATE_API_KEY` | ❌ | 3600 | ❌ |
| `/api/site-content/[key]` | `functions/api/site-content/[key].ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ | 300 | ❌ |
| `/api/invite/redeem` | `functions/api/invite/redeem.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ❌ | 0 | ❌ |
| `/api/invitation-codes/validate` | `functions/api/invitation-codes/validate.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ❌ | 60 | ❌ |
| `/api/set-access-cookie` | `functions/_middleware.ts` | None | ❌ | 0 | ❌ |
| `/api/access-request` | `functions/api/access-request.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ❌ | 0 | ❌ |
| `/api/test-user` | `functions/api/test-user.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ❌ | 0 | ❌ |
| `/api/migrate/add-pallet-id` | `functions/api/migrate/add-pallet-id.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 0 | ❌ |
| `/api/migrate/update-bookings` | `functions/api/migrate/update-bookings.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 0 | ❌ |
| `/api/debug/database` | `functions/api/debug/database.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 0 | ❌ |
| `/api/debug/wines` | `functions/api/debug/wines.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 0 | ❌ |
| `/api/debug/update-zones` | `functions/api/debug/update-zones.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 0 | ❌ |
| `/api/debug/bookings` | `functions/api/debug/bookings.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 0 | ❌ |
| `/api/debug/reservation` | `functions/api/debug/reservation.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 0 | ❌ |
| `/api/debug/checkout` | `functions/api/debug/checkout.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 0 | ❌ |
| `/api/debug/pallets` | `functions/api/debug/pallets.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 0 | ❌ |
| `/api/debug/test-insert` | `functions/api/debug/test-insert.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Admin) | 0 | ❌ |
| `/api/debug/email` | `functions/api/debug/email.ts` | `NODEMAILER_*` | ✅ (Admin) | 0 | ❌ |

## Environment Variables Required

### Core Infrastructure
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin operations)

### Payment Processing
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

### File Storage
- `R2_ACCOUNT_ID` - Cloudflare R2 account ID
- `R2_ACCESS_KEY_ID` - Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY` - Cloudflare R2 secret key
- `R2_BUCKET_NAME` - Cloudflare R2 bucket name

### External APIs
- `EXCHANGE_RATE_API_KEY` - Exchange rate API key
- `NODEMAILER_EMAIL` - Email service email
- `NODEMAILER_PASSWORD` - Email service password
- `NODEMAILER_HOST` - Email service host
- `NODEMAILER_PORT` - Email service port

### Application
- `NEXT_PUBLIC_BASE_URL` - Base URL for the application
- `DATABASE_URL` - Direct database connection string

## Authentication Strategy

### Public Endpoints (No Auth Required)
- `/api/health`
- `/api/auth/login`
- `/api/auth/signup`
- `/api/stripe/webhook`
- `/api/exchange-rates`
- `/api/invite/redeem`
- `/api/invitation-codes/validate`
- `/api/access-request`

### User Authentication Required
- All `/api/user/*` endpoints
- All `/api/crowdvine/*` endpoints
- All `/api/checkout/*` endpoints (except webhook)
- `/api/reservation-*` endpoints

### Admin Authentication Required
- All `/api/admin/*` endpoints
- All `/api/debug/*` endpoints
- All `/api/migrate/*` endpoints

## Caching Strategy

### No Cache (0 seconds)
- Authentication endpoints
- Payment processing
- File uploads
- Debug endpoints
- Migration endpoints

### Short Cache (60 seconds)
- User reservations
- Admin reservations/bookings
- Session status
- Invitation validation

### Medium Cache (300 seconds)
- Product data
- Collections
- Admin data (wines, users, zones, etc.)
- User profile data

### Long Cache (3600 seconds)
- Exchange rates
- Static content

## Migration Priority

### Phase 1: Core Infrastructure (High Priority)
1. `_middleware.ts` - Access control
2. `api/health.ts` - Health check
3. `api/auth/login.ts` - Authentication
4. `api/auth/logout.ts` - Logout
5. `api/auth/session.ts` - Session management

### Phase 2: Critical Business Logic (High Priority)
1. `api/checkout/create-payment-intent.ts` - Payment processing
2. `api/stripe/webhook.ts` - Payment webhooks
3. `api/user/reservations.ts` - User functionality
4. `api/admin/wines.ts` - Admin functionality

### Phase 3: Supporting Features (Medium Priority)
1. `api/upload/index.ts` - File uploads
2. `api/crowdvine/*` - Product data
3. `api/admin/*` - Admin features
4. `api/debug/*` - Debug endpoints

### Phase 4: Cleanup (Low Priority)
1. Remove old Next.js API routes
2. Update frontend to use new endpoints
3. Performance optimization
4. Monitoring setup

## Notes

- All functions use Cloudflare Pages Functions runtime
- Authentication is handled via `cv-access` cookie in middleware
- Supabase operations use service role key only in Functions
- Stripe webhook requires raw body handling
- File uploads migrate to R2 or Supabase Storage
- Caching implemented via Cache-Control headers
- Rate limiting implemented where appropriate