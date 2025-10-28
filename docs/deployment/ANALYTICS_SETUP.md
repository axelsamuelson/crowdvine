# Analytics Setup Guide

## Problem
Analytics-sidan på `/admin/analytics` visar inga data eftersom migrationen inte körts och databastabellerna saknas.

## Lösning

### Steg 1: Skapa Analytics Tabeller

Kör SQL-migrationen i Supabase SQL Editor:

1. Öppna Supabase Dashboard: https://app.supabase.com
2. Välj ditt projekt (PACT Wines)
3. Gå till "SQL Editor" i menyn
4. Klistra in innehållet från `docs/deployment/ANALYTICS_MIGRATION.sql`
5. Klicka "Run" för att köra migrationen

Alternativt kan du klistra in hela SQL-filen direkt i Supabase SQL Editor.

### Steg 2: Verifiera att Tabellerna Skapas

Efter att migrationen körts, kontrollera att följande finns:

1. **Tabell**: `user_events`
   - Där användarhändelser sparas
   
2. **View**: `user_journey_funnel`
   - För konvertering och funnel-analys
   
3. **Funktion**: `get_cohort_analysis()`
   - För kohortanalys

### Steg 3: Event Tracking

Event tracking har lagts till i följande flöden:

#### Access Request Flow
- **Komponent**: `components/form-access-request.tsx`
- **Event**: `access_request_submitted` när en access request skickas
- **Event**: `access_approved` när användare godkänns via invitation code

#### Login Flow
- **Komponent**: `app/log-in/page.tsx`
- **Event**: `user_first_login` när användare loggar in för första gången

#### Checkout Flow
- **API Route**: `app/api/checkout/setup/route.ts`
- **Event**: `checkout_started` när checkout börjar
- Tracking sker automatiskt när användare startar checkout

#### Add to Cart
- **Komponent**: `components/cart/add-to-cart.tsx`
- **Event**: `add_to_cart` när produkter läggs till i kundvagnen
- Redan implementerad med `AnalyticsTracker.trackAddToCart()`

### Steg 4: Testa Analytics-sidan

1. Logga in som admin: https://pactwines.com/admin
2. Navigera till: https://pactwines.com/admin/analytics
3. Sidan bör nu visa:
   - Konverteringsfunnel
   - Event timeline
   - Cohort analysis
   - User journeys

### Steg 5: Verifiera att Events Loggas

Kontrollera att events faktiskt loggas:

1. Gå till Supabase → SQL Editor
2. Kör query:
```sql
SELECT * FROM user_events 
ORDER BY created_at DESC 
LIMIT 10;
```

Du bör se events från användaraktiviteter.

## Event Types

Analytics-systemet trackar följande event types:

### Auth Events
- `access_request_submitted` - När användare skickar access request
- `access_approved` - När access godkänns
- `user_first_login` - Första gången användare loggar in
- `user_login` - Normal login
- `user_logout` - Logout

### Cart Events  
- `add_to_cart` - Produkt läggs i kundvagnen
- `remove_from_cart` - Produkt tas bort
- `cart_opened` - Kundvagn öppnas
- `cart_validation_passed` - Validation går igenom

### Checkout Events
- `checkout_started` - Checkout börjar
- `checkout_completed` - Checkout slutförs
- `reservation_completed` - Reservation komplett

## Felsökning

### Problem: Tabellerna finns inte
**Lösning**: Kör migrationen igen i Supabase SQL Editor

### Problem: Inga data på analytics-sidan
**Lösning**: 
1. Kontrollera att `user_events` tabellen innehåller data
2. Kontrollera RLS policies är korrekta
3. Kontrollera att admin-rollen är korrekt satt för din profil

### Problem: Events loggas inte
**Lösning**:
1. Öppna browser console för att se event tracking errors
2. Kontrollera att Supabase connection fungerar
3. Verifiera att RLS policies tillåter INSERT för `user_events`

## Fixa Gamla Events

Om du har gamla `product_viewed` events som faktiskt var från produktlistor:

1. Gå till Supabase → SQL Editor
2. Öppna `docs/deployment/FIX_PRODUCT_VIEW_EVENTS.sql`
3. Kör SELECT-queries först för att se vad som kommer ändras
4. Uncomment UPDATE-statementet för att uppdatera events (valfritt)

**Viktigt**: Backup data innan du kör UPDATE-statements!

## Ytterligare Tracking

Om du vill lägga till mer tracking:

```typescript
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

// Track custom event
AnalyticsTracker.trackEvent({
  eventType: "custom_event",
  eventCategory: "engagement",
  metadata: { customData: "value" }
});

// Track page view
AnalyticsTracker.trackPageView({ page: "/custom-page" });
```

## Support

Om analytics-sidan fortfarande inte fungerar:
1. Kontrollera browser console för errors
2. Kontrollera Supabase logs för database errors
3. Verifiera att migrationen kördes korrekt

