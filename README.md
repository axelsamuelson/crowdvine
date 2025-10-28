# Crowdvine Storefront

A Next.js storefront for Crowdvine wine campaigns, built with Supabase and Stripe.

## Documentation Structure

All project documentation is organized in the `docs/` directory:

- `docs/migrations/` - Database migration guides
- `docs/deployment/` - Deployment procedures and checklists
- `docs/debugging/` - Debugging guides for troubleshooting
- `docs/setup/` - Setup instructions for different services
- `docs/fixes/` - Fix guides for specific issues
- `docs/audits/` - System audit reports
- `docs/features/` - Feature documentation and guides
- `docs/performance/` - Performance optimization documentation
- `docs/issues/` - Known issues and resolutions
- `docs/sql/` - SQL scripts and queries

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with your Supabase, Stripe, and SendGrid credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=CrowdVine
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Seed the database with sample data:

```bash
npm run seed
```

4. Start the development server:

```bash
npm run dev
```

## Seed Data

The seed script creates:

- 1 producer in Languedoc (near Béziers)
- 1 zone (Béziers 500 km)
- 1 membership
- 1 campaign with 3 wine products

## Database Schema

The application expects these Supabase tables:

- `producers` - Wine producers
- `zones` - Geographic zones for campaigns
- `memberships` - User membership tiers
- `campaigns` - Wine campaigns
- `campaign_items` - Individual wines in campaigns
- `bookings` - User wine reservations (cart items)

## API Routes

- `/api/crowdvine/products` - List all wines
- `/api/crowdvine/products/[handle]` - Individual wine details
- `/api/crowdvine/collections` - List campaigns as collections
- `/api/crowdvine/collections/[id]/products` - Wines in a campaign
- `/api/crowdvine/cart/*` - Cart operations (maps to bookings)
- `/api/checkout/setup` - Stripe payment method setup
