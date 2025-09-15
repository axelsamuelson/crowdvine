# Vercel Deployment Plan

## Översikt
Vercel är det enklaste alternativet för Next.js applikationer med perfekt integration och minimal konfiguration.

## Import från GitHub

### 1. Vercel Setup
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from current directory
vercel --prod
```

### 2. GitHub Integration
```bash
# 1. Push to GitHub
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main

# 2. Connect in Vercel Dashboard
# - Go to Vercel Dashboard
# - Click "Import Project"
# - Select GitHub repository
# - Configure build settings
```

## Environment Variables

### 1. Server-side Variables
```bash
# In Vercel Dashboard → Settings → Environment Variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
```

### 2. Public Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Build Configuration

### 1. Build Settings
```yaml
# In Vercel Dashboard
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Node.js Version: 18.x
```

### 2. next.config.mjs (No Changes Needed)
```javascript
const nextConfig = {
  experimental: {
    inlineCss: true,
    useCache: true,
    clientSegmentCache: true,
  },
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zylq-002.dx.commercecloud.salesforce.com",
      },
      {
        protocol: "https",
        hostname: "edge.disstg.commercecloud.salesforce.com",
      },
    ],
  },
};

export default nextConfig;
```

## ISR/Edge Configuration

### 1. ISR Settings
```typescript
// app/product/[handle]/page.tsx
export const revalidate = 60; // 1 minute

export async function generateStaticParams() {
  // Generate static params for products
  const products = await getProducts({ limit: 100 });
  return products.map((product) => ({
    handle: product.handle,
  }));
}
```

### 2. Edge Runtime (Optional)
```typescript
// app/api/edge-example/route.ts
export const runtime = 'edge';

export async function GET() {
  return new Response('Hello from Edge Runtime');
}
```

## Image Optimization

### 1. Vercel Image Optimization
```typescript
// components/optimized-image.tsx
import Image from 'next/image';

export function OptimizedImage({ src, alt, width, height }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}
```

### 2. Remote Patterns
```javascript
// next.config.mjs
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "zylq-002.dx.commercecloud.salesforce.com",
    },
    {
      protocol: "https",
      hostname: "edge.disstg.commercecloud.salesforce.com",
    },
  ],
}
```

## Headers & Rewrites

### 1. Headers Configuration
```javascript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};
```

### 2. Rewrites Configuration
```javascript
// next.config.mjs
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};
```

## DNS Instructions for Miss Hosting

### 1. Vercel Domain Setup
```bash
# 1. Add domain in Vercel Dashboard
# - Go to Project Settings
# - Click "Domains"
# - Add "dirtywine.se"
# - Add "www.dirtywine.se"

# 2. Get Vercel DNS records
# - A record: @ → 76.76.19.61
# - CNAME: www → cname.vercel-dns.com
```

### 2. Miss Hosting DNS Update
```bash
# In Miss Hosting cPanel:
# 1. Go to DNS Zone Editor
# 2. Update A record for @ to: 76.76.19.61
# 3. Update CNAME for www to: cname.vercel-dns.com
# 4. Wait for DNS propagation (24-48 hours)
```

## SSL Configuration

### Automatic SSL
```bash
# Vercel automatically provides SSL
# - Automatic certificate generation
# - HTTP/2 support
# - Automatic renewal
# - HSTS headers
```

### SSL Settings
```yaml
# In Vercel Dashboard
SSL: Automatic
Force HTTPS: Enabled
HSTS: Enabled
```

## Previews & Rollbacks

### 1. Preview Deployments
```bash
# Every push to GitHub creates a preview
git push origin feature-branch

# Preview URL: https://your-project-git-feature-branch.vercel.app
```

### 2. Rollback Process
```bash
# 1. Go to Vercel Dashboard
# 2. Click on deployment
# 3. Click "Promote to Production"
# 4. Or use CLI:
vercel --prod --force
```

## Performance Optimization

### 1. Caching Strategy
```typescript
// app/api/cached-data/route.ts
export const revalidate = 3600; // 1 hour

export async function GET() {
  const data = await fetchData();
  return Response.json(data);
}
```

### 2. Bundle Analysis
```bash
# Install bundle analyzer
npm install -g @next/bundle-analyzer

# Analyze bundle
ANALYZE=true npm run build
```

## Monitoring & Analytics

### 1. Vercel Analytics
```bash
# Install Vercel Analytics
npm install @vercel/analytics

# Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Custom Monitoring
```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}
```

## Troubleshooting

### Common Issues
1. **Build Failures:** Check Node.js version compatibility
2. **Environment Variables:** Verify all variables are set
3. **DNS Issues:** Wait for propagation (24-48 hours)
4. **SSL Issues:** Check domain configuration

### Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://nextjs.org/docs/deployment#vercel)
- [Vercel CLI](https://vercel.com/docs/cli)

## Cost Considerations

### Hobby Plan (Free)
```yaml
Bandwidth: 100GB/month
Function Invocations: 100/day
Build Time: 6 hours/month
```

### Pro Plan ($20/month)
```yaml
Bandwidth: 1TB/month
Function Invocations: 1M/month
Build Time: Unlimited
```

## Go-live Checklist

### Pre-deployment
- [ ] Test build locally
- [ ] Set all environment variables
- [ ] Test all API endpoints
- [ ] Verify middleware functionality
- [ ] Test image optimization

### Deployment
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Deploy first version
- [ ] Test all functionality
- [ ] Verify SSL certificate

### Post-deployment
- [ ] Update DNS records
- [ ] Wait for DNS propagation
- [ ] Test from different locations
- [ ] Monitor performance
- [ ] Verify all functionality
