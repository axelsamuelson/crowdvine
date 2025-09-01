# 🔧 **Email-bekräftelse Problem - Lösningsguide**

## **Problem 1: Saknade Miljövariabler**

### **Steg 1: Skapa .env.local fil**
Skapa en fil som heter `.env.local` i projektets rot med följande innehåll:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Stripe Configuration  
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Application Configuration
APP_URL=http://localhost:3000
```

### **Steg 2: Hitta dina Supabase-nycklar**
1. Gå till [Supabase Dashboard](https://supabase.com/dashboard)
2. Välj ditt projekt
3. Gå till **Settings** → **API**
4. Kopiera:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## **Problem 2: Email-bekräftelse Inaktiverat**

### **Steg 1: Aktivera Email-bekräftelse**
1. Gå till **Supabase Dashboard** → **Authentication** → **Settings**
2. Under **Email Auth**, aktivera:
   - ✅ **Enable email confirmations**
   - ✅ **Enable email signups**

### **Steg 2: Konfigurera Email Templates**
1. Gå till **Authentication** → **Email Templates**
2. Kontrollera att **Confirm signup** template är konfigurerad
3. Testa att skicka ett test-email

## **Problem 3: Testa Systemet**

### **Steg 1: Starta om servern**
```bash
npm run dev
```

### **Steg 2: Testa debug-funktioner**
1. Gå till `http://localhost:3000/admin/login`
2. Klicka på **"Kontrollera email-inställningar"**
3. Se vad som rapporteras

### **Steg 3: Testa resend**
1. Försök skapa en ny admin-användare
2. Klicka på **"Skicka om bekräftelsemail"**
3. Kontrollera både inkorg och spam-mapp

## **Vanliga Fel och Lösningar**

### **"Your project's URL and Key are required"**
- ✅ Kontrollera att `.env.local` finns
- ✅ Kontrollera att nycklarna är korrekta
- ✅ Starta om servern efter att ha lagt till `.env.local`

### **"Email-bekräftelse är inaktiverat"**
- ✅ Gå till Supabase Dashboard → Authentication → Settings
- ✅ Aktivera "Enable email confirmations"

### **"Ingen användare hittades"**
- ✅ Kontrollera att du använder rätt email-adress
- ✅ Skapa ett nytt konto istället

### **"För många försök"**
- ✅ Vänta några minuter
- ✅ Kontrollera rate limiting i Supabase

## **Debugging Tips**

### **Kontrollera Console**
Öppna browser console (F12) och kolla efter felmeddelanden.

### **Kontrollera Network Tab**
I browser dev tools, kolla Network-tabben för att se API-anrop.

### **Kontrollera Supabase Logs**
1. Gå till Supabase Dashboard → Logs
2. Kolla efter email-relaterade fel

## **Nästa Steg**

Efter att du har fixat miljövariablerna:
1. Testa debug-knappen
2. Testa att skapa en ny admin-användare
3. Kontrollera att email kommer fram
4. Verifiera att inloggning fungerar
