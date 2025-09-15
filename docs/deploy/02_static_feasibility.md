# 02 - Statisk-möjlighet & Åtgärdsplan

## Statisk Export Möjlighet

### ❌ Fullständig Statisk Export: INTE MÖJLIG

**Huvudblockers:**
1. **52 API endpoints** - Kräver server runtime
2. **Middleware access control** - Server-side cookie handling
3. **Supabase server operations** - Service role key operations
4. **Stripe webhooks** - Server-side webhook handling
5. **Image optimization disabled** - `unoptimized: true`
6. **File uploads** - `/api/upload/` endpoint

## Hybrid-lösning: ISR + Minimal Server

### ✅ Möjlig Kompromiss: ISR för Frontend + Edge Functions för Backend

**Frontend (Statisk/ISR):**
- ✅ Produktsidor (`generateStaticParams` + `revalidate: 60`)
- ✅ Shop-sidor (`generateStaticParams`)
- ✅ Statiska sidor (om, kontakt, etc.)

**Backend (Server/Edge Functions):**
- 🔄 API endpoints → Edge Functions
- 🔄 Middleware → Edge Functions
- 🔄 Supabase operations → Edge Functions
- 🔄 Stripe webhooks → Edge Functions

## Åtgärdsplan för Hybrid-lösning

### Steg 1: Aktivera Statisk Export för Frontend
```javascript
// next.config.mjs
const nextConfig = {
  output: 'export', // Aktivera statisk export
  trailingSlash: true,
  images: {
    unoptimized: true, // Behåll för statisk export
  },
  // Ta bort experimental features som inte fungerar med export
  experimental: {
    // inlineCss: true, // Ta bort
    // useCache: true,   // Ta bort
    // clientSegmentCache: true, // Ta bort
  }
};
```

### Steg 2: Isolera Server-side Funktioner
**Flytta till Edge Functions:**
- `/api/auth/*` → Supabase Auth Edge Functions
- `/api/checkout/*` → Stripe Edge Functions  
- `/api/admin/*` → Admin Edge Functions
- `/api/user/*` → User Edge Functions

### Steg 3: Middleware Refaktorering
```typescript
// middleware.ts - Flytta till Edge Function
export const config = {
  runtime: 'edge',
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

### Steg 4: Supabase Client-side Operations
**Ersätt server-side Supabase med client-side:**
```typescript
// Istället för server-side service role
const supabase = createClientComponentClient()

// För admin-operationer, använd RLS policies
// eller flytta till Edge Functions
```

## Konkreta Kodändringar

### 1. Aktivera Statisk Export
```diff
// next.config.mjs
const nextConfig = {
+ output: 'export',
+ trailingSlash: true,
  experimental: {
-   inlineCss: true,
-   useCache: true,
-   clientSegmentCache: true,
+   // Ta bort experimental features för export
  },
  images: {
    unoptimized: true,
  },
};
```

### 2. Flytta API Routes till Edge Functions
```typescript
// api/auth/login/route.ts → Edge Function
export const config = {
  runtime: 'edge',
};

export async function POST(request: Request) {
  // Flytta Supabase auth till client-side
  // eller använd Edge Function
}
```

### 3. Middleware till Edge Function
```typescript
// middleware.ts
export const config = {
  runtime: 'edge',
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

## Alternativ: Minimal Server + CDN

### Om Edge Functions inte är möjliga:

**Behåll minimal server för:**
- API endpoints (52 st)
- Middleware access control
- Supabase server operations
- Stripe webhooks

**Använd CDN för:**
- Statiska filer
- Bildoptimering
- Caching

## Checklista för Hybrid-lösning

### ✅ Möjligt att implementera:
- [ ] Aktivera `output: 'export'` i next.config.mjs
- [ ] Ta bort experimental features
- [ ] Flytta API routes till Edge Functions
- [ ] Refaktorera middleware till Edge Function
- [ ] Ersätt server-side Supabase med client-side
- [ ] Implementera RLS policies för admin-operationer

### ❌ Kräver större refaktorering:
- [ ] Stripe webhook handling
- [ ] File upload functionality
- [ ] E-postutskick (Nodemailer)
- [ ] Admin-panel server-side operations

## Rekommendation

**För snabb deployment:** Behåll SSR med minimal server
**För optimal prestanda:** Implementera hybrid-lösning med Edge Functions

**Tidsram:**
- Minimal server: 1-2 timmar
- Hybrid-lösning: 1-2 dagar
- Fullständig statisk: 1-2 veckor (inte rekommenderat)

## Sammanfattning

**Statisk export:** ❌ Inte möjligt utan större refaktorering
**Hybrid-lösning:** ✅ Möjligt med Edge Functions
**Minimal server:** ✅ Snabbast väg till production

**Rekommendation:** Börja med minimal server, migrera till Edge Functions senare för bättre prestanda.
