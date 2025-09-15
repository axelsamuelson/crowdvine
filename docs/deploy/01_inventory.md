# 01 - Projektinventering

## Stack & Konfiguration

### Framework & Version
- **Framework:** Next.js 15.2.4 (App Router)
- **React:** 19.x
- **TypeScript:** 5.x
- **Node Version:** Ingen explicit engines-specifikation i package.json

### Build Scripts
```json
{
  "build": "next build",
  "dev": "next dev", 
  "start": "next start",
  "lint": "next lint",
  "seed": "tsx scripts/seed.ts",
  "migrate": "tsx scripts/run-migration.ts"
}
```

### Next.js Konfiguration
- **Output:** Standard `.next/` (ingen standalone eller export)
- **Images:** `unoptimized: true` (hindrar statisk export)
- **Experimental:** `inlineCss`, `useCache`, `clientSegmentCache`
- **Remote Patterns:** Salesforce Commerce Cloud bilder

### Middleware & Edge Runtime
- **Middleware:** Ja (`middleware.ts`) - access control med cookies
- **Edge Runtime:** Nej (ingen explicit runtime: 'edge')
- **Matcher:** `['/((?!api/stripe/webhook).*)']`

## Rendering & Routes

### SSR/SSG/ISR Status
- **SSR:** ❌ Ingen `getServerSideProps` hittad
- **SSG:** ✅ `generateStaticParams` i produkt-sidor
- **ISR:** ✅ `revalidate: 60` (1 minut) på produkt-sidor
- **Server Actions:** ❌ Ingen `serverActions` hittad

### Dynamiska Routes
- `/product/[handle]` - med `generateStaticParams`
- `/shop/[collection]` - med `generateStaticParams`
- `/admin/*` - dynamiska admin-routes
- `/api/*` - 52 API endpoints

### Cache Policy
- **ISR:** 60 sekunder på produkt-sidor
- **Static Generation:** Produkter genereras vid build-time

## API & Backend

### API Routes (52 endpoints)
**Kritiska för funktionalitet:**
- `/api/auth/*` - Autentisering
- `/api/checkout/*` - Betalning & reservations
- `/api/stripe/*` - Stripe integration
- `/api/user/*` - Användardata
- `/api/admin/*` - Admin-funktioner
- `/api/crowdvine/*` - Produktdata från Shopify

**Externa tjänster:**
- **Supabase:** Databas, auth, RLS policies
- **Stripe:** Betalningar, webhooks
- **Shopify:** Produktdata (Commerce Cloud)
- **Nodemailer:** E-postutskick

### Server-krav
- **Long-running:** Stripe webhooks, e-postutskick
- **Websockets/SSE:** Nej
- **Cron/Queues:** Nej (men potentiellt för e-post)
- **Filuppladdningar:** Ja (`/api/upload/`)

## Bygg & Artefakter

### Output Struktur
- **Standard Next.js:** `.next/` directory
- **Storlek:** ~50MB+ (med alla dependencies)
- **Binärer:** Node.js runtime krävs
- **Images:** Unoptimized (hindrar statisk export)

### Dependencies
- **Tung:** Radix UI, Supabase, Stripe, Shopify
- **Build Size:** Stor på grund av alla UI-komponenter
- **Dev Dependencies:** TypeScript, ESLint, Prettier

## Säkerhet & Konfiguration

### Miljövariabler
**Server-side (kritiska):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DATABASE_URL`

**Public:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Säkerhetsfunktioner
- **CORS:** Hanteras av Next.js
- **Headers:** Standard Next.js headers
- **Cookies:** Access control via `cv-access` cookie
- **RLS:** Supabase Row Level Security

## Trafik & Mål

### Förväntad Trafik
- **Typ:** E-handel (vinbutik)
- **Geografi:** Sverige (primärt)
- **TTFB:** Kritiskt för e-handel
- **Bildoptimering:** Viktigt för produktbilder

### Prestandakrav
- **Caching:** Kritiskt för produktdata
- **Bildoptimering:** Produktbilder från Salesforce
- **Database:** Supabase med RLS policies

## Blockers för Statisk Export

### Kritiska Blockers
1. **Images unoptimized:** `unoptimized: true` i next.config.mjs
2. **API Routes:** 52 endpoints kräver server
3. **Middleware:** Access control kräver server
4. **Supabase:** Server-side operations
5. **Stripe:** Webhooks kräver server
6. **E-post:** Nodemailer kräver server

### Mindre Blockers
1. **Dynamic imports:** Potentiella server-side imports
2. **Environment variables:** Server-side secrets
3. **File uploads:** `/api/upload/` endpoint

## Sammanfattning

**Applikationstyp:** Full-stack Next.js e-handelsapp med:
- Supabase backend
- Stripe betalningar  
- Shopify produktdata
- Admin-panel
- Användarautentisering
- Reservationssystem

**Deployment-krav:** Server-side rendering krävs för:
- API endpoints
- Middleware access control
- Supabase server operations
- Stripe webhooks
- E-postutskick

**Statisk export:** ❌ Inte möjligt utan större refaktorering

## Snabbscripts & Kontroller

### package.json Analys
```bash
cat package.json | head -20
```
**Resultat:**
- **Name:** "my-v0-project" 
- **Version:** "0.1.0"
- **Private:** true
- **Scripts:** build, dev, start, lint, seed, migrate
- **Dependencies:** @emotion, @hookform/resolvers, @joycostudio/v0-setup, @radix-ui/*

### next.config.mjs Analys
```bash
cat next.config.mjs
```
**Resultat:**
- **Experimental:** inlineCss, useCache, clientSegmentCache enabled
- **Images:** unoptimized: true (blocker för statisk export)
- **Formats:** ["image/avif", "image/webp"]
- **Remote Patterns:** Salesforce Commerce Cloud hosts
- **Export Support:** ❌ Ingen `output: 'export'` hittad

### SSR Indicators
```bash
grep -R "getServerSideProps\|getStaticProps\|generateStaticParams" -n
```
**Resultat:**
- **generateStaticParams:** ✅ Hittad i produkt-sidor
- **getServerSideProps:** ❌ Ingen hittad
- **getStaticProps:** ❌ Ingen hittad

### Export Support
```bash
grep -R "output.*export\|next export" -n
```
**Resultat:**
- **Static Export:** ❌ Ingen konfiguration hittad
- **Output Mode:** Standard Next.js build (.next/)

### Middleware Analys
```bash
cat middleware.ts
```
**Resultat:**
- **Middleware:** ✅ Present med access control
- **Edge Runtime:** Implicit (NextResponse usage)
- **Matcher:** `['/((?!api/stripe/webhook).*)']`
- **Public Routes:** Definierade i PUBLIC array

### API Routes Inventory
```bash
find app/api -name "route.ts" | wc -l
```
**Resultat:**
- **API Endpoints:** 52+ routes
- **Kritiska:** auth, checkout, stripe, user, admin, crowdvine
- **Server Requirements:** ✅ Kräver Node.js server

### Sammanfattning av Snabbscripts
1. **Build Command:** `next build` (standard)
2. **Start Command:** `next start` (standard)
3. **Export Support:** ❌ Inte konfigurerad
4. **SSR Requirements:** ✅ Middleware + API routes
5. **Static Generation:** ✅ Delvis (produkter med ISR)
6. **Server Dependencies:** ✅ Supabase, Stripe, Nodemailer
