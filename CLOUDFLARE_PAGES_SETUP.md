# Cloudflare Pages Setup Guide

## Environment Variables

Set these environment variables in your Cloudflare Pages dashboard:

### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Database
DATABASE_URL=your_database_url

# Email Configuration
EMAIL_HOST=your_email_host
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password

# App Configuration
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NODE_ENV=production
```

## Build Configuration

- **Build Command**: `npm run build:cloudflare`
- **Build Output Directory**: `out`
- **Node.js Version**: 18

## Deployment Steps

1. Connect your GitHub repository to Cloudflare Pages
2. Set the production branch to `original-version`
3. Configure the build settings as above
4. Set all environment variables in the Pages dashboard
5. Deploy

## Notes

- This configuration uses static export for Cloudflare Pages
- API routes will need to be migrated to Cloudflare Functions if needed
- The app is configured to ignore build errors during production builds
