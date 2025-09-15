# Cloudflare Pages Deployment Plan

## Översikt
Cloudflare Pages är det optimala valet för denna Next.js applikation med bästa prestanda globalt och lägsta kostnad.

## Build Command & Output Dir

### Build Configuration
```bash
# Build command
npm run build

# Output directory
out/
```

### next.config.mjs Updates
```javascript
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
  // Remove experimental features that don't work with export
  experimental: {
    // inlineCss: true, // Remove
    // useCache: true,   // Remove
    // clientSegmentCache: true, // Remove
  }
};

export default nextConfig;
```

## GitHub Integration

### 1. Connect Repository
```bash
# 1. Push to GitHub
git add .
git commit -m "Prepare for Cloudflare Pages deployment"
git push origin main

# 2. Connect in Cloudflare Dashboard
# - Go to Cloudflare Pages
# - Click "Connect to Git"
# - Select GitHub repository
# - Configure build settings
```

### 2. Build Settings
```yaml
# Build command
npm run build

# Build output directory
out

# Root directory
/

# Node.js version
18
```

## Pages Functions (Backend API)

### 1. API Routes Migration
Skapa `functions/api/` mapp för Edge Functions:

```typescript
// functions/api/auth/login.ts
export async function onRequest(context: EventContext) {
  const { request, env } = context;
  
  // Handle Supabase auth
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );
  
  // Process login request
  const { email, password } = await request.json();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return new Response(JSON.stringify({ data, error }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 2. Environment Variables
```bash
# In Cloudflare Pages Dashboard
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Middleware Edge Function
```typescript
// functions/_middleware.ts
export async function onRequest(context: EventContext) {
  const { request } = context;
  
  // Check access cookie
  const cookie = request.headers.get('Cookie');
  const hasAccess = cookie?.includes('cv-access=1');
  
  if (!hasAccess) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/access-request'
      }
    });
  }
  
  return context.next();
}
```

## DNS Instructions for Miss Hosting

### 1. Cloudflare Setup
```bash
# 1. Add domain to Cloudflare
# - Go to Cloudflare Dashboard
# - Add site: dirtywine.se
# - Change nameservers to Cloudflare

# 2. Configure DNS records
# - A record: @ → 192.0.2.1 (Cloudflare IP)
# - CNAME: www → dirtywine.se
```

### 2. Miss Hosting DNS Update
```bash
# In Miss Hosting cPanel:
# 1. Go to DNS Zone Editor
# 2. Update A record for @ to point to Cloudflare
# 3. Update CNAME for www to point to Cloudflare
# 4. Wait for DNS propagation (24-48 hours)
```

## SSL/HTTPS Setup

### Automatic SSL
```bash
# Cloudflare automatically provides SSL
# - Full SSL (Strict) mode
# - Automatic certificate renewal
# - HTTP/3 support
# - QUIC protocol
```

### SSL Configuration
```yaml
# In Cloudflare Dashboard
SSL/TLS Mode: Full (Strict)
Edge Certificates: Always Use HTTPS
HTTP Strict Transport Security: Enabled
```

## Cache Headers & Image Optimization

### 1. Cache Rules
```typescript
// functions/_headers.ts
export async function onRequest(context: EventContext) {
  const { request, next } = context;
  const response = await next();
  
  // Set cache headers
  response.headers.set('Cache-Control', 'public, max-age=31536000');
  response.headers.set('CDN-Cache-Control', 'public, max-age=31536000');
  
  return response;
}
```

### 2. Image Optimization
```typescript
// functions/api/images/[...path].ts
export async function onRequest(context: EventContext) {
  const { request } = context;
  
  // Cloudflare Image Resizing
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');
  
  if (imageUrl) {
    // Use Cloudflare Image Resizing
    const resizedUrl = `https://imagedelivery.net/${imageUrl}`;
    return Response.redirect(resizedUrl);
  }
  
  return new Response('Image not found', { status: 404 });
}
```

## Redirects & Rewrites

### 1. Redirects
```typescript
// functions/_redirects.ts
export async function onRequest(context: EventContext) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Handle redirects
  if (url.pathname === '/old-path') {
    return Response.redirect('/new-path', 301);
  }
  
  return context.next();
}
```

### 2. Rewrites
```typescript
// functions/_rewrites.ts
export async function onRequest(context: EventContext) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Handle rewrites
  if (url.pathname.startsWith('/api/')) {
    // Rewrite to Edge Function
    return context.next();
  }
  
  return context.next();
}
```

## Environment Variables

### Server-side (Edge Functions)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
```

### Public (Client-side)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Go-live Checklist

### Pre-deployment
- [ ] Test statisk export lokalt
- [ ] Konfigurera alla Edge Functions
- [ ] Sätta alla miljövariabler
- [ ] Testa alla API endpoints
- [ ] Verifiera middleware funktionalitet

### Deployment
- [ ] Connect GitHub repository
- [ ] Konfigurera build settings
- [ ] Deploy första versionen
- [ ] Testa alla funktioner
- [ ] Verifiera SSL-certifikat

### Post-deployment
- [ ] Uppdatera DNS records
- [ ] Vänta på DNS propagation
- [ ] Testa från olika platser
- [ ] Monitora prestanda
- [ ] Verifiera alla funktioner

### Rollback Plan
```bash
# If Cloudflare Pages doesn't work:
# 1. Deploy to Vercel as fallback
vercel --prod

# 2. Update DNS to point to Vercel
# 3. Test all functionality
# 4. Monitor performance
```

## Performance Optimization

### 1. Edge Caching
```typescript
// Cache static assets for 1 year
Cache-Control: public, max-age=31536000

// Cache API responses for 1 hour
Cache-Control: public, max-age=3600
```

### 2. Image Optimization
```typescript
// Use Cloudflare Image Resizing
const imageUrl = `https://imagedelivery.net/${imageId}/w=800,h=600,format=webp`;
```

### 3. Compression
```typescript
// Enable Brotli compression
Content-Encoding: br
```

## Monitoring & Analytics

### 1. Cloudflare Analytics
```bash
# Available in Cloudflare Dashboard
# - Page views
# - Bandwidth usage
# - Cache hit ratio
# - Error rates
```

### 2. Custom Monitoring
```typescript
// functions/api/health.ts
export async function onRequest() {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Troubleshooting

### Common Issues
1. **Build Failures:** Check Node.js version compatibility
2. **API Errors:** Verify Edge Function syntax
3. **DNS Issues:** Wait for propagation (24-48 hours)
4. **SSL Issues:** Check SSL mode in Cloudflare Dashboard

### Support Resources
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Next.js Static Export Guide](https://nextjs.org/docs/advanced-features/static-html-export)
