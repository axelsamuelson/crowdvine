# Cloudflare Pages Deployment Checklist

## ✅ Pre-Deployment Checklist

- [x] PR merged to main branch
- [x] Build passes locally (`npm run build`)
- [x] `out/` directory generated
- [x] Functions structure in place
- [x] Environment variables documented
- [x] Large files removed from git history

## 🚀 Deployment Steps

### 1. Cloudflare Pages Setup
- [ ] Go to Cloudflare Dashboard → Pages
- [ ] Connect to Git → Select `crowdvine` repository
- [ ] Choose `main` branch
- [ ] Configure build settings:
  - [ ] Build command: `npm ci --legacy-peer-deps && npm run build`
  - [ ] Output directory: `out`
  - [ ] Node.js version: 18
  - [ ] Pages Functions: Enabled

### 2. Environment Variables
- [ ] **Server-side (Private):**
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `DATABASE_URL` (if needed)
  - [ ] `NODEMAILER_EMAIL`
  - [ ] `NODEMAILER_PASSWORD`
  - [ ] `NODEMAILER_HOST`
  - [ ] `NODEMAILER_PORT`
  - [ ] `GEOCODING_API_KEY`
  - [ ] `CROWDVINE_API_KEY`

- [ ] **Client-side (Public):**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `NEXT_PUBLIC_BASE_URL`

### 3. First Deploy
- [ ] Click "Save and Deploy"
- [ ] Wait for build completion (2-5 minutes)
- [ ] Note deployment URL: `https://your-project.pages.dev`

### 4. Smoke Testing
- [ ] **Health Check:** `GET /api/health` → 200
- [ ] **Product Page:** `GET /product/sample-wine-1` → HTML
- [ ] **Collection Page:** `GET /shop/all-wines` → HTML
- [ ] **Admin Access:** Redirects to access request
- [ ] **Checkout Page:** Loads without errors
- [ ] **Payment Intent:** Test creation (if Stripe configured)

### 5. Stripe Webhook Setup
- [ ] Go to Stripe Dashboard → Webhooks
- [ ] Add endpoint: `https://your-project.pages.dev/api/stripe/webhook`
- [ ] Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- [ ] Copy webhook secret
- [ ] Add `STRIPE_WEBHOOK_SECRET` to Pages environment
- [ ] Test webhook delivery

### 6. DNS Configuration

#### Option A: Full Cloudflare DNS (Recommended)
- [ ] Add site `dirtywine.se` to Cloudflare
- [ ] Update name servers at Miss Hosting
- [ ] Wait for DNS propagation (up to 48 hours)
- [ ] Add custom domains in Pages: `dirtywine.se`, `www.dirtywine.se`
- [ ] Configure SSL/TLS: Full (Strict)
- [ ] Enable Always Use HTTPS
- [ ] Enable HTTP/3

#### Option B: Quick DNS Pointing
- [ ] Create CNAME: `www` → `your-project.pages.dev`
- [ ] Create ALIAS: `@` → `your-project.pages.dev`
- [ ] Or redirect: `@` → `https://www.dirtywine.se`

### 7. Post-Deployment Verification
- [ ] **Core Functionality:**
  - [ ] Homepage loads
  - [ ] Product pages render (ISR working)
  - [ ] Shop/collections work
  - [ ] Checkout flow functional
  - [ ] Admin access protected
  - [ ] User profiles load

- [ ] **Performance:**
  - [ ] Lighthouse score > 90
  - [ ] Core Web Vitals green
  - [ ] Images optimized
  - [ ] Static assets cached

- [ ] **Security:**
  - [ ] HTTPS enforced
  - [ ] Security headers present
  - [ ] No mixed content warnings

### 8. Monitoring Setup
- [ ] Cloudflare Analytics enabled
- [ ] Pages Functions usage monitoring
- [ ] Stripe webhook delivery monitoring
- [ ] Supabase performance monitoring
- [ ] Error rate alerts configured

## 🔧 Troubleshooting

### Build Issues
- [ ] Check Node.js version (18)
- [ ] Verify environment variables
- [ ] Review build logs

### Functions Issues
- [ ] Verify `functions/` structure
- [ ] Check environment variables marked as "Secret"
- [ ] Review Functions logs

### DNS Issues
- [ ] Wait for propagation (48 hours)
- [ ] Verify DNS records
- [ ] Check SSL certificate

### Stripe Issues
- [ ] Verify webhook URL
- [ ] Check webhook secret
- [ ] Review webhook logs

## 🎯 Success Criteria

- [ ] Site accessible at `https://dirtywine.se`
- [ ] All pages render correctly
- [ ] Checkout process works end-to-end
- [ ] Admin functions accessible
- [ ] Stripe webhooks receiving events
- [ ] SSL certificate valid
- [ ] Performance scores > 90
- [ ] No critical errors

## 🚨 Rollback Plan

### Quick Rollback to Vercel
- [ ] Import repo to Vercel
- [ ] Configure environment variables
- [ ] Deploy to Vercel
- [ ] Update DNS to point to Vercel
- [ ] Test functionality

## 📞 Support Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Pages Functions Docs](https://developers.cloudflare.com/pages/platform/functions/)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Next.js Static Export](https://nextjs.org/docs/advanced-features/static-html-export)

---

**Deployment URL:** `https://your-project.pages.dev`
**Production URL:** `https://dirtywine.se`
**Status:** Ready for deployment ✅
