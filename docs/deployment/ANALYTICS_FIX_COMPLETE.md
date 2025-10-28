# Analytics Fix - Product View Events

## Problem
`product_viewed` events loggades på både PLP (Product List Pages) och PDP (Product Detail Pages), vilket skapade förvirring i analytics.

## Lösning Implementerad

### 1. Tog bort felaktig tracking
- **Fil**: `app/shop/components/product-card/index.tsx`
- Tog bort `useEffect` som trackade `product_viewed` för varje produkt i listan
- Detta var orsaken till att PLP-sidor loggade `product_viewed`

### 2. Lade till korrekt tracking för PLP
- **Fil**: `app/shop/components/product-list-content.tsx`
- Tracking: `product_list_viewed`
- Loggas EN gång när användaren besöker produktlista
- Metadata: `productCount`, `totalProducts`, `hasFilters`

### 3. Lade till korrekt tracking för PDP
- **Fil**: `app/product/[handle]/components/product-view-tracker.tsx` (ny fil)
- Tracking: `product_viewed`
- Loggas när användaren besöker individuell produktsida
- Metadata: `productId`, `productName`, `productHandle`, `productType`

### 4. Uppdaterade EventType
- **Fil**: `lib/analytics/event-tracker.ts`
- Lade till `product_list_viewed` i `EventType`

## Fixa Gamla Events

Om du fortfarande ser `product_viewed` events på `/shop` sidor, det är GAMLA EVENTS från databasen.

### Kör SQL Migrationen:

1. Öppna Supabase SQL Editor
2. Kopiera SQL från `docs/deployment/FIX_PRODUCT_VIEW_EVENTS.sql`
3. Kör SELECT-queries först för att se vad som finns
4. Uncomment och kör UPDATE-statementet för att konvertera events
5. Verifiera resultatet

### SQL använder:
```sql
UPDATE user_events
SET 
  event_type = 'product_list_viewed',
  event_metadata = event_metadata || jsonb_build_object(
    'converted_from', 'product_viewed',
    'original_event_type', 'product_viewed'
  )
WHERE event_type = 'product_viewed';
```

## Deploy

För att få nya tracking-koden på production:

```bash
git add .
git commit -m "Fix: Separate product_list_viewed and product_viewed tracking"
git push
```

Sedan deploy till production/Vercel.

## Resultat Efter Fix

- `/shop` sidor → `product_list_viewed`
- `/product/[handle]` sidor → `product_viewed`
- Gamla events kan konverteras med SQL

## Verifiera

Efter deploy:
1. Besök `/shop` → Ska logga `product_list_viewed`
2. Besök `/product/any-handle` → Ska logga `product_viewed`
3. Se events på `/admin/analytics`

