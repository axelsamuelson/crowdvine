# Crowdvine Storefront

A Next.js storefront for Crowdvine wine campaigns, built with Supabase and Stripe.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with your Supabase and Stripe credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
APP_URL=http://localhost:3000
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
# Force Cloudflare Pages redeploy
