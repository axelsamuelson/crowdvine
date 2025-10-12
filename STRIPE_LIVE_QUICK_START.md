# Stripe Live Mode - Quick Start

## ✅ Du har aktiverat Stripe Live Mode - Bra!

## 🎯 Snabbguide (5 steg)

### 1. Hämta Live Keys från Stripe

**I Stripe Dashboard:**
1. Gå till https://dashboard.stripe.com
2. Växla till **"Live mode"** (toggle högst upp till höger)
3. Gå till **Developers → API keys**
4. Kopiera:
   - **Secret key** (börjar med `sk_live_...`)
   - **Publishable key** (börjar med `pk_live_...`)

---

### 2. Uppdatera Vercel Environment Variables

**I Vercel Dashboard:**
1. Gå till ditt projekt → **Settings → Environment Variables**
2. Uppdatera dessa variabler:

```
STRIPE_SECRET_KEY
→ Klistra in din sk_live_... key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  
→ Klistra in din pk_live_... key
```

3. **Viktigt:** Välj **"Production"** environment
4. Klicka **Save**

---

### 3. Redeploya

**Option A - Auto redeploy:**
```bash
git commit --allow-empty -m "Update Stripe to live mode"
git push origin main
```

**Option B - Manual redeploy:**
1. Vercel Dashboard → Deployments
2. Klicka på senaste deployment → **... → Redeploy**

---

### 4. Testa (Efter 1-2 min)

1. Gå till https://pactwines.com/profile
2. Klicka **"Add Payment Method"**
3. Lägg till test-kort:
   ```
   Kortnummer: 4242 4242 4242 4242
   Datum: 12/28
   CVC: 123
   ZIP: 12345
   ```
4. Klicka **Submit**
5. Du ska redirectas tillbaka
6. Toast: "Payment method added successfully!" ✅
7. Kortet visas i listan ✅

---

### 5. Verifiera i Stripe

1. Gå till Stripe Dashboard (**Live mode**)
2. **Customers** → Hitta kund via email
3. Kolla **Payment methods** tab
4. Kortet ska finnas där! ✅

---

## ✅ Vad Som Fungerar Nu

### Payment Methods (Sparande av kort)
- ✅ Användare kan lägga till betalkort
- ✅ Kort sparas säkert i Stripe
- ✅ PCI-compliant (Stripe hanterar kortdata)
- ✅ Fungerar i live mode
- ✅ Visas på profile-sidan
- ✅ Väljs i checkout

### Stripe Integration
- ✅ Stripe SDK v18.5.0
- ✅ SetupIntents (kortinsamling)
- ✅ Customer creation
- ✅ Hosted Checkout (säkert)

---

## ⚠️ Vad Som INTE Är Implementerat (Än)

### Betalningar (Charging)
- ❌ Inga betalningar tas ut automatiskt
- ❌ Reservationer skapas men kort debiterats inte
- ❌ PaymentIntents inte implementerat

**Nuvarande beteende:**
1. User lägger till kort → ✅ Sparat
2. User gör reservation → ✅ Reservation skapad
3. Kort debiteras? → ❌ NEJ

**Om du vill debitera:**
- Behöver implementera PaymentIntent
- Kan göra det senare om du vill

### Webhooks
- ❌ Ingen webhook endpoint
- ❌ Ingen bekräftelse från Stripe events
- ❌ Kan inte ta emot payment_succeeded events

---

## 🚨 Viktiga Säkerhetskontroller

Innan du tar emot riktiga betalningar:

### Vercel Environment Variables
```
✅ STRIPE_SECRET_KEY börjar med sk_live_ (inte sk_test_)
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY börjar med pk_live_
✅ Scope = Production (inte Preview/Development)
```

### Stripe Dashboard Settings
1. **Business Details** fylld i (företagsnamn, adress)
2. **Bank Account** kopplad (för utbetalningar)
3. **Tax ID** tillagt (om applicable)
4. **Email Notifications** aktiverade

### Testing Före Live
```
⚠️ Testa med test-kort först (4242...)
⚠️ Verifiera kort sparas korrekt
⚠️ Kolla Stripe Dashboard för fel
⚠️ Testa hela flödet end-to-end
```

---

## 📊 Monitoring

### Daglig Check:
- Stripe Dashboard → Payments (se misslyckade)
- Vercel → Functions → Errors
- User-rapporterade problem

### Veckovis:
- Antal nya customers
- Sparade payment methods
- API error rate

---

## 🆘 Troubleshooting

### "Stripe is not configured"
```
→ Vercel env vars inte satta
→ Kolla STRIPE_SECRET_KEY finns
→ Redeploya
```

### Kort sparas inte
```
→ Kolla browser console
→ Kolla Stripe Dashboard → Logs
→ Verifiera publishable key är live
```

### 401/403 Errors
```
→ User inte autentiserad
→ Stripe customer inte skapad
→ Kolla user.email finns
```

---

## ✨ Sammanfattning

**Nuläge:**
- ✅ Stripe Live aktiverat
- ✅ Kortinsamling fungerar
- ✅ Kunder skapas i Stripe
- ⚠️ Behöver uppdatera keys i Vercel
- ⚠️ Betalningar tas inte ut (inte implementerat)

**Nästa Steg:**
1. Uppdatera Vercel med live keys
2. Redeploya
3. Testa kortinsamling
4. Verifiera i Stripe Dashboard

**Senare (Om ni vill ta betalt):**
- Implementera PaymentIntent
- Lägg till webhook handler
- Testa charging-flöde

---

## Hjälp Behövs?

Om något inte fungerar:
1. Dela Vercel logs (Functions tab)
2. Dela Stripe logs (Dashboard → Developers → Logs)
3. Dela browser console errors
4. Beskriv vad som händer vs vad som förväntas

**Din Stripe-integration är redo för live mode kortinsamling!** 🎉

Vill du att jag implementerar faktisk betalning (charging) också, eller räcker det med kortinsamling för nu?

