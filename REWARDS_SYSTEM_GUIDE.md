# PACT Wines - Membership Ladder System Guide

## 📋 Overview

PACT Wines använder ett exklusivt membership ladder-system baserat på Impact Points (IP). Medlemmar tjänar poäng genom invitations och aktivitet, vilket låser upp nivåer med progressivt bättre perks och tillgång.

**Last Updated:** October 9, 2025  
**Status:** ✅ Aktiv - Ersätter gamla rewards-systemet

---

## ⚠️ VIKTIGT: System Migration

**Det gamla rewards-systemet (5%/10% rabatter) har ersatts av Impact Points.**

Om du letar efter information om det gamla systemet, se slutet av detta dokument.

---

## 💎 Membership Ladder System

### Grundprincip
Användare tjänar Impact Points (IP) genom att bjuda in vänner och vara aktiva på plattformen. IP låser upp högre membership-nivåer med exklusiva perks och förmåner.

### Medlemsnivåer

#### **Level 0: Requester** (0 IP)
- Ingen access till plattformen
- Måste få en invitation eller godkännas av admin

#### **Level 1: Basic** (0-4 IP)
- Entry-level membership
- Kan reservera viner i öppna pallar
- 2 invites per månad

#### **Level 2: Brons** (5-14 IP)
- Aktiv medlem
- Lätt kö-prioritet
- Service fee reducerad med 50% (upp till månadsgräns)
- 5 invites per månad

#### **Level 3: Silver** (15-34 IP)
- Trusted member
- 24h early access till nya drops
- Fee cap per order
- Prioriterad kö
- 12 invites per månad

#### **Level 4: Guld** (≥35 IP)
- Top member
- 72h early access till nya drops
- Exklusiva member-only drops
- Högsta kö-prioritet
- Service fees waived (upp till månadsgräns)
- 50 invites per månad

#### **Level 5: Admin** (manuell)
- Plattformens operatörer
- Kan starta och hosta pallar
- Direktkontakt med producenter
- Unlimited invites

### Hur Man Tjänar Impact Points

| Aktivitet | IP | Beskrivning |
|-----------|----|----|
| Vän registrerar sig | +1 IP | När en inbjuden vän skapar konto |
| Vän gör första reservation | +2 IP | När samma vän gör sin första order |
| Egen order ≥6 flaskor | +1 IP | För varje order med minst 6 flaskor |
| Pallet milestone | +3 IP | Vid 3, 6, 9, 12, 15 unika pallar |

### Invite Quotas
- Varje nivå har en månadskvot för invitations
- Kvoten återställs automatiskt den 1:a varje månad
- Oanvända invites rullar INTE över till nästa månad

---

## 🗄️ Databas-struktur

