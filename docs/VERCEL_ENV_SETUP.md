# Vercel Environment Variables (Preview)

För att preview-deployment ska fungera fullt ut behöver du lägga till Supabase-miljövariabler i Vercel.

## Steg

1. Öppna [Vercel Dashboard](https://vercel.com/dashboard) → ditt projekt
2. Gå till **Settings** → **Environment Variables**
3. Lägg till (klicka **Add**):

| Namn | Värde | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Din Supabase project URL | Preview ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Din Supabase anon/public key | Preview ✓ |

4. Välj **Preview** (inte Production om du bara vill testa först)
5. Klicka **Save**
6. **Redeploy** preview-branchen så att de nya variablerna laddas

## Hitta värdena

- Supabase Dashboard → Project Settings → API
- **Project URL** = `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key = `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Utan dessa variabler

Appen laddar utan att krascha men auth och databas-anrop fungerar inte. Du ser varningar i konsolen.
