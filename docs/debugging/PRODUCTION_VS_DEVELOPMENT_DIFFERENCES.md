# Production vs Development Skillnader

## Problem: API Routes fungerar på localhost men inte i production

### Den verkliga orsaken (root cause)

**Det underliggande felet var inte att production beter sig annorlunda – det var att API-routerna saknades.**

- Frontend anropade **GET `/api/wine-tastings`** (lista sessioner) och **POST `/api/wine-tastings`** (skapa session).
- I koden fanns bara **`app/api/wine-tastings/[id]/route.ts`** – alltså hantering för `/api/wine-tastings/:id`, inte för `/api/wine-tastings` själv.
- Därför gav **GET `/api/wine-tastings`** och **GET `/api/wine-tastings/new`** **404 både lokalt och i production** – om man faktiskt anropade dessa URLs.

**Varför kändes det som "fungerar lokalt"?**

1. **Olika flöden testades** – Lokalt testades troligen bara **deltagarflödet** (gå till `/tasting/KOD`, joina, betygsätt). Det använder `/api/wine-tastings/by-code/.../join` och `/api/wine-tastings/[id]`, som fanns. **Adminflödet** (lista sessioner, klicka "Ny session") anropade de URLs som saknade route och testades kanske inte lokalt.
2. **Ingen production-lik test lokalt** – Om man kör `npm run build && npm start` och sedan öppnar `/admin/wine-tastings`, får man samma 404 lokalt. Så felet var inte specifikt för production, utan för **alla miljöer där dessa anrop görs**.
3. **Prefetch i production** – I production kan Next.js prefetcha `/admin/wine-tastings/new`, vilket kan trigga **GET `/api/wine-tastings/new`** (som matchar `[id]` med id = "new"). Då syns 404:orna tydligare i production eftersom fler anrop sker (prefetch), medan man lokalt kanske inte klickade sig till den sidan.

**Slutsats:** Felet var **ofullständig API-yta** (frontend anropar endpoints som aldrig implementerats), inte att dev och production skiljer sig i routing. För att undvika liknande problem framöver:

- **Varje URL som frontend anropar måste ha en motsvarande route-fil** (eller tydlig dokumentation om att den är valfri).
- **Testa samma användarflöden lokalt som i production** – inkl. admin-listning och "Ny session".
- **Kör production-build lokalt innan deploy:** `npm run build && npm start` och gå igenom de flöden som ska fungera.

---

### Andra skillnader som kan ge "fungerar lokalt, inte i production"

#### 1. **Next.js Prefetch**
- **Development**: Prefetch är mer begränsat.
- **Production**: Prefetch kan triggas vid hover/laddning, t.ex. mot `/admin/wine-tastings/new` → GET `/api/wine-tastings/new` (matchar `[id]` = "new").

#### 2. **Build och caching**
- **Development**: Routes hanteras dynamiskt, mindre caching.
- **Production**: Build-time-optimering och caching (t.ex. Vercel) kan göra att fel eller 404:or känns annorlunda.

#### 3. **Felhantering**
- **Development**: Fel ofta tydligare i konsol.
- **Production**: Fel kan cachas eller visas mindre tydligt.

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

- [ ] **Varje API-URL som frontend anropar har en motsvarande route-fil** (t.ex. GET/POST `/api/wine-tastings` → `app/api/wine-tastings/route.ts`)
- [ ] Alla API routes med `[id]` har explicit hantering för "new" om sidan `/.../new` används (eller `prefetch={false}` på länken)
- [ ] Länkar till `/new`-sidor har `prefetch={false}` om det orsakar onödiga anrop
- [ ] Environment variables är korrekt konfigurerade i Vercel
- [ ] Build går igenom utan fel
- [ ] **Testa samma användarflöden lokalt med production build:** `npm run build && npm start` (inte bara `npm run dev`)
- [ ] Kolla Vercel logs efter deployment vid 404:or
- [ ] Verifiera att rätt commit är deployad (commit hash)

### Hur undviker vi "fungerar lokalt men inte i production" framöver

1. **Samma flöden i dev och prod** – Testa admin-flöden (lista, skapa, redigera) lokalt, inte bara deltagar-/kundflöden.
2. **Production-build lokalt** – Innan push: `npm run build && npm start`, öppna de sidor som ska fungera (t.ex. `/admin/wine-tastings`, `/admin/wine-tastings/new`) och verifiera att inga 404:or dyker upp i Network-fliken.
3. **API-kontrakt** – När frontend anropar en ny URL (t.ex. `fetch("/api/wine-tastings")`), skapa eller verifiera att motsvarande route finns under `app/api/...` innan merge.
4. **E2E eller smoke-tester** – Om möjligt, automatiserade tester som anropar kritiska API-endpoints eller öppnar admin-sidor efter build, så att saknade routes upptäcks i CI.

### Relaterade Filer – Wine Tastings API (alla routes implementerade)

- `app/api/wine-tastings/route.ts` – GET (lista), POST (skapa)
- `app/api/wine-tastings/[id]/route.ts` – GET/PATCH/DELETE för en session
- `app/api/wine-tastings/by-code/[code]/join/route.ts` – POST (joina session med kod)
- `app/api/wine-tastings/[id]/ratings/route.ts` – GET (lista/enskild rating), POST (spara rating)
- `app/api/wine-tastings/[id]/summary/route.ts` – GET (sammanfattning)
- `app/api/wine-tastings/[id]/participants/route.ts` – GET (deltagare, admin)
- `app/admin/wine-tastings/page.tsx` – Lista sessioner, länk till "Ny session"
- `app/admin/wine-tastings/[id]/page.tsx` – Detalj/redigera; id="new" visar skapa-formulär
- `middleware.ts` – API-routes skippas i middleware
- `next.config.mjs` – Next.js konfiguration
