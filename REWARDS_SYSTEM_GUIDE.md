# PACT Wines - Rewards System Guide

## 📋 Overview

PACT Wines har ett invitation-baserat rewards-system där användare får rabatter på flaskor när de bjuder in vänner till plattformen.

**Last Updated:** October 9, 2025  
**Status:** ✅ Aktiv (men vissa backend-integrationer saknas)

---

## 🎁 Hur Rewards Fungerar

### Grundprincip
När en användare bjuder in en vän och vännen registrerar sig/gör reservation, får den som bjöd in rewards i form av rabatterade flaskor.

### Reward-nivåer

#### **5% Rabatt**
- **När:** När en inbjuden vän skapar ett konto (registrerar sig)
- **Belöning:** 6 flaskor med 5% rabatt
- **Exempel:** Bjuder in 3 vänner → alla registrerar sig → 18 flaskor med 5% rabatt

#### **10% Rabatt**  
- **När:** När en inbjuden vän gör sin första reservation
- **Belöning:** Samma 6 flaskor uppgraderas från 5% → 10% rabatt
- **Exempel:** Av 3 vänner, 2 gör reservationer → 12 flaskor med 10%, 6 flaskor med 5%

### Viktigt!
- **INTE kumulativt mellan vänner:** Varje vän = 6 flaskor (inte 6+6+6=18 med 10%)
- **Kumulativt per vän:** Om samma vän först registrerar (5%) och sedan gör reservation (→10%)
- **Används vid checkout:** Användaren väljer vilka rewards som ska appliceras vid betalning

---

## 🗄️ Databas-struktur

### Invitation Codes Table
```sql
CREATE TABLE invitation_codes (
  id UUID PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,          -- Unik invite-kod (20 tecken)
  email VARCHAR(255),                         -- Eventuell target-email
  created_by UUID REFERENCES auth.users(id),  -- Vem som skapade koden
  used_at TIMESTAMP,                          -- När koden användes
  used_by UUID REFERENCES auth.users(id),    -- Vem som använde koden
  expires_at TIMESTAMP,                       -- Utgångsdatum
  is_active BOOLEAN DEFAULT TRUE,             -- Om koden är aktiv
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Rewards Beräkning (Nuvarande Implementation)

**Frontend (app/profile/page.tsx):**
```typescript
// 5% rewards: 6 bottles per friend who joined
const totalEligibleBottles = usedInvitations.length * 6;

// Used bottles (TODO: Should come from backend)
const used5Percent = 0;  // Bottles where 5% discount is already applied
const used10Percent = 0; // Bottles where 10% discount is already applied

// Friends with reservations (TODO: Should come from backend)
const friendsWithReservations = 0;

