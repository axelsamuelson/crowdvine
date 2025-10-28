# Pallet Data Flow Analysis

## Problem

Pallet page shows no wines or participants despite data existing in database.

## Database Schema Analysis

### Core Tables Involved

#### 1. `pallets`

```sql
- id (UUID, PK)
- name
- description
- delivery_zone_id (FK → pallet_zones)
- pickup_zone_id (FK → pallet_zones)
- cost_cents
- bottle_capacity
- created_at
- updated_at
```

#### 2. `order_reservations`

```sql
- id (UUID, PK)
- order_id
- user_id (FK → profiles)
- status
- created_at
- delivery_address
- total_cost_cents
- pallet_id (FK → pallets) ✅ ADDED via migration
- pickup_zone_id (FK → pallet_zones)
- delivery_zone_id (FK → pallet_zones)
```

#### 3. `order_reservation_items`

```sql
- id (UUID, PK)
- reservation_id (FK → order_reservations)
- item_id (FK → wines)
- quantity
- price_cents
```

#### 4. `wines`

```sql
- id (UUID, PK)
- wine_name
- vintage
- grape_varieties
- color
- label_image_path
- producer_id (FK → producers)
- base_price_cents
- handle
- description
- description_html
```

#### 5. `producers`

```sql
- id (UUID, PK)
- name
- region
- lat
- lon
- country_code
- address_street
- address_city
- address_postcode
- short_description
- logo_image_path
- pickup_zone_id (FK → pallet_zones)
- owner_id
- status
```

#### 6. `profiles`

```sql
- id (UUID, PK)
- email
- full_name
- phone
- address
- city
- postal_code
- country
```

## Data Flow

### Pallet Page → API Call Flow

1. **User visits**: `/pallet/[id]`
2. **Frontend** (`app/pallet/[id]/page.tsx`):
   - Fetches pallet metadata: `POST /api/pallet-data` (gets name, capacity, current_bottles)
   - Fetches reservations: `GET /api/pallet/[id]/reservations`

3. **API** (`/api/pallet/[id]/reservations`):

   ```typescript
   // Step 1: Get pallet info
   SELECT id, name, pickup_zone_id, delivery_zone_id, bottle_capacity
   FROM pallets
   WHERE id = palletId

   // Step 2: Get reservations
   SELECT id, order_id, user_id, status, created_at, delivery_address, total_cost_cents
   FROM order_reservations
   WHERE pallet_id = palletId

   // Step 3: For each reservation:
   //   a) Get user profile
   SELECT email, full_name
   FROM profiles
   WHERE id = reservation.user_id

   //   b) Get items
   SELECT item_id, quantity, price_cents,
          wines(wine_name, vintage, label_image_path, grape_varieties, color, producer_id)
   FROM order_reservation_items
   WHERE reservation_id = reservation.id

   //   c) Get producer names
   SELECT id, name
   FROM producers
   WHERE id IN (producer_ids)
   ```

## Current Issues Found

### ✅ FIXED Issues:

1. Authentication requirement removed ✅
2. Nested join `wines(producers(name))` split into separate queries ✅
3. `pallet_id` added to `order_reservations` table ✅

### ❓ POTENTIAL Issues to Check:

1. **Missing `price_cents` in `order_reservation_items`?**
   - API tries to fetch `price_cents` but field might not exist
   - Fallback to `|| 0` handles this

2. **Missing `bottles_reserved` field**
   - Calculated client-side from items.reduce()
   - Should work if items exist

3. **Wines table missing `producer_id`?**
   - Schema shows it exists: `producer_id UUID NOT NULL REFERENCES producers(id)`
   - Should be fine

## Expected API Response Structure

```json
[
  {
    "id": "reservation-uuid",
    "order_id": "order-uuid",
    "user_id": "user-uuid",
    "user_name": "Full Name",
    "user_email": "email@example.com",
    "total_bottles": 12,
    "total_cost_cents": 150000,
    "bottles_delivered": 0,
    "status": "placed",
    "created_at": "2025-01-...",
    "delivery_address": {...},
    "items": [
      {
        "wine_name": "Wine Name",
        "producer_name": "Producer Name",
        "quantity": 6,
        "price_cents": 75000,
        "vintage": "2021",
        "image_path": "/path/to/image.jpg",
        "grape_varieties": "Syrah",
        "color": "Red"
      }
    ]
  }
]
```

## Frontend Processing

```typescript
// Aggregate wines
const uniqueWines = allItems.reduce((acc, item) => {
  const key = `${item.wine_name}_${item.vintage}`;
  acc[key] = {
    wine_name: item.wine_name,
    vintage: item.vintage,
    color: item.color,
    grape_varieties: item.grape_varieties,
    total_reserved: (acc[key]?.total_reserved || 0) + item.quantity,
    image_path: item.image_path,
  };
  return acc;
}, {});

// Aggregate participants
const participantsMap = reservations.reduce((map, res) => {
  const userId = res.user_id;
  if (map.has(userId)) {
    map.get(userId).bottles_reserved += res.bottles_reserved;
  } else {
    map.set(userId, {
      id: userId,
      user_name: res.user_name,
      user_email: res.user_email,
      bottles_reserved: res.bottles_reserved,
      created_at: res.created_at,
    });
  }
  return map;
}, new Map());
```

## Testing Checklist

- [ ] Check if `order_reservations.pallet_id` is populated for existing data
- [ ] Verify `order_reservation_items` table has data
- [ ] Verify `wines.producer_id` is populated
- [ ] Check server logs for actual error messages
- [ ] Verify RLS policies don't block public access
- [ ] Test API endpoint directly: `GET /api/pallet/[id]/reservations`
- [ ] Check if `profiles` table has `full_name` field
- [ ] Verify `producers` table exists and has data

## Recommended Next Steps

1. Check server logs in Vercel for detailed error
2. Test API endpoint directly in browser/Postman
3. Verify database has data:
   ```sql
   SELECT COUNT(*) FROM order_reservations WHERE pallet_id = '3a4ddb5f...';
   SELECT COUNT(*) FROM order_reservation_items;
   SELECT COUNT(*) FROM profiles WHERE id IN (SELECT DISTINCT user_id FROM order_reservations);
   ```
