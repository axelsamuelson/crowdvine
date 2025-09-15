# 05 - Cloudflare Pages Readiness

## Verifiering av Nuläge

### Bekräftat från Inventering
- **Framework:** Next.js 15.2.4 (App Router)
- **API Routes:** 52+ endpoints kräver server
- **Middleware:** Access control med cookies (`cv-access`)
- **Externa tjänster:** Supabase, Stripe, Nodemailer
- **Filuppladdning:** `/api/upload/` endpoint
- **Bilder:** `unoptimized: true` (blocker för statisk export)

## Server-krävande Endpoints

### Kritiska (MÅSTE ha backend)
1. **Autentisering**
   - `/api/auth/login` - Supabase auth
   - `/api/auth/logout` - Session cleanup
   - `/api/auth/callback` - OAuth callbacks

2. **Betalning & Reservations**
   - `/api/checkout/confirm` - Stripe PaymentIntent
   - `/api/checkout/create-payment-intent` - Stripe integration
   - `/api/stripe/webhook` - Webhook verification

3. **Admin-funktioner**
   - `/api/admin/*` - Alla admin endpoints
   - `/api/admin/wines` - Vinhantering
   - `/api/admin/users` - Användarhantering

4. **Filuppladdning**
   - `/api/upload/` - Filuppladdning till Supabase Storage

5. **Användardata**
   - `/api/user/reservations` - Reservationsdata
   - `/api/user/profile` - Profilhantering

### Mindre kritiska (kan vara stubs)
- `/api/health` - Health check
- `/api/debug/*` - Debug endpoints
- `/api/crowdvine/*` - Produktdata (kan cachas)

## SSG/ISR-bara Sidor

### Statiska sidor (kan exporteras)
- `/` - Hemsida
- `/shop` - Butikssida
- `/boxes` - Vinboxar
- `/access-request` - Åtkomstförfrågan
- `/about` - Om oss
- `/contact` - Kontakt

### ISR-sidor (kan exporteras med revalidation)
- `/product/[handle]` - Produktsidor (med `generateStaticParams`)
- `/shop/[collection]` - Kollektionssidor

### Dynamiska sidor (kräver server)
- `/admin/*` - Alla admin-sidor
- `/profile/*` - Användarprofiler
- `/checkout/*` - Checkout-flöde

## Rekommenderad Strategi

### Hybrid Approach: SSG + Pages Functions
1. **Statisk export** för storefront-sidor (hem, shop, produkter)
2. **Pages Functions** för API endpoints och middleware
3. **Client-side rendering** för dynamiska delar (admin, profil)

### Implementationsplan
1. Konfigurera `output: 'export'` för statiska sidor
2. Skapa Pages Functions för kritiska API endpoints
3. Implementera middleware som Pages Function
4. Hantera bilder via Cloudflare Images eller extern CDN

## Blockers för Full Statisk Export

### Kritiska Blockers
1. **API Routes:** 52+ endpoints kräver server
2. **Middleware:** Access control kräver server
3. **Supabase:** Server-side operations
4. **Stripe:** Webhooks kräver server
5. **Filuppladdning:** Kräver server-side processing

### Lösningar
1. **Pages Functions** för API endpoints
2. **Cloudflare Workers** för middleware
3. **Supabase Edge Functions** för komplexa operationer
4. **Stripe Webhooks** via Cloudflare Workers
5. **R2/Supabase Storage** för filuppladdning

## Blockers för Deployment

### Next.js 15 Kompatibilitetsproblem
1. **API Route Parameters**: Next.js 15 kräver `Promise<{ id: string }>` istället för `{ id: string }`
2. **Page Props**: `searchParams` måste vara `Promise<{ [key: string]: string | string[] | undefined }>`
3. **Motion Components**: Framer Motion kompatibilitetsproblem med Next.js 15
4. **TypeScript Errors**: Flera komponenter har TypeScript-fel som blockerar build

### Lösningar
1. **Uppdatera alla API routes** med korrekt parameter-typing
2. **Fixa page components** med Promise-baserade props
3. **Uppdatera Motion components** eller temporärt inaktivera animationer
4. **Fixa TypeScript-fel** i alla komponenter

## Nästa Steg

1. ✅ Konfigurera Next.js för statisk export
2. ✅ Skapa Pages Functions struktur
3. ✅ Implementera middleware som Pages Function
4. ✅ Skapa stub-funktioner för kritiska endpoints
5. 🔄 Testa lokal build och export (blockerad av Next.js 15-problem)
6. ⏳ Konfigurera Cloudflare Pages
7. ⏳ Migrera DNS till Cloudflare
