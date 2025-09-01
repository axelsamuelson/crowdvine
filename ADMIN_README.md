# Crowdvine Admin MVP

En komplett admin-interface för Crowdvine med Supabase Auth, role guards och CRUD-operationer för alla huvudentiteter.

## 🚀 Snabbstart

### 1. Kör migration
```bash
npm run migrate
```

### 2. Skapa admin-användare
Gå till `/admin/login` och skapa en användare med admin-roll.

### 3. Testa admin-interface
Besök `/admin` för att komma åt admin-dashboard.

## 📋 Funktioner

### ✅ Implementerat
- **Supabase Auth** med role-baserad åtkomst (admin, producer, user)
- **Middleware** för route protection
- **Admin Dashboard** med statistik och snabba åtgärder
- **CRUD för Producers** - hantera vinproducenter
- **CRUD för Campaigns** - hantera kampanjer med status (draft, live, triggered, closed)
- **CRUD för Wines** - hantera vinprodukter med pris och metadata
- **CRUD för Pallet Zones** - hantera leveranszoner
- **Bookings Viewer** - read-only vy av kundbokningar
- **Form-komponenter** - återanvändbara formulär för alla entiteter
- **Server Actions** - säkra API-anrop med auth-kontroll
- **RLS Policies** - databassäkerhet

### 🔧 Teknisk Stack
- **Next.js 15** med App Router
- **Supabase** för backend och auth
- **TypeScript** för type safety
- **Tailwind CSS** + shadcn/ui för UI
- **Server Actions** för data mutations
- **Middleware** för route protection

## 📁 Projektstruktur

```
app/admin/
├── layout.tsx              # Admin layout med navigation
├── page.tsx                # Dashboard med statistik
├── login/page.tsx          # Login-sida
├── producers/              # Producer CRUD
├── campaigns/              # Campaign CRUD
├── wines/                  # Wine CRUD
├── zones/                  # Zone CRUD
└── bookings/               # Bookings viewer

components/admin/
├── producer-form.tsx       # Producer formulär
├── campaign-form.tsx       # Campaign formulär
├── wine-form.tsx          # Wine formulär
└── zone-form.tsx          # Zone formulär

lib/
├── auth.ts                 # Auth utilities
├── actions/
│   ├── producers.ts       # Producer server actions
│   ├── campaigns.ts       # Campaign server actions
│   ├── wines.ts          # Wine server actions
│   ├── zones.ts          # Zone server actions
│   └── bookings.ts       # Booking server actions

scripts/
├── migration.sql          # Database migration
└── run-migration.ts       # Migration runner
```

## 🔐 Autentisering

### Roller
- **admin** - Full åtkomst till alla admin-funktioner
- **producer** - Begränsad åtkomst till producer-specifika funktioner
- **user** - Endast publika funktioner

### Middleware
- `/admin/*` - Kräver admin-roll
- `/producer/*` - Kräver producer eller admin-roll
- Automatisk redirect till login vid otillräckliga behörigheter

## 🗄️ Databas

### Nya tabeller
- `profiles` - Användarroller och metadata
- `pallet_zone_members` - Zone membership för producers

### Uppdaterade tabeller
- `bookings` - Lagt till `tolerance_cents` och `status` fält

### RLS Policies
- Säker åtkomst till användardata
- Admin-roll krävs för känsliga operationer

## 🚀 Deployment

### 1. Kör migration på produktion
```bash
npm run migrate
```

### 2. Skapa admin-användare
```bash
# Via Supabase Dashboard eller app
```

### 3. Verifiera funktionalitet
- Testa alla CRUD-operationer
- Verifiera auth och middleware
- Kontrollera RLS policies

## 🔧 Utveckling

### Lägg till ny entitet
1. Skapa server actions i `lib/actions/`
2. Skapa form-komponent i `components/admin/`
3. Skapa sidor i `app/admin/`
4. Lägg till navigation i admin layout
5. Uppdatera dashboard statistik

### Styling
- Använd shadcn/ui komponenter
- Följ Tailwind CSS konventioner
- Behåll konsistent design med resten av appen

## 📝 Noter

- Alla admin-sidor är skyddade av middleware
- Server actions inkluderar auth-kontroll
- Formulär har validering och error handling
- Responsive design för alla skärmstorlekar
- TypeScript för full type safety