// Available bottles
const available5Percent = totalEligibleBottles - used5Percent;
const available10Percent = (friendsWithReservations * 6) - used10Percent;
```

---

## 📊 Nuvarande Status

### ✅ Vad Som Fungerar

1. **Invitation Codes Generation**
   - Användare kan generera invite-kod via profil-sidan
   - Kod lagras i `invitation_codes` tabellen
   - Varje kod är unik (20 tecken MD5)

2. **Invitation Tracking**
   - När någon använder en kod spåras det i databasen
   - `used_by`, `used_at` uppdateras
   - Real-time updates via Supabase Realtime

3. **UI Display**
   - Visar antalet accepted invitations
   - Visar 5% och 10% reward cards
   - Collapsible lista över accepterade invitations

### ⚠️ Vad Som Delvis Fungerar

1. **Rewards Beräkning**
   - **Fungerar:** Räknar ut `totalEligibleBottles` baserat på antal accepted invitations
   - **Saknas:** Backend-integration för `used5Percent`, `used10Percent`
   - **Saknas:** Backend-integration för `friendsWithReservations`

2. **Rewards Application**
   - **Fungerar:** UI för att välja rewards i checkout finns
   - **Saknas:** Actual discount application vid betalning
   - **Saknas:** Tracking av vilka flaskor som använt rabatt

### ❌ Vad Som Saknas

1. **Backend Rewards Tracking**
   - Ingen tabell för `user_rewards` eller `applied_discounts`
   - Ingen integration mellan `invitation_codes` och `order_reservations`
   - Ingen funktion för att kolla hur många rewards som använts

2. **Checkout Integration**
   - Rewards visas i UI men appliceras inte i faktisk betalning
   - Ingen validering av tillgängliga rewards
   - Ingen uppdatering av `used` rewards efter order

3. **Friend Reservation Detection**
   - Ingen automatisk detektion när en inbjuden vän gör reservation
   - Ingen uppgradering av 5% → 10% rewards

---

## 🔧 Teknisk Implementation

### Frontend Flow

#### 1. Generate Invitation
```typescript
// app/profile/page.tsx
const generateInvitation = async () => {
  const res = await fetch('/api/user/invitations/generate');
  const data = await res.json();
  // Returns: { code, signupUrl, expiresAt }
};
```

#### 2. Track Invitations
```typescript
// Uses Supabase Realtime
const channel = supabase
  .channel(`invitations:${profile.id}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'invitation_codes',
    filter: `created_by=eq.${profile.id}`
  }, (payload) => {
    // Update invitation state
  });
```

#### 3. Display Rewards
```typescript
// Calculate based on usedInvitations
const totalEligibleBottles = usedInvitations.length * 6;
const available5Percent = totalEligibleBottles - used5Percent;
const available10Percent = (friendsWithReservations * 6) - used10Percent;

// Display in RewardTierCard components
<RewardTierCard tierPercent={5} used={0} available={54} />
<RewardTierCard tierPercent={10} used={0} available={0} />
```

---

## 🎯 Reward Logic Exempel

### Scenario 1: Grundläggande
```
Användare A bjuder in 3 vänner:
├─ Vän 1: Registrerar sig
│  └─ A får: 6 flaskor @ 5% rabatt
├─ Vän 2: Registrerar sig  
│  └─ A får: 6 flaskor @ 5% rabatt (totalt 12)
└─ Vän 3: Registrerar sig
   └─ A får: 6 flaskor @ 5% rabatt (totalt 18)

Totalt: 18 flaskor @ 5% rabatt
```

### Scenario 2: Med Reservationer
```
Användare A bjuder in 3 vänner:
├─ Vän 1: Registrerar sig → gör reservation
│  └─ A får: 6 flaskor @ 5% → UPPGRADERAS till 10%
├─ Vän 2: Registrerar sig (ingen reservation än)
│  └─ A får: 6 flaskor @ 5% rabatt
└─ Vän 3: Registrerar sig → gör reservation
   └─ A får: 6 flaskor @ 5% → UPPGRADERAS till 10%

Totalt: 12 flaskor @ 10% + 6 flaskor @ 5%
```

### Scenario 3: Använd Rewards
```
Användare A har: 18 flaskor @ 5% tillgängliga
A gör en order med 12 flaskor och använder rewards:
├─ Väljer 12 flaskor med 5% rabatt
└─ Efter order: 6 flaskor @ 5% kvar

Remaining: 6 flaskor @ 5% available
```

---

## 🛒 Checkout Integration

### Current State (UI Only)

**Checkout Page visar:**
- "Use Rewards?" toggle (Yes/No)
- När "Yes": Lista över available rewards
- Användaren kan välja vilka rewards som ska användas
- UI uppdaterar total-priset (frontend only)

**Men saknar:**
- Backend-validering av rewards
- Faktisk rabatt-applikation i Stripe/betalning
- Uppdatering av `used` rewards efter order
- Kopplingen mellan rewards och order_reservations

---

## 📁 Relevanta Filer

### Frontend
- `app/profile/page.tsx` - Main profile page med rewards display
- `components/ui/reward-tier-card.tsx` - 5% och 10% reward cards
- `app/checkout/page.tsx` - Checkout med rewards selection

### Backend/API
- `app/api/user/invitations/generate/route.ts` - Generera invite-kod
- `invitation_codes` table - Lagrar alla invitations

### Database
- `migrations/old/migration_invitation_codes.sql` - Invitation codes schema
- `migrations/old/migration_access_control.sql` - RLS policies

---

## 🚧 TODO: Vad Som Behöver Implementeras

### 1. Backend Rewards Tracking
Skapa en `user_rewards` tabell:
```sql
CREATE TABLE user_rewards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  invitation_id UUID REFERENCES invitation_codes(id),
  reward_type VARCHAR(10), -- '5_percent' or '10_percent'
  eligible_bottles INT DEFAULT 6,
  used_bottles INT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 2. API Endpoints
- `GET /api/user/rewards` - Hämta alla user rewards
- `POST /api/user/rewards/apply` - Applicera rewards på en order
- `PUT /api/user/rewards/upgrade` - Uppgradera 5% → 10% när vän gör reservation

### 3. Checkout Integration
- Validera tillgängliga rewards vid checkout
- Applicera rabatt i Stripe payment intent
- Uppdatera `used_bottles` efter lyckad order
- Koppla rewards till `order_reservations` via foreign key

### 4. Automatic Upgrades
- Webhook/trigger när invited user gör första reservation
- Uppgradera motsvarande 6 flaskor från 5% → 10%
- Notifiera användaren om uppgradering

---

## 🔍 Debugging

### Kolla Invitation Status
```sql
-- Se alla invitations för en user
SELECT * FROM invitation_codes 
WHERE created_by = 'USER_ID' 
ORDER BY created_at DESC;

-- Se accepted invitations
SELECT * FROM invitation_codes 
WHERE created_by = 'USER_ID' 
AND used_at IS NOT NULL;
```

### Verifiera Rewards
```typescript
// I profile page console:
console.log('Used invitations:', usedInvitations.length);
console.log('Total eligible bottles (5%):', usedInvitations.length * 6);
```

---

## 💡 Future Improvements

1. **Rewards Expiry** - Sätt timeout på oanvända rewards (t.ex. 6 månader)
2. **Tiered System** - Fler reward-nivåer (15%, 20% för power-users)
3. **Referral Analytics** - Dashboard för att se conversion rates
4. **Automatic Notifications** - Email när rewards unlocked/upgraded
5. **Reward History** - Visa alla använda rewards och på vilka orders

---

**Status:** Systemet är funktionellt för invitation generation och tracking, men backend-integrationen för actual discount application behöver implementeras.

