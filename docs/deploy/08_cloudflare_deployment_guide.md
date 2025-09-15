# Cloudflare Pages Deployment Guide

## 🚀 Step-by-Step Deployment Process

### 1. Cloudflare Pages Setup

#### A) Connect Repository to Cloudflare Pages
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Create an application**
3. Choose **Connect to Git**
4. Select your GitHub account and `crowdvine` repository
5. Choose **main** branch

#### B) Configure Build Settings
```
Framework preset: Next.js (Static HTML Export)
Build command: npm ci --legacy-peer-deps && npm run build
Build output directory: out
Root directory: / (leave empty)
Node.js version: 18
```

#### C) Enable Pages Functions
- Ensure **Pages Functions** is enabled (should auto-detect `functions/` folder)
- This enables server-side functionality for API routes

### 2. Environment Variables Configuration

#### Server-side Variables (Private)
Go to **Pages** → **Settings** → **Environment Variables**:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_...your-webhook-secret

# Database (if using direct connection)
DATABASE_URL=postgresql://...your-db-url

# Email Configuration (if using Nodemailer)
NODEMAILER_EMAIL=no-reply@dirtywine.se
NODEMAILER_PASSWORD=your-email-password
NODEMAILER_HOST=smtp.misshosting.com
NODEMAILER_PORT=587

# Other Services
GEOCODING_API_KEY=your-geocoding-api-key
CROWDVINE_API_KEY=your-crowdvine-api-key
```

#### Client-side Variables (Public)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...your-publishable-key
NEXT_PUBLIC_BASE_URL=https://dirtywine.se
```

### 3. First Deployment

1. Click **Save and Deploy**
2. Wait for build to complete (should take 2-5 minutes)
3. Note your deployment URL: `https://your-project.pages.dev`

### 4. Smoke Testing

#### A) Basic Health Checks
```bash
# Health endpoint
curl https://your-project.pages.dev/api/health
# Expected: {"status":"healthy","timestamp":"..."}

# Product page (ISR test)
curl https://your-project.pages.dev/product/sample-wine-1
# Expected: HTML with product content

# Collection page
curl https://your-project.pages.dev/shop/all-wines
# Expected: HTML with product grid
```

#### B) Admin Access Test
1. Visit `https://your-project.pages.dev/admin-auth/login`
2. Should redirect to access request page (middleware working)
3. Test login flow (if you have test credentials)

#### C) Checkout Flow Test
1. Visit `https://your-project.pages.dev/checkout`
2. Should load checkout page (Suspense boundary working)
3. Test payment intent creation (if Stripe keys are configured)

### 5. Stripe Webhook Configuration

#### A) Configure Webhook Endpoint
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. URL: `https://your-project.pages.dev/api/stripe/webhook`
5. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_method.attached`
6. Copy the webhook secret

#### B) Update Environment Variables
Add the webhook secret to Cloudflare Pages:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...your-webhook-secret
```

#### C) Test Webhook
1. Use Stripe CLI or Dashboard to send test events
2. Check Cloudflare Pages Functions logs
3. Verify 200 response

### 6. DNS Migration (Recommended)

#### Option A: Full Cloudflare DNS (Recommended)
1. **Add Site to Cloudflare**
   - Go to Cloudflare Dashboard
   - Click **Add site**
   - Enter `dirtywine.se`
   - Choose Free plan

2. **Update Name Servers**
   - Copy Cloudflare name servers
   - Update name servers at Miss Hosting
   - Wait for DNS propagation (up to 48 hours)

3. **Configure Custom Domain**
   - In Pages: **Custom domains** → **Add domain**
   - Add `dirtywine.se` and `www.dirtywine.se`
   - Follow verification steps

4. **SSL/TLS Settings**
   - SSL/TLS encryption mode: **Full (Strict)**
   - Always Use HTTPS: **On**
   - HTTP/3: **On**

#### Option B: Quick DNS Pointing (Fallback)
1. **CNAME Record**
   - Create CNAME: `www` → `your-project.pages.dev`

2. **Root Domain**
   - Create ALIAS/ANAME: `@` → `your-project.pages.dev`
   - Or redirect: `@` → `https://www.dirtywine.se`

### 7. Post-Deployment Verification

#### A) Core Functionality
- [ ] Homepage loads correctly
- [ ] Product pages render (ISR working)
- [ ] Shop/collections work
- [ ] Checkout flow functional
- [ ] Admin access protected by middleware
- [ ] User profiles and reservations load

#### B) Performance Check
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals green
- [ ] Images optimized
- [ ] Static assets cached properly

#### C) Security Headers
- [ ] HTTPS enforced
- [ ] Security headers present (`_headers` file)
- [ ] No mixed content warnings

### 8. Monitoring & Maintenance

#### A) Cloudflare Analytics
- Monitor traffic in Cloudflare Dashboard
- Check Pages Functions usage
- Monitor error rates

#### B) Stripe Monitoring
- Check webhook delivery logs
- Monitor payment success rates
- Set up alerts for failures

#### C) Supabase Monitoring
- Monitor database performance
- Check RLS policies
- Monitor auth usage

### 9. Rollback Plan

#### Quick Rollback to Vercel
1. **Import to Vercel**
   - Connect GitHub repo to Vercel
   - Configure environment variables
   - Deploy

2. **Update DNS**
   - Point `www` and `@` to Vercel
   - Or update name servers to Vercel

3. **Test**
   - Verify all functionality works
   - Check payment processing

### 10. Troubleshooting

#### Common Issues

**Build Failures**
- Check Node.js version (should be 18)
- Verify all environment variables are set
- Check build logs for specific errors

**Functions Not Working**
- Verify `functions/` folder structure
- Check environment variables are marked as "Secret" where needed
- Review Functions logs in Cloudflare Dashboard

**DNS Issues**
- Wait for propagation (up to 48 hours)
- Check DNS records are correct
- Verify SSL certificate is issued

**Stripe Webhook Failures**
- Verify webhook URL is correct
- Check webhook secret matches
- Review webhook event logs

### 11. Performance Optimization

#### A) Caching Strategy
- Static assets: 1 year cache
- API responses: Appropriate TTL
- Images: Cloudflare Image Resizing

#### B) Edge Functions
- Consider moving more logic to Pages Functions
- Use Cloudflare KV for caching
- Implement rate limiting

#### C) Monitoring
- Set up Cloudflare Analytics
- Monitor Core Web Vitals
- Track conversion rates

## 🎯 Success Criteria

- [ ] Site loads at `https://dirtywine.se`
- [ ] All pages render correctly
- [ ] Checkout process works end-to-end
- [ ] Admin functions accessible
- [ ] Stripe webhooks receiving events
- [ ] SSL certificate valid
- [ ] Performance scores > 90
- [ ] No critical errors in logs

## 📞 Support Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Pages Functions Documentation](https://developers.cloudflare.com/pages/platform/functions/)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Next.js Static Export](https://nextjs.org/docs/advanced-features/static-html-export)
