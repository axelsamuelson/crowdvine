# Production vs Development Skillnader

## Problem: API Routes fungerar på localhost men inte i production

### Huvudorsaker

#### 1. **Next.js Prefetch Behavior**
- **Development**: Prefetch är mer begränsat och görs ofta bara när användaren faktiskt klickar
- **Production**: Prefetch är mer aggressivt och kan triggas när användaren hovrar över länkar eller när sidan laddas

**Exempel:**
När en användare ser en länk till `/admin/wine-tastings/new` i production:
- Next.js kan automatiskt försöka prefetcha den sidan
- Detta kan trigga API-anrop till `/api/wine-tastings/new` (om det finns)
- Eftersom `[id]` matchar "new", försöker API-routern hämta en session med ID "new"
- Detta ger 404-fel i production men fungerar i development

#### 2. **Build-time Optimering**
- **Development**: Routes hanteras dynamiskt, fel tolereras bättre
- **Production**: Routes optimeras vid build-time, routing-matchning är striktare

#### 3. **Caching**
- **Development**: Inga caches, allt är fresh
- **Production**: Vercel cachear routes, API-responses, och build-artifacts

#### 4. **Error Handling**
- **Development**: Fel visas direkt i konsolen, ofta med mer detaljerad information
- **Production**: Fel kan döljas eller cachas, svårare att debugga

### Lösningar Implementerade

#### 1. **Explicit "new" Check i API Routes**
```typescript
// app/api/wine-tastings/[id]/route.ts
if (id === "new") {
  return NextResponse.json({ error: "Invalid session ID" }, { status: 404 });
}
```

Detta förhindrar att API-routern försöker hämta en session med ID "new" när Next.js prefetchar `/admin/wine-tastings/new`.

#### 2. **Förbättringar som kan göras**

**A. Inaktivera prefetch för "new" länkar:**
```tsx
<Link href="/admin/wine-tastings/new" prefetch={false}>
  New Session
</Link>
```

**B. Skapa dedikerade API routes för "new" endpoints:**
Om det behövs, skapa `app/api/wine-tastings/new/route.ts` istället för att låta `[id]` matcha "new".

**C. Lägg till error boundaries:**
För att fånga och hantera fel bättre i production.

### Andra Potentiella Problem

#### 1. **Andra API Routes med samma mönster**
Kontrollera om andra API-routes har samma problem:
- `/api/producers/[id]` - kan matcha "new"
- `/api/wines/[id]` - kan matcha "new"
- `/api/pallets/[id]` - kan matcha "new"
- `/api/zones/[id]` - kan matcha "new"

#### 2. **Middleware Behavior**
Middleware kan bete sig annorlunda i production:
- API routes skippas i middleware (rad 32), men prefetch kan ändå triggas
- Caching kan påverka middleware-beslut

#### 3. **Environment Variables**
Kontrollera att alla environment variables är korrekt konfigurerade i Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Andra secrets

### Debugging Tips

1. **Kontrollera Vercel Logs:**
   - Gå till Vercel Dashboard → Project → Deployments → [Latest] → Functions
   - Kolla API route logs för att se vad som faktiskt händer

2. **Lägg till mer logging:**
   ```typescript
   console.log("API Route called:", { id, method: request.method, url: request.url });
   ```

3. **Testa lokalt med production build:**
   ```bash
   npm run build
   npm start
   ```
   Detta simulerar production-miljön lokalt.

4. **Kontrollera build output:**
   - Se till att alla routes är korrekt byggda
   - Kolla att inga routes saknas eller är felaktiga

### Checklista för Production Deployment

- [ ] Alla API routes har explicit "new" checks om de använder `[id]` pattern
- [ ] Länkar till `/new` sidor har `prefetch={false}` om de orsakar problem
- [ ] Environment variables är korrekt konfigurerade i Vercel
- [ ] Build går igenom utan fel
- [ ] Testa lokalt med `npm run build && npm start`
- [ ] Kolla Vercel logs efter deployment
- [ ] Verifiera att ändringar faktiskt är deployade (kolla commit hash)

### Relaterade Filer

- `app/api/wine-tastings/[id]/route.ts` - Huvudfil med "new" check
- `app/admin/wine-tastings/page.tsx` - Länkar till `/new` sida
- `middleware.ts` - Middleware som kan påverka routing
- `next.config.mjs` - Next.js konfiguration
