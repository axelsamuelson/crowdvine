# Functions Mapping - Next.js API Routes → Cloudflare Pages Functions

## Routing Overview

This document maps the existing Next.js API routes to Cloudflare Pages Functions and outlines what needs to be implemented.

## Critical Endpoints (High Priority)

### Authentication
| Next.js Route | Pages Function | Status | TODO |
|---------------|----------------|--------|------|
| `/api/auth/login` | `functions/api/auth/login.ts` | ✅ Stub | Implement Supabase auth |
| `/api/auth/logout` | `functions/api/auth/logout.ts` | ✅ Stub | Implement session cleanup |
| `/api/auth/callback` | `functions/api/auth/callback.ts` | ❌ Missing | Create OAuth callback handler |

### Payment & Checkout
| Next.js Route | Pages Function | Status | TODO |
|---------------|----------------|--------|------|
| `/api/checkout/confirm` | `functions/api/checkout/confirm.ts` | ❌ Missing | Create payment confirmation |
| `/api/checkout/create-payment-intent` | `functions/api/checkout/create-payment-intent.ts` | ✅ Stub | Implement Stripe PaymentIntent |
| `/api/stripe/webhook` | `functions/api/stripe/webhook.ts` | ✅ Stub | Implement webhook verification |

### File Upload
| Next.js Route | Pages Function | Status | TODO |
|---------------|----------------|--------|------|
| `/api/upload/` | `functions/api/upload/index.ts` | ✅ Stub | Implement R2/Supabase Storage |

## User & Admin Endpoints (Medium Priority)

### User Management
| Next.js Route | Pages Function | Status | TODO |
|---------------|----------------|--------|------|
| `/api/user/reservations` | `functions/api/user/reservations.ts` | ✅ Stub | Implement Supabase query |
| `/api/user/profile` | `functions/api/user/profile.ts` | ❌ Missing | Create profile management |

### Admin Functions
| Next.js Route | Pages Function | Status | TODO |
|---------------|----------------|--------|------|
| `/api/admin/wines` | `functions/api/admin/wines.ts` | ✅ Stub | Implement CRUD operations |
| `/api/admin/users` | `functions/api/admin/users.ts` | ❌ Missing | Create user management |
| `/api/admin/reservations` | `functions/api/admin/reservations.ts` | ❌ Missing | Create reservation management |

## Utility Endpoints (Low Priority)

### Health & Debug
| Next.js Route | Pages Function | Status | TODO |
|---------------|----------------|--------|------|
| `/api/health` | `functions/api/health.ts` | ✅ Complete | No changes needed |
| `/api/debug/*` | `functions/api/debug/*` | ❌ Missing | Create debug endpoints |

### External Data
| Next.js Route | Pages Function | Status | TODO |
|---------------|----------------|--------|------|
| `/api/crowdvine/*` | `functions/api/crowdvine/*` | ❌ Missing | Create product data endpoints |

## Implementation Priority

### Phase 1: Core Functionality
1. **Authentication** - Login/logout with Supabase
2. **Payment** - Stripe PaymentIntent creation
3. **File Upload** - R2 or Supabase Storage integration

### Phase 2: User Features
1. **User Reservations** - Fetch user data
2. **Profile Management** - User profile CRUD
3. **Admin Functions** - Wine and user management

### Phase 3: Advanced Features
1. **Webhook Processing** - Stripe webhook handling
2. **Debug Endpoints** - Development tools
3. **External Data** - Crowdvine integration

## Environment Variables Required

Each function needs access to these environment variables:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Storage (if using R2)
R2_BUCKET_NAME=your-bucket-name
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
```

## Notes

- All functions are currently stubs with TODO comments
- Functions return appropriate HTTP status codes
- Error handling is implemented for basic cases
- Functions handle both GET and POST requests where appropriate
- Middleware function handles access control
