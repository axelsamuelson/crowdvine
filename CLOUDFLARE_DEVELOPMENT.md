# Cloudflare Pages Development Environment

## Översikt

Denna branch (`cloudflare-development`) är konfigurerad för utveckling med Cloudflare Pages kompatibilitet. Den behåller alla funktioner från main branch men är optimerad för Cloudflare Pages deployment.

## Konfiguration

### Next.js Config
- **Development**: SSR med alla funktioner aktiverade
- **Production**: Static export för Cloudflare Pages
- **Linting**: Aktiverat för development, inaktiverat för production builds

### Pages Functions
Alla API endpoints är implementerade som Cloudflare Pages Functions:

- `functions/_middleware.ts` - Access control (utvecklingsläge)
- `functions/api/health.ts` - Health check
- `functions/api/auth/*` - Authentication endpoints
- `functions/api/checkout/*` - Checkout endpoints
- `functions/api/stripe/*` - Stripe webhooks
- `functions/api/upload/*` - File upload
- `functions/api/admin/*` - Admin endpoints
- `functions/api/user/*` - User endpoints

## Utveckling

### Lokal utveckling
```bash
npm run dev
```

### Cloudflare Pages utveckling
```bash
npm run dev:cloudflare
```

### Production build (för Cloudflare Pages)
```bash
npm run build:cloudflare
```

## Deployment

### Development Environment
- **Branch**: `cloudflare-development`
- **URL**: `https://cloudflare-development.crowdvine.pages.dev`
- **Funktioner**: Alla funktioner aktiverade med mock data

### Production Environment
- **Branch**: `cloudflare-preview` (minimal version)
- **URL**: `https://crowdvine.pages.dev`
- **Funktioner**: Minimal version för production

## Miljövariabler

Se `.env.example` för alla nödvändiga miljövariabler.

## Funktioner

### Development Features
- ✅ Alla admin funktioner
- ✅ Checkout och betalningar (mock)
- ✅ File upload (mock)
- ✅ Authentication (mock)
- ✅ User reservations (mock)
- ✅ Health checks

### Production Features
- ✅ Static export
- ✅ Pages Functions
- ✅ Minimal UI
- ✅ Health checks

## Nästa steg

1. **Utveckla** i `cloudflare-development` branch
2. **Testa** lokalt med `npm run dev`
3. **Deploya** till Cloudflare Pages development environment
4. **När klar** - merge till `cloudflare-preview` för production
