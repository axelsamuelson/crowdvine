# 🔍 **Supabase Setup Verification Guide**

## **Steg-för-steg Kontroll**

### **1. Authentication Settings**

#### **Gå till: Authentication → Settings**

**Email Auth:**
- [ ] **Enable email signups** - Måste vara aktiverat
- [ ] **Enable email confirmations** - Måste vara aktiverat  
- [ ] **Enable email change confirmations** - Måste vara aktiverat
- [ ] **Enable secure email change** - Måste vara aktiverat

**Password Auth:**
- [ ] **Enable password signups** - Måste vara aktiverat
- [ ] **Enable password confirmations** - Måste vara aktiverat

**Advanced Settings:**
- [ ] **Enable refresh token rotation** - Rekommenderat
- [ ] **Enable refresh token reuse detection** - Rekommenderat

### **2. Email Templates**

#### **Gå till: Authentication → Email Templates**

**Confirm signup:**
- [ ] Template finns och är konfigurerad
- [ ] Subject line är satt (t.ex. "Bekräfta din email")
- [ ] HTML content är satt
- [ ] Text content är satt

**Andra templates:**
- [ ] Invite user (om du använder invites)
- [ ] Magic link (om du använder magic links)
- [ ] Change email address
- [ ] Reset password

### **3. Database Schema**

#### **Gå till: SQL Editor**

**Kör denna query för att kontrollera tabeller:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 
  'producers', 
  'campaigns', 
  'campaign_items', 
  'pallet_zones', 
  'pallet_zone_members', 
  'bookings'
);
```

**Förväntat resultat:** 7 rader (alla tabeller ska finnas)

### **4. RLS Policies**

#### **Kontrollera RLS-policies:**

```sql
-- Kontrollera RLS-policies för alla tabeller
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
ORDER BY tablename, policyname;
```

**Förväntat resultat:** Minst 1 policy per tabell

### **5. Sample Data**

#### **Kontrollera att data finns:**

```sql
-- Kontrollera data i alla tabeller
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'producers', COUNT(*) FROM producers
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL
SELECT 'campaign_items', COUNT(*) FROM campaign_items
UNION ALL
SELECT 'pallet_zones', COUNT(*) FROM pallet_zones
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings;
```

**Förväntat resultat:** Alla tabeller ska ha minst 1 rad

### **6. API Settings**

#### **Gå till: Settings → API**

**Project API keys:**
- [ ] **Project URL** - Kopierat till `.env.local`
- [ ] **anon public** - Kopierat till `.env.local`
- [ ] **service_role** - Finns (används för admin-operationer)

**JWT Settings:**
- [ ] **JWT Secret** - Satt
- [ ] **JWT Expiry** - Rimlig tid (t.ex. 3600 sekunder)

### **7. Storage (om du använder det)**

#### **Gå till: Storage**

**Buckets:**
- [ ] **Bucket för bilder** - Skapad
- [ ] **RLS policies** - Satta för bucket

### **8. Functions (om du använder dem)**

#### **Gå till: Edge Functions**

**Kontrollera:**
- [ ] Inga fel i function logs
- [ ] Functions är deployed

### **9. Logs och Monitoring**

#### **Gå till: Logs**

**Kontrollera:**
- [ ] Inga kritiska fel
- [ ] Authentication logs visar framgångsrika inloggningar
- [ ] Email logs visar att email skickas

### **10. Testa Systemet**

#### **Kör verifierings-scriptet:**

1. Gå till **SQL Editor**
2. Kopiera innehållet från `scripts/verify-supabase-setup.sql`
3. Kör scriptet
4. Kontrollera att alla tester visar "PASS"

### **11. Testa Admin-login**

#### **Gå till: http://localhost:3000/admin/login**

1. Logga in med `ave.samuelson@gmail.com`
2. Kontrollera att du kommer till admin-dashboard
3. Testa alla CRUD-operationer

### **12. Testa Email-funktionalitet**

#### **Skapa en ny admin-användare:**

1. Gå till admin-login
2. Klicka på "Sign Up" tab
3. Skapa en ny admin-användare
4. Kontrollera att bekräftelsemail kommer
5. Klicka på länken i email
6. Verifiera att användaren blir bekräftad

### **13. Kontrollera Logs**

#### **Gå till: Logs → Authentication**

Kontrollera att du ser:
- [ ] Framgångsrika signup-försök
- [ ] Email-bekräftelser
- [ ] Framgångsrika login-försök
- [ ] Inga kritiska fel

### **14. Kontrollera Email Templates**

#### **Testa email-skickning:**

1. Gå till **Authentication → Email Templates**
2. Klicka på "Confirm signup"
3. Klicka på "Test" knappen
4. Ange en test-email
5. Kontrollera att test-email kommer

### **15. Slutlig Verifiering**

#### **Kontrollera att allt fungerar:**

- [ ] Admin-login fungerar
- [ ] Email-bekräftelse fungerar
- [ ] CRUD-operationer fungerar
- [ ] API:er returnerar data
- [ ] Inga fel i browser console
- [ ] Inga fel i server logs

## **Felsökning**

### **Om email inte kommer:**
1. Kontrollera **Authentication → Settings** → Email Auth
2. Kontrollera **Email Templates** är konfigurerade
3. Kontrollera **Logs** för email-fel
4. Testa med **Test**-knappen i Email Templates

### **Om admin-login inte fungerar:**
1. Kontrollera att användaren är bekräftad
2. Kontrollera att användaren har `role: 'admin'`
3. Kontrollera **Logs** för authentication-fel

### **Om API:er inte fungerar:**
1. Kontrollera **Settings → API** → API keys
2. Kontrollera `.env.local` har rätt nycklar
3. Starta om servern efter ändringar

## **Nästa Steg**

Efter att allt är verifierat:
1. Testa alla admin-funktioner
2. Skapa test-data
3. Testa public storefront
4. Dokumentera setup
