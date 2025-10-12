# Svenska Kort & BankID - Felsökning

## Problem: "Ditt kort har nekats" efter BankID

### Orsaker till Avslag:

#### 1. **Off-Session Payments Blockerade**
Svenska banker är försiktiga med "framtida betalningar" (off-session).
- Banken ser: "Tillåt framtida debiteringar utan BankID"
- Banken nekar: Säkerhetsrisk enligt deras policy

#### 2. **0 kr Transaktion**
- SetupIntent gör ingen faktisk debitering (0 kr)
- Vissa banker kräver en liten verifieringsavgift (1-10 kr)
- 0 kr kan trigga fraud-detection

#### 3. **Korttyp**
- Vissa debit-kort tillåter inte off-session
- Kreditkort fungerar bättre
- Företagskort kan ha restriktioner

---

## Lösningar

### Lösning 1: Använd Kredit- istället för Debit-kort

**Testa med:**
- Kreditkort (Visa/Mastercard)
- Inte debit-kort kopplat direkt till konto

**Varför:**
- Kreditkort tillåter oftare off-session payments
- Mindre restriktioner från banker

---

### Lösning 2: Kontakta Din Bank

**Ring/chatta med banken:**
```
"Hej, jag försöker lägga till mitt kort på en webbplats (PACT/pactwines.com) 
för framtida betalningar via Stripe. Transaktionen nekas efter BankID. 
Kan ni tillåta 'recurring payments' eller 'merchant-initiated transactions' 
för mitt kort?"
```

**Banker som ofta funkar:**
- SEB
- Nordea
- Handelsbanken

**Banker som kan vara krångliga:**
- Vissa digitala banker
- Utländska kort i Sverige

---

### Lösning 3: Prova Olika Kort

Om du har flera kort, testa:
1. Ett annat kort från samma bank
2. Ett kort från annan bank
3. Ett kredit- istället för debit-kort
4. Företagskort (om applicable)

---

### Lösning 4: Stripe Test Mode (Temporär Lösning)

**För utveckling/testning:**
```
Använd test-kort:
4242 4242 4242 4242
Datum: 12/28
CVC: 123

Detta kortet:
✅ Går alltid igenom
✅ Kräver inte BankID
✅ Sparas i Stripe
⚠️ Fungerar bara i test mode
```

---

## Tekniska Detaljer

### Vad SetupIntent Gör:

```typescript
// Stripe skapar en "framtida betalning"-auktorisering
setupIntent.create({
  customer: customerId,
  payment_method_types: ['card'],
  usage: 'off_session', // ← Detta kan vara problemet
})
```

**"off_session" betyder:**
- "Vi kommer debitera detta kort senare utan att kunden är närvarande"
- Kräver stark autentisering (BankID i Sverige)
- Vissa banker tillåter inte detta

---

### Alternativ Setup (Om Problemet Kvarstår)

#### Option 1: Ändra till "on_session"
```typescript
// Kräver att kunden är närvarande vid varje betalning
usage: 'on_session'
```
**Konsekvens:** Kunden måste godkänna varje betalning

#### Option 2: Använd Payment Intent med 1 kr
```typescript
// Debitera 1 kr för att verifiera kortet
// Återbetala direkt
amount: 100, // 1 SEK
currency: 'sek',
```
**Konsekvens:** Kunden ser 1 kr transaktion (återbetalas)

#### Option 3: Använd Stripe Billing
```typescript
// Skapa subscription (even if not charging regularly)
// Banker godkänner subscriptions lättare
```

---

## Stripe Dashboard Kontroller

### Kolla Declined Attempts:

1. **Stripe Dashboard → Payments**
2. **Filter:** Failed/Incomplete
3. **Kolla på declined setup intents**
4. **Klicka på en** för att se decline reason

**Vanliga Decline Codes:**
- `card_declined` - Banken nekade
- `authentication_required` - BankID krävs men misslyckades
- `insufficient_funds` - Inte tillräckligt saldo
- `card_not_supported` - Korttyp inte supportad för off-session

---

## Rekommendationer

### För Produktion (Nu):

**1. Testa med Olika Kort:**
- Prova 2-3 olika kort
- Olika banker
- Kredit vs Debit
- Se vilket som fungerar

**2. Dokumentera:**
```
Kort som FUNGERAR:
- SEB Kreditkort ✅
- Nordea Mastercard ✅

Kort som INTE FUNGERAR:
- Revolut Debit ❌
- N26 Debit ❌
```

**3. User Guidance:**
Lägg till text på payment method page:
```
"Note: Some debit cards may not work for future payments. 
Please try a credit card if you experience issues."

"Obs: Vissa betalkort fungerar inte för framtida betalningar. 
Prova ett kreditkort om du får problem."
```

---

### För Framtiden:

**1. Lägg Till Support för Swish** (Populärt i Sverige)
```typescript
payment_method_types: ['card', 'swish']
```

**2. Lägg Till Support för Klarna**
```typescript
payment_method_types: ['card', 'klarna']
```

**3. Gör Single-Payment Option**
- Istället för "spara för framtiden"
- "Betala varje gång" (on_session)
- Mer banker accepterar

---

## Quick Fixes

### Fix 1: Lägg Till Felmeddelande för User

I `app/profile/page.tsx`, uppdatera error handling:

```typescript
const handleAddPaymentMethod = async () => {
  try {
    // ... existing code
  } catch (error) {
    toast.error(
      "Could not add payment method. Please try a different card or contact your bank.",
      { duration: 5000 }
    );
  }
};
```

### Fix 2: Lägg Till Instruktioner

Lägg till text på profile page:
```tsx
<p className="text-xs text-muted-foreground mb-4">
  💡 If your card is declined, please try:
  <br />• A credit card instead of debit card
  <br />• A card from a different bank
  <br />• Contacting your bank to enable "recurring payments"
</p>
```

---

## Testa Nu:

### Test 1: Prova Annat Kort
1. Gå till /profile
2. Add Payment Method
3. Använd ett **kreditkort** (inte debit)
4. Genomför BankID
5. Se om det går igenom

### Test 2: Kolla Stripe Logs
1. Stripe Dashboard (Live mode)
2. Developers → Logs
3. Hitta den senaste setup_intent
4. Kolla decline reason

---

## Support från Stripe

Om problemet kvarstår:

1. **Stripe Support Chat:**
   - Dashboard → Help (högst upp)
   - Beskriv: "Swedish customers getting card declined after BankID for SetupIntent"
   - De kan ge specifik guidance för svenska kort

2. **Stripe Radar Settings:**
   - Settings → Radar
   - Kolla om "Block off-session payments" är aktiverat
   - Överväg att justera rules

---

## Sammanfattning

**Problemet:**
- Svenska banker är försiktiga med off-session payments
- BankID godkänns men bank nekar ändå
- 0 kr transaktion kan trigga säkerhet

**Snabba Fixes:**
1. ✅ Testa kreditkort istället för debit
2. ✅ Prova kort från annan bank
3. ✅ Kontakta bank för att aktivera recurring payments
4. ✅ Kolla Stripe logs för exact decline reason

**Långsiktiga Lösningar:**
- Lägg till Swish/Klarna som alternativ
- Implementera 1 kr verification charge
- Lägg till on-session payment option

**Det är ett vanligt problem med svenska banker och Stripe!**  
Kreditkort brukar fungera bättre än debit-kort.

