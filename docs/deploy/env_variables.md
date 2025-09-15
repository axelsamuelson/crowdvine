# Environment Variables for Cloudflare Pages

This document lists all required environment variables for the application, their scope (client or server-side), and where they should be configured in Cloudflare Pages.

**Important**: All secret keys (e.g., `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`) must **never** be exposed on the client-side. They should only be available to Pages Functions (server-side).

## Core Infrastructure Variables

| Variable Name | Scope | Description | Example Value | Cloudflare Pages Setting |
|---------------|-------|-------------|---------------|-------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | Supabase project URL | `https://abcdefghijk.supabase.co` | Pages Settings → Environment Variables |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | Supabase anonymous key | `eyJ...` | Pages Settings → Environment Variables |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (Functions) | Supabase service role key (admin operations) | `eyJ...` | Pages Settings → Environment Variables (Secret) |

## Payment Processing Variables

| Variable Name | Scope | Description | Example Value | Cloudflare Pages Setting |
|---------------|-------|-------------|---------------|-------------------------|
| `STRIPE_SECRET_KEY` | Server (Functions) | Stripe secret key | `sk_live_...` | Pages Settings → Environment Variables (Secret) |
| `STRIPE_WEBHOOK_SECRET` | Server (Functions) | Stripe webhook secret | `whsec_...` | Pages Settings → Environment Variables (Secret) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client & Server | Stripe publishable key | `pk_live_...` | Pages Settings → Environment Variables |

## File Storage Variables

| Variable Name | Scope | Description | Example Value | Cloudflare Pages Setting |
|---------------|-------|-------------|---------------|-------------------------|
| `R2_ACCOUNT_ID` | Server (Functions) | Cloudflare R2 account ID | `your-account-id` | Pages Settings → Environment Variables (Secret) |
| `R2_ACCESS_KEY_ID` | Server (Functions) | Cloudflare R2 access key | `your-access-key` | Pages Settings → Environment Variables (Secret) |
| `R2_SECRET_ACCESS_KEY` | Server (Functions) | Cloudflare R2 secret key | `your-secret-key` | Pages Settings → Environment Variables (Secret) |
| `R2_BUCKET_NAME` | Server (Functions) | Cloudflare R2 bucket name | `your-bucket-name` | Pages Settings → Environment Variables (Secret) |

## External API Variables

| Variable Name | Scope | Description | Example Value | Cloudflare Pages Setting |
|---------------|-------|-------------|---------------|-------------------------|
| `EXCHANGE_RATE_API_KEY` | Server (Functions) | Exchange rate API key | `your-api-key` | Pages Settings → Environment Variables (Secret) |
| `NODEMAILER_EMAIL` | Server (Functions) | Email service email | `no-reply@dirtywine.se` | Pages Settings → Environment Variables (Secret) |
| `NODEMAILER_PASSWORD` | Server (Functions) | Email service password | `your-email-password` | Pages Settings → Environment Variables (Secret) |
| `NODEMAILER_HOST` | Server (Functions) | Email service host | `smtp.misshosting.com` | Pages Settings → Environment Variables (Secret) |
| `NODEMAILER_PORT` | Server (Functions) | Email service port | `587` | Pages Settings → Environment Variables (Secret) |

## Application Variables

| Variable Name | Scope | Description | Example Value | Cloudflare Pages Setting |
|---------------|-------|-------------|---------------|-------------------------|
| `NEXT_PUBLIC_BASE_URL` | Client & Server | Base URL for the application | `https://dirtywine.se` | Pages Settings → Environment Variables |
| `DATABASE_URL` | Server (Functions) | Direct database connection string | `postgresql://...` | Pages Settings → Environment Variables (Secret) |

## Cloudflare Pages Configuration

### Setting Environment Variables

1. **Go to Cloudflare Pages Dashboard**
   - Navigate to your project
   - Go to Settings → Environment Variables

2. **Add Variables by Environment**
   - **Production**: Set all variables for production deployment
   - **Preview**: Set variables for preview deployments (can use test keys)

3. **Mark Secret Variables**
   - Click the "Encrypt" checkbox for sensitive variables
   - This prevents them from being exposed in build logs

### Variable Categories

#### Public Variables (Client Accessible)
These variables are prefixed with `NEXT_PUBLIC_` and are available in both client and server code:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_BASE_URL`

#### Secret Variables (Server Only)
These variables should be marked as encrypted in Cloudflare Pages:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `EXCHANGE_RATE_API_KEY`
- `NODEMAILER_EMAIL`
- `NODEMAILER_PASSWORD`
- `NODEMAILER_HOST`
- `NODEMAILER_PORT`
- `DATABASE_URL`

## Environment-Specific Configuration

### Development (.env.local)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Production (Cloudflare Pages)
All variables should be set in the Cloudflare Pages dashboard with appropriate values for production.

## Security Best Practices

1. **Never commit secrets to version control**
2. **Use different keys for development and production**
3. **Rotate keys regularly**
4. **Monitor usage and access logs**
5. **Use least privilege principle for API keys**

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Check that all required variables are set in Cloudflare Pages
   - Verify variable names match exactly (case-sensitive)

2. **Secret Variables Not Working**
   - Ensure secret variables are marked as encrypted
   - Check that they're available in the correct environment (Production/Preview)

3. **Client-Side Access Issues**
   - Only `NEXT_PUBLIC_*` variables are available on the client
   - Server-only variables are only available in Pages Functions

### Verification Commands

```bash
# Check if environment variables are loaded
echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "Stripe Key: ${STRIPE_SECRET_KEY:0:10}..." # Only show first 10 chars
```