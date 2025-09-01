# Supabase Auth-konfiguration som behöver kontrolleras

## 1. Email Templates
- Gå till Supabase Dashboard > Authentication > Email Templates
- Kontrollera att email-templates finns för:
  - Confirm signup
  - Magic link
  - Change email address
  - Reset password

## 2. Auth Settings
- Gå till Supabase Dashboard > Authentication > Settings
- Kontrollera:
  - [ ] "Enable email confirmations" är AV
  - [ ] "Enable phone confirmations" är AV (om du inte använder telefon)
  - [ ] "Enable signups" är PÅ
  - [ ] "Enable email change" är PÅ (om du vill tillåta email-ändringar)

## 3. Site URL
- Gå till Supabase Dashboard > Authentication > URL Configuration
- Sätt Site URL till: `http://localhost:3000`
- Lägg till Redirect URLs:
  - `http://localhost:3000/admin`
  - `http://localhost:3000/admin/login`

## 4. Service Role Key
- Gå till Supabase Dashboard > Settings > API
- Kopiera "service_role" key (inte anon key)
- Lägg till i .env.local som SUPABASE_SERVICE_ROLE_KEY

## 5. RLS Policies
- Kör SQL-scriptet: scripts/setup-profiles-table.sql
- Detta skapar profiles-tabellen och RLS-policies

## 6. Testa konfigurationen
1. Skapa .env.local med rätt värden
2. Starta om servern: `npm run dev`
3. Gå till http://localhost:3000/admin/login
4. Skapa ett admin-konto
5. Logga in med det nya kontot
