# PDP Product JSON-LD — availability, identifiers, return/shipping

Task: `admin_tasks` `a4f4a514`. No visible UI changes.

## Availability logic

Resolved by `resolveProductOfferAvailability` in `lib/seo/product-json-ld.ts`:

| Condition | schema.org availability |
| --- | --- |
| `availableForSale === false` (sold out / not listed) | `https://schema.org/OutOfStock` |
| `availableForSale` and direct delivery selectable for SE (`buildDirectBoxUiAvailability({ countryCode: "SE" }).deliverySelectable`) | `https://schema.org/InStock` |
| `availableForSale` and shared-pallet default (direct delivery not selectable) | `https://schema.org/PreOrder` |

Rationale: shared-pallet fulfilment ships only after the pallet closes, so PreOrder is correct. InStock is reserved for wines that can be delivered now via direct delivery when that channel is actually offered. Production keeps direct delivery behind an explicit env flag (default off), so live PDPs use PreOrder for in-assortment wines.

## sku and gtin / EAN coverage

- `sku` is the wine `handle` (fallback: wine `id`).
- `gtin` / `gtin13` is emitted only when a real EAN-13 is passed into `buildProductPdpJsonLd`.
- Database check on TEST project `crowdvine-checkout-audit` (`msdfjrrokcmjifetuwgc`): **no** `ean` / `gtin` / `barcode` column on `wines` or any other `public` table. Codebase migrations likewise have no EAN field.
- **EAN coverage: 0 wines** (field does not exist). Prod was not queried.

## hasMerchantReturnPolicy (from published terms)

`applicableCountry`: `SE`.

Quotes from published terms:

**SV** (`content/legal/source/kopvillkor.sv.md` §9):

> Du har 14 dagars ångerrätt enligt lagen (2005:59) om distansavtal och avtal utanför affärslokaler. Ångerfristen börjar dagen efter att du har tagit emot vinet.

**SV** (`content/legal/source/kopvillkor.sv.md` §8):

> Vid retur betalar du den faktiska returfraktkostnaden, utan påslag.

**SV** (§9, refund):

> Vi betalar tillbaka hela beloppet, inklusive den ursprungliga leveranskostnaden för standardleverans, senast 14 dagar efter att vi fått ditt meddelande.

**EN** (`content/legal/source/kopvillkor.en.md` §9):

> You have a 14-day right of withdrawal under lagen (2005:59) om distansavtal och avtal utanför affärslokaler. The withdrawal period starts the day after you have received the wine.

**EN** (§8):

> In the event of a return, you pay the actual cost of return shipping, without any mark-up.

**EN** (§9, refund):

> We refund the full amount, including the original delivery cost for standard delivery, no later than 14 days after we received your notice.

Mapped fields:

- `returnPolicyCategory` → `MerchantReturnFiniteReturnWindow`
- `merchantReturnDays` → `14`
- `returnFees` → `ReturnFeesCustomerResponsibility`
- `refundType` → `FullRefund`
- `returnMethod` → `ReturnByMail` (customer must send goods back; terms: “Skicka sedan tillbaka varorna…”)
- `url` → `https://pactwines.com/villkor`

## shippingDetails (from published terms only)

- Always: `shippingDestination.addressCountry = SE` (Sweden home delivery market in the terms).
- Shared pallet / PreOrder: **no** `shippingRate` and **no** `deliveryTime` — the terms do not name a fixed shared-pallet shipping amount or a fixed calendar transit window (pallet fill has no deadline).
- Direct delivery / InStock: `shippingRate` `149.00` `SEK` from terms (“frakten är 149 kr per låda om 6 flaskor” / “shipping is 149 kr per box of 6 bottles”). `deliveryTime` omitted because the terms say “5–10 working days”, which is not the same as schema.org calendar `DAY`.

Carriers are never named in the schema output.
