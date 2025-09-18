# Access Request System - Installation Guide

Detta dokument beskriver hur du installerar och konfigurerar det förbättrade access request-systemet.

## 🚀 Installation

### 1. Kör databas-migrationer

Kör följande SQL-skript i Supabase Dashboard -> SQL Editor i denna ordning:

```sql
-- 1. Skapa invitation_codes tabell
-- Kör: migration_invitation_codes.sql

-- 2. Uppdatera access_tokens tabell (om den inte redan finns)
-- Kör: migration_access_tokens.sql

-- 3. Skapa access_requests tabell (om den inte redan finns)
-- Kör: migration_access_requests.sql
```

### 2. Miljövariabler

Se till att följande miljövariabler är konfigurerade i `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# SendGrid (för emails)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@pactwines.com
SENDGRID_FROM_NAME=CrowdVine

# App URL
NEXT_PUBLIC_APP_URL=https://pactwines.com
```

### 3. Installera dependencies

```bash
npm install
```

## 🔧 Nya funktioner

### ✅ Förbättringar som implementerats:

1. **Invitation Codes System**
   - Riktig databas-validering av invitation codes
   - Expiry-datum och usage tracking
   - Email-specifika codes (valfritt)

2. **Konsoliderade Email Templates**
   - Alla email-templates finns nu i `/lib/email-templates.ts`
   - Eliminerar kod-duplicering
   - Lättare att underhålla

3. **Förbättrad Error Handling**
   - Tydligare felmeddelanden för admin
   - Bättre error reporting för email-fel
   - Mer informativa toast-meddelanden

4. **Automatisk Cleanup**
   - API endpoint för cleanup: `/api/admin/cleanup-tokens`
   - Manuell cleanup script: `npm run cleanup`
   - Automatisk cleanup av gamla tokens och invitation codes

5. **Rate Limiting**
   - 5 access requests per 15 minuter per IP
   - 3 signup attempts per timme per IP
   - Skydd mot spam och missbruk

6. **Smart User Management** 🆕
   - Hanterar användare som redan finns i auth.users
   - Undviker duplicering av access requests
   - Automatisk cleanup av gamla requests för användare med access
   - Intelligent hantering av edge cases

7. **Robust Signup Process** 🆕
   - Kontrollerar om användare redan har access
   - Hanterar befintliga användare korrekt
   - Automatisk profil-skapande för orphaned users
   - Bättre felmeddelanden med detaljerad information

8. **Comprehensive Data Cleanup** 🆕
   - När access request tas bort rensas ALL relaterad data
   - Automatisk cleanup av access_tokens, invitation_codes
   - Rensar orphaned auth.users som inte har profiler
   - Bulk delete funktionalitet för flera requests samtidigt
   - Detaljerad feedback om vad som rensats

## 📋 Användning

### Access Request Process

1. **Användare begär access** på `/access-request`
2. **Admin godkänner** i `/admin/access-control`
3. **Email skickas automatiskt** med signup-länk
4. **Användare skapar konto** via länken
5. **Access beviljas automatiskt**

### Invitation Codes

1. **Admin skapar invitation code** i `/admin/access-control`
2. **Användare använder koden** på `/access-request`
3. **Konto skapas direkt** med access

### Cleanup

```bash
# Manuell cleanup av expired tokens
npm run cleanup

# Komplett cleanup av access system (fixar inkonsistenser)
npm run cleanup-access

# Eller via API
curl -X POST https://pactwines.com/api/admin/cleanup-tokens
```

### Data Management

**När du tar bort en access request:**
- ✅ Access request tas bort från `access_requests` tabellen
- ✅ Alla access tokens för email:en tas bort från `access_tokens`
- ✅ Alla invitation codes för email:en tas bort från `invitation_codes`
- ✅ Orphaned auth users (utan profil) tas bort från `auth.users`
- ✅ Detaljerad feedback om vad som rensats

**Automatisk cleanup:**
- Gamla pending requests (>30 dagar) rensas automatiskt
- Expired tokens rensas dagligen
- Orphaned users fixas vid cleanup

## 🔒 Säkerhet

### Rate Limiting
- **Access Requests**: 5 per 15 minuter
- **Signup**: 3 per timme
- **Headers**: `X-RateLimit-*` för transparens

### Token Management
- **Access Tokens**: 7 dagars expiry
- **Invitation Codes**: Konfigurerbar expiry (7-365 dagar)
- **Automatisk cleanup**: Gamla tokens rensas bort

## 🐛 Troubleshooting

### Vanliga problem:

1. **Email skickas inte**
   - Kontrollera SendGrid API key
   - Kontrollera från-email adress
   - Kolla server logs för detaljer

2. **Invitation codes fungerar inte**
   - Kör migration för invitation_codes tabell
   - Kontrollera att tabellen finns i Supabase

3. **Rate limiting för strikt**
   - Justera limits i `/lib/rate-limiter.ts`
   - Eller använd development mode för testing

### Debug endpoints:

```bash
# Kontrollera cleanup status
curl https://pactwines.com/api/admin/cleanup-tokens

# Testa rate limiting
curl -X POST https://pactwines.com/api/access-request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 📊 Monitoring

### Loggar att följa:
- Access request submissions
- Email sending success/failure
- Rate limiting triggers
- Cleanup operations

### Metrics att övervaka:
- Antal access requests per dag
- Email delivery rates
- Rate limiting violations
- Token cleanup frequency

## 🔄 Uppdateringar

För att uppdatera systemet:

1. Kör nya migrationer
2. Uppdatera miljövariabler om nödvändigt
3. Testa alla funktioner
4. Kör cleanup för att rensa gamla data

---

**Systemet är nu redo för produktion!** 🎉
