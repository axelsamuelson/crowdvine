# Miss Hosting Node.js Deployment Plan

## Översikt
Miss Hosting Node.js deployment via cPanel med Passenger för Next.js SSR-applikationer.

## cPanel Setup

### 1. Node.js App Configuration
```bash
# In cPanel → Node.js Apps
# 1. Click "Create Application"
# 2. Configure:
#    - Node.js Version: 18.x
#    - Application Mode: Production
#    - Application Root: /home/wicazddt/crowdvine
#    - Application URL: dirtywine.se
#    - Application Startup File: server.js
```

### 2. Package.json Scripts
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev",
    "lint": "next lint"
  }
}
```

## Server.js Template

### 1. Create server.js
```javascript
// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
```

### 2. Update package.json
```json
{
  "main": "server.js",
  "scripts": {
    "build": "next build",
    "start": "node server.js",
    "dev": "next dev"
  }
}
```

## NPM Install via cPanel

### 1. Install Dependencies
```bash
# In cPanel → Node.js Apps
# 1. Select your application
# 2. Click "NPM Install"
# 3. Install packages:
npm install
```

### 2. Build Application
```bash
# In cPanel → Node.js Apps
# 1. Select your application
# 2. Click "Run Script"
# 3. Run: npm run build
```

## Environment Variables

### 1. cPanel Environment Variables
```bash
# In cPanel → Node.js Apps → Environment Variables
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
```

### 2. .env File (Alternative)
```bash
# Create .env file in application root
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
```

## Application Restart

### 1. Restart Process
```bash
# In cPanel → Node.js Apps
# 1. Select your application
# 2. Click "Restart App"
# 3. Wait for startup
```

### 2. Check Logs
```bash
# In cPanel → Node.js Apps
# 1. Select your application
# 2. Click "View Logs"
# 3. Check for errors
```

## Log Paths

### 1. Application Logs
```bash
# Log location
/home/wicazddt/crowdvine/logs/

# Log files
- app.log (application logs)
- error.log (error logs)
- access.log (access logs)
```

### 2. Log Monitoring
```bash
# Check logs via cPanel
# 1. Go to Node.js Apps
# 2. Select your application
# 3. Click "View Logs"
# 4. Monitor for errors
```

## Limitations & Workarounds

### 1. Memory Limitations
```bash
# Miss Hosting typically limits Node.js memory
# Workaround: Optimize application
# - Use streaming for large responses
# - Implement proper caching
# - Monitor memory usage
```

### 2. No Edge Network
```bash
# Miss Hosting doesn't provide edge network
# Workaround: Use CDN
# - Cloudflare (free)
# - AWS CloudFront
# - MaxCDN
```

### 3. No Automatic Scaling
```bash
# Miss Hosting doesn't auto-scale
# Workaround: Monitor performance
# - Use PM2 for process management
# - Implement health checks
# - Monitor resource usage
```

## CDN Setup (Recommended)

### 1. Cloudflare CDN
```bash
# 1. Add domain to Cloudflare
# 2. Change nameservers
# 3. Configure caching rules
# 4. Enable compression
```

### 2. Caching Rules
```bash
# Cache static assets
Cache-Control: public, max-age=31536000

# Cache API responses
Cache-Control: public, max-age=3600
```

## Performance Optimization

### 1. PM2 Process Management
```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [{
    name: 'crowdvine',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# Start with PM2
pm2 start ecosystem.config.js
```

### 2. Compression
```javascript
// server.js - Add compression
const compression = require('compression');
const express = require('express');

const app = express();
app.use(compression());
```

## Security Configuration

### 1. Headers
```javascript
// server.js - Add security headers
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
```

### 2. Rate Limiting
```javascript
// server.js - Add rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

## Monitoring & Health Checks

### 1. Health Check Endpoint
```javascript
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
```

### 2. Error Monitoring
```javascript
// server.js - Add error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
```

## Troubleshooting

### Common Issues
1. **Build Failures:** Check Node.js version compatibility
2. **Memory Issues:** Optimize application, use PM2
3. **Performance Issues:** Add CDN, optimize caching
4. **SSL Issues:** Configure SSL in cPanel

### Debug Commands
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check application status
pm2 status

# Check logs
pm2 logs crowdvine
```

## Go-live Checklist

### Pre-deployment
- [ ] Test build locally
- [ ] Set all environment variables
- [ ] Test all API endpoints
- [ ] Verify middleware functionality
- [ ] Test image optimization

### Deployment
- [ ] Create Node.js app in cPanel
- [ ] Upload application files
- [ ] Install dependencies
- [ ] Build application
- [ ] Configure environment variables
- [ ] Restart application

### Post-deployment
- [ ] Test all functionality
- [ ] Monitor logs
- [ ] Check performance
- [ ] Verify all functionality
- [ ] Set up monitoring

## Cost Considerations

### Miss Hosting Costs
```yaml
Hosting: ~$5-10/month
Domain: ~$10/year
SSL: Usually included
Bandwidth: Usually unlimited
```

### Additional Costs
```yaml
CDN: Free (Cloudflare)
Monitoring: Free (basic)
Backup: Usually included
```

## Support Resources

### Miss Hosting Support
- [Miss Hosting Documentation](https://misshosting.com/support)
- [cPanel Documentation](https://docs.cpanel.net/)
- [Node.js on cPanel](https://docs.cpanel.net/cpanel/software/nodejs-apps/)

### Next.js Resources
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
