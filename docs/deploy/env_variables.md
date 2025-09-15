# Environment Variables for Cloudflare Pages

## Overview
This document lists all environment variables required for the Cloudflare Pages deployment and where they should be configured.

## Environment Variables Table

| Variable | Scope | Example Value | Where to Set | Description |
|----------|-------|---------------|--------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client/Edge | `https://abc123.supabase.co` | Cloudflare Pages Settings | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/Edge | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Cloudflare Pages Settings | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Only | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Cloudflare Pages Settings | Supabase service role key |
| `STRIPE_SECRET_KEY` | Edge Only | `sk_test_51ABC123...` | Cloudflare Pages Settings | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Edge Only | `whsec_ABC123...` | Cloudflare Pages Settings | Stripe webhook secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client/Edge | `pk_test_51ABC123...` | Cloudflare Pages Settings | Stripe publishable key |
| `DATABASE_URL` | Edge Only | `postgresql://user:pass@host:5432/db` | Cloudflare Pages Settings | Database connection string |
| `EMAIL_SERVER_HOST` | Edge Only | `smtp.gmail.com` | Cloudflare Pages Settings | SMTP server hostname |
| `EMAIL_SERVER_PORT` | Edge Only | `587` | Cloudflare Pages Settings | SMTP server port |
| `EMAIL_SERVER_USER` | Edge Only | `noreply@dirtywine.se` | Cloudflare Pages Settings | SMTP username |
| `EMAIL_SERVER_PASSWORD` | Edge Only | `your-app-password` | Cloudflare Pages Settings | SMTP password |
| `EMAIL_FROM` | Edge Only | `noreply@dirtywine.se` | Cloudflare Pages Settings | From email address |
| `NEXT_PUBLIC_APP_URL` | Client/Edge | `https://dirtywine.se` | Cloudflare Pages Settings | Application URL |
| `NODE_ENV` | Edge Only | `production` | Cloudflare Pages Settings | Environment mode |

## Cloudflare Pages Configuration

### Setting Environment Variables

1. **Go to Cloudflare Pages Dashboard**
   - Navigate to your project
   - Click "Settings" → "Environment Variables"

2. **Add Variables**
   - Click "Add variable"
   - Enter variable name and value
   - Mark sensitive variables as "Encrypted"

3. **Environment-Specific Variables**
   - Set different values for Production, Preview, and Development
   - Use "Encrypted" for all sensitive data

### Variable Scoping

#### Client-Side Variables (`NEXT_PUBLIC_*`)
- Available in browser JavaScript
- Can be accessed in React components
- **Security**: Never put secrets in these variables

#### Edge Variables (No prefix)
- Available in Cloudflare Pages Functions
- Not accessible in browser
- **Security**: Safe for secrets and API keys

## Required Variables by Function

### Authentication Functions
```bash
# functions/api/auth/login.ts
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Payment Functions
```bash
# functions/api/checkout/create-payment-intent.ts
STRIPE_SECRET_KEY=sk_test_51ABC123...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...

# functions/api/stripe/webhook.ts
STRIPE_WEBHOOK_SECRET=whsec_ABC123...
```

### File Upload Functions
```bash
# functions/api/upload/index.ts
# Option 1: R2 Storage
R2_BUCKET_NAME=your-bucket-name
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key

# Option 2: Supabase Storage
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Admin Functions
```bash
# functions/api/admin/wines.ts
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://user:pass@host:5432/db
```

## Security Best Practices

### 1. Never Commit Secrets
- Add `.env*` to `.gitignore`
- Use `.env.example` for documentation
- Never put real secrets in code

### 2. Use Encrypted Variables
- Mark all sensitive variables as "Encrypted" in Cloudflare
- This prevents them from being logged or exposed

### 3. Rotate Keys Regularly
- Set up key rotation schedule
- Update environment variables when keys change
- Monitor for unauthorized access

### 4. Principle of Least Privilege
- Only give functions access to variables they need
- Use different keys for different environments
- Separate read/write permissions where possible

## Environment-Specific Configuration

### Production Environment
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://dirtywine.se
STRIPE_SECRET_KEY=sk_live_51ABC123...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51ABC123...
```

### Preview Environment
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=https://preview.dirtywine.se
STRIPE_SECRET_KEY=sk_test_51ABC123...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
```

### Development Environment
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_51ABC123...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
```

## Troubleshooting

### Common Issues

1. **Variable Not Found**
   - Check variable name spelling
   - Ensure variable is set in correct environment
   - Verify variable is marked as "Encrypted" if needed

2. **Permission Denied**
   - Check if variable is accessible in function scope
   - Verify Edge vs Client variable usage
   - Check Cloudflare Pages Function permissions

3. **Invalid Format**
   - Verify JSON format for complex variables
   - Check URL format for Supabase/Stripe URLs
   - Ensure no trailing spaces or quotes

### Debugging

1. **Check Function Logs**
   - Go to Cloudflare Pages → Functions → Logs
   - Look for environment variable errors
   - Check function execution logs

2. **Test Variables**
   - Create a test function to log variables
   - Verify variables are accessible
   - Check variable values (without logging secrets)

## Migration Checklist

- [ ] Document all current environment variables
- [ ] Create `.env.example` file
- [ ] Set up Cloudflare Pages environment variables
- [ ] Test all functions with new variables
- [ ] Verify no secrets are in code
- [ ] Update documentation
- [ ] Train team on new variable management
