# Vercel Environment Variables (Preview)

För att preview ska fungera som localhost (loggor, knappar, inbjudningar m.m.) behöver du lägga till alla miljövariabler i Vercel.

## Steg

1. Öppna [Vercel Dashboard](https://vercel.com/dashboard) → ditt projekt
2. Gå till **Settings** → **Environment Variables**
3. Lägg till (klicka **Add**) – **alla tre** behövs för full funktionalitet:

| Namn | Värde | Environment | Behövs för |
|------|-------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Din Supabase project URL | Preview ✓ | Auth, client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Din Supabase anon/public key | Preview ✓ | Auth, client |
| `SUPABASE_SERVICE_ROLE_KEY` | Din Supabase service role key | Preview ✓ | Loggor, site content, inbjudningar |

4. Välj **Preview** (eller alla miljöer)
5. Klicka **Save**
6. **Redeploy** preview-branchen (Deployments → … → Redeploy)

## Viktigt: NEXT_PUBLIC_APP_URL för Preview

**Sätt INTE `NEXT_PUBLIC_APP_URL` för Preview.** Låt den vara tom eller avmarkerad för Preview-miljön.

- **Production**: Sätt `NEXT_PUBLIC_APP_URL` = `https://pactwines.com`
- **Preview**: Låt den vara tom – appen använder automatiskt `VERCEL_URL` (t.ex. `https://projekt-xyz.vercel.app`)

Koden använder `getAppUrl()` som faller tillbaka på `VERCEL_URL` när `NEXT_PUBLIC_APP_URL` saknas.

## Hitta värdena

- Supabase Dashboard → Project Settings → API
- **Project URL** = `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** = `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** = `SUPABASE_SERVICE_ROLE_KEY` (hemlig – används på servern)

## Vercel Deployment Protection (Preview)

Om **Vercel Authentication** eller annan Deployment Protection är aktiverad på Preview: Server-side fetch till eget API (t.ex. produkter, collections) får 401.

**Lösning:** Aktivera **Protection Bypass for Automation** i Vercel:

1. Dashboard → Projekt → **Settings** → **Deployment Protection**
2. Under "Protection Bypass for Automation" → **Enable** och generera en secret
3. Vercel lägger automatiskt till `VERCEL_AUTOMATION_BYPASS_SECRET` som systemvariabel
4. Koden skickar headern `x-vercel-protection-bypass` vid alla interna API-anrop

Om du inte använder Deployment Protection behöver du inget göra.

## Utan dessa variabler

- Loggor visas som "PACT"-text istället för uppladdad bild
- Inbjudningar valideras inte korrekt
- Auth och databas-anrop fungerar inte