### User Memberships Table
```sql
CREATE TABLE user_memberships (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  level membership_level,                    -- requester, basic, brons, silver, guld, admin
  impact_points INTEGER DEFAULT 0,           -- Total accumulated IP
  invite_quota_monthly INTEGER,              -- Invites allowed per month
  invites_used_this_month INTEGER DEFAULT 0, -- Current month usage
  last_quota_reset TIMESTAMP,                -- When quota was last reset
  level_assigned_at TIMESTAMP,               -- When current level was assigned
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Impact Point Events Table (Audit Log)
```sql
CREATE TABLE impact_point_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_type ip_event_type,                  -- invite_signup, invite_reservation, etc.
  points_earned INTEGER,                     -- IP awarded for this event
  related_user_id UUID,                      -- Invited user (if applicable)
  related_order_id UUID,                     -- Order (if applicable)
  description TEXT,                          -- Human-readable description
  created_at TIMESTAMP
);
```

### Membership Perks Table (Configuration)
```sql
CREATE TABLE membership_perks (
  id UUID PRIMARY KEY,
  level membership_level,
  perk_type perk_type,                       -- invite_quota, queue_priority, etc.
  perk_value TEXT,                           -- Value/magnitude of perk
  description TEXT,                          -- Display description
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER
);
```

### Invitation Codes Table (Updated)
```sql
CREATE TABLE invitation_codes (
  id UUID PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  initial_level membership_level DEFAULT 'basic', -- NEW: Admin can set start level
  used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  max_uses INTEGER DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 📊 Nuvarande Status (Nytt System)

### ✅ Implementerat

1. **Database Schema** ✅
   - `user_memberships` table med level och IP
   - `impact_point_events` audit log
   - `membership_perks` konfiguration
   - Automatiska triggers och functions

2. **Backend Logic** ✅
   - IP accrual engine (`points-engine.ts`)
   - Invite quota management (`invite-quota.ts`)
   - Automatic level upgrades
   - Monthly quota reset logic

3. **API Endpoints** ✅
   - `GET /api/user/membership` - Hämta membership data
   - `GET /api/user/membership/events` - Hämta IP timeline
   - `GET/PUT /api/admin/memberships` - Admin management
   - `POST /api/admin/invitations/generate` - Custom level invites

4. **Access Control** ✅
   - Middleware gating för requesters
   - `/access-pending` page för pending users
   - Level-based route protection

5. **Frontend UI** ✅
   - Amex-inspired profile page
   - Metallic level badges med shimmer
   - Perks grid display
   - IP timeline/activity feed
   - Invite quota display med countdown

### ⚠️ Kvarstående Arbete

1. **Automatic IP Triggers**
   - Trigger när invitation används (award +1 IP)
   - Trigger när invited user gör första order (award +2 IP)
   - Webhook efter lyckad order (award +1 IP if ≥6 bottles)
   - Pallet milestone checker

2. **Cron Jobs**
   - Monthly quota reset (körs 1:a varje månad)
   - Pallet milestone checker (dagligen)

3. **Admin UI**
   - Membership management dashboard
   - Manual IP adjustment interface
   - Custom invite creation form

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

---

## 🔄 Migration från Gamla Rewards-systemet

### Vad Som Ändrades

**FÖRE (Rewards):**
- 5% rabatt på 6 flaskor när vän registrerar sig
- 10% rabatt (upgrade) när vän gör reservation
- Rabatter appliceras vid checkout

**EFTER (Membership Ladder):**
- +1 IP när vän registrerar sig
- +2 IP när vän gör reservation  
- IP låser upp membership-nivåer med perks
- Inga direkta prisrabatter

### Migration av Befintliga Användare

För 0-10 användare (manuell migration):

```sql
-- För varje användare, räkna IP från invitations
INSERT INTO user_memberships (user_id, level, impact_points, invite_quota_monthly)
SELECT 
  u.id,
  get_level_from_points(
    COALESCE((SELECT COUNT(*) FROM invitation_codes WHERE created_by = u.id AND used_at IS NOT NULL), 0)
  ),
  COALESCE((SELECT COUNT(*) FROM invitation_codes WHERE created_by = u.id AND used_at IS NOT NULL), 0),
  get_invite_quota_for_level(
    get_level_from_points(
      COALESCE((SELECT COUNT(*) FROM invitation_codes WHERE created_by = u.id AND used_at IS NOT NULL), 0)
    )
  )
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM user_memberships WHERE user_id = u.id);
```

### Impact

- Användare med 5+ accepted invites → Brons level
- Användare med 15+ accepted invites → Silver level
- Användare med 35+ accepted invites → Guld level
- Nya användare börjar på Basic (0 IP)

---

## 📁 Relevanta Filer (Nytt System)

### Backend
- `lib/membership/points-engine.ts` - IP accrual logic
- `lib/membership/invite-quota.ts` - Quota management
- `app/api/user/membership/route.ts` - Membership data API
- `app/api/user/membership/events/route.ts` - IP events API
- `app/api/admin/memberships/route.ts` - Admin management
- `app/api/admin/invitations/generate/route.ts` - Admin invite creation

### Frontend
- `app/profile/page.tsx` - Redesigned profile with membership
- `components/membership/level-badge.tsx` - Metallic level badges
- `components/membership/perks-grid.tsx` - Perks display
- `components/membership/ip-timeline.tsx` - Activity timeline
- `components/membership/level-progress.tsx` - Progress to next level
- `components/membership/invite-quota-display.tsx` - Invite quota UI

### Database
- `migrations/034_membership_system.sql` - Complete membership schema
- `invitation_codes.initial_level` - Admin-set start level

### Access Control
- `middleware.ts` - Level-based access gating
- `app/access-pending/page.tsx` - Requester holding page

---

## 🔍 Debugging & Admin Tools

### Check User Membership
```sql
SELECT 
  u.email,
  m.level,
  m.impact_points,
  m.invite_quota_monthly,
  m.invites_used_this_month
FROM user_memberships m
JOIN auth.users u ON u.id = m.user_id
ORDER BY m.impact_points DESC;
```

### View IP Events for User
```sql
SELECT * FROM impact_point_events
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 20;
```

### Manual Level Adjustment (Admin)
```typescript
// Via admin API
await fetch('/api/admin/memberships', {
  method: 'PUT',
  body: JSON.stringify({
    userId: 'USER_ID',
    level: 'silver',
    impactPoints: 20
  })
});
```

---

## 🎯 Admin Guide: Creating Custom Invites

Admins kan skapa invitations med custom start level:

```typescript
await fetch('/api/admin/invitations/generate', {
  method: 'POST',
  body: JSON.stringify({
    initialLevel: 'silver',  // basic, brons, silver, or guld
    expiresInDays: 30,
    maxUses: 1
  })
});
```

När mottagaren redeemer koden → de börjar direkt på Silver level (bypass IP requirement).

---

## 📊 DEPRECATED: Gamla Rewards-systemet

**Detta system är inte längre aktivt. Information sparas för referens.**

### Hur Det Gamla Systemet Fungerade

**5% Rabatt:**
- Vän registrerade sig → Du fick 6 flaskor @ 5% rabatt
- 3 vänner registrerade sig → 18 flaskor @ 5%

**10% Rabatt:**
- Vän registrerade sig OCH gjorde reservation → Samma 6 flaskor uppgraderades till 10%
- INTE kumulativt: 2 vänner med reservationer = 12 flaskor @ 10%

**Checkout Integration:**
- Användare valde vilka rewards som skulle användas
- Rabatter applicerades på valda flaskor
- Backend trackade used vs available bottles

**Varför Vi Bytte:**
- Komplicerad tracking av used/available bottles
- Svårt att skala (vad händer vid 100+ invites?)
- Rabatter skapar inte samma exklusivitet som status/perks
- Membership ladder ger tydligare progression och engagement

---

**För frågor om nya membership-systemet, kontakta utvecklingsteamet.**

