# PACT copy changes — PR212 round 2 + Margaux approval

Readable before/after. **Dirty Wine / `content/legal/kopvillkor*` left unchanged.**

## Decision: `shop.addCase`

Code path (`ShopWineCasePicker` / `CaseModeSelector` / `add-quantity`) **adds bottles to the cart**, it does not jump straight to checkout.

**Chosen label:** SV `Lägg i varukorgen` · EN `Add to cart`  
(Not “Köp låda” / “Buy case”.)

Dirty Wine keeps Reservera via new key `shop.reserveDirty`.

---

## Message keys (`messages/sv.json` + `messages/en.json`)

| Key | Old SV | New SV | Old EN | New EN |
| --- | --- | --- | --- | --- |
| `shop.reserve` | Reservera | Köp | Reserve | Buy |
| `shop.addCase` | Reservera | Lägg i varukorgen | Reserve | Add to cart |
| `shop.reserveDirty` *(new)* | — | Reservera | — | Reserve |
| `shop.buy` | Köp | Köp *(unchanged)* | Buy | Buy *(unchanged)* |
| `cart.bottlesCount` *(new)* | — | `{count, plural, one {# flaska} other {# flaskor}}` | — | `{count, plural, one {# bottle} other {# bottles}}` |
| `cart.addMoreBottlesOutlineCta` *(new)* | — | `{needed, plural, one {+ Lägg till 1 flaska till} other {+ Lägg till # flaskor till}}` | — | `{needed, plural, one {+ Add 1 more bottle} other {+ Add # more bottles}}` |
| `cart.needMoreMixHint` *(new)* | — | plural: `1 flaska till – …` / `# flaskor till – …` | — | plural: `1 more bottle – …` / `# more bottles – …` |
| `cart.bottleProgressFull` | … – lådan är full | … – lådan är full *(SV unchanged)* | … – the box is full | … – your case is full |
| `checkout.stripeCardSavedOnShip` | … debiteras först när pallen **skickas** | … när pallen **stänger** | … charged only when the pallet **ships** | … when the pallet **closes** |
| `checkout.successChargeDeadlineHint` | … när pallen **fylls** … | … när pallen **stänger** … | … when the pallet **fills** … | … when the pallet **closes** … |

---

## PLP intro (`lib/shop/shop-root-natural-wine-content.ts`)

| Field | Old SV | New SV |
| --- | --- | --- |
| `intro` | … Du köper flaskor online, och vinet **levereras till Stockholm när pallen är full.** | … Du köper flaskor online, och vinet **levereras hem till dig när pallen stänger.** |
| `aboutText` | Du **reserverar** … **till Stockholm när pallen är full.** | Du **köper** … **hem till dig när pallen stänger.** |
| FAQ “Hur köper…” | På PACT **reserverar** du … | På PACT **köper** du … |
| longDescription closing | … skickas den. | … **skickas den hem till dig.** |

| Field | Old EN | New EN |
| --- | --- | --- |
| `intro` | … delivered **to Stockholm when the pallet is full.** | … delivered **to your door when the pallet closes.** |
| `aboutText` | You **reserve** … **to Stockholm when the pallet is full.** | You **buy** … **to your door when the pallet closes.** |
| FAQ “How do I buy…” | On PACT you **reserve** the natural wines… | On PACT you **buy** the natural wines… |
| longDescription closing | … it ships. | … **ships to your door.** |

Dirty Wine intros still use **reserverar / reserve + Stockholm** — unchanged.

---

## About page (`lib/i18n/about-page-content.ts`)

| Locale | Spot | Old | New |
| --- | --- | --- | --- |
| SV | meta description | Reservera naturvin online… Stockholm | Köp naturvin online… (no Stockholm) |
| SV | card 2 | Privatpersoner **reserverar** … till Stockholm | Privatpersoner **köper** … (no Stockholm) |
| SV | step 1 title/body | Upptäck & **reservera** / **reservera** de du vill ha | Upptäck & **köp** / **köp** de du vill ha |
| SV | step 3 | från **reservation** till… | från **köp** till… |
| EN | meta description | **Reserve** natural wine… Stockholm | **Buy** natural wine… (no Stockholm) |
| EN | card 2 | consumers **reserve** / bottles are **reserved** | consumers **buy** / bottles are **bought** |
| EN | step 1 title | Discover & **buy** | Discover & **Buy** |
| EN | step 1 body | **Reserve** the bottles… | **Buy** the bottles… |
| EN | step 3 | from **reservation** to delivery | from **order** to delivery |

---

## Invite / how-it-works (`how-pact-works-section.tsx`)

| Spot | Old SV | New SV | Old EN | New EN |
| --- | --- | --- | --- | --- |
| step 02 title | Köp, betala senare | **Köp nu – betala när pallen stänger** | — | **Buy now – pay when the pallet closes** |
| step 02 description | Debiteras när pallen **avgår**. | Debiteras när pallen **stänger**. | — | **Charged when the pallet closes.** |
| pill | Reservera → Köp | Köp | — | Buy |
| legend | reserverad → köpt | köpt | — | — |

---

## Category SEO / long copy (`lib/wine-category-content.ts`)

- `Du reserverar…` → `Du köper…` / `You reserve…` → `You buy…`
- `Buy before the pallet fills.` → **`Buy before the pallet closes.`**
- Home delivery / pallet closes (no Stockholm) where previously Stockholm

---

## Producer shop blurbs (`lib/producer-shop-content.ts`)

| Pattern | New |
| --- | --- |
| köp innan pallen **fylls** | köp innan pallen **stänger** |
| buy before the pallet **fills** | buy before the pallet **closes** |

---

## Left unchanged (explicit)

- Dirty Wine UI strings via `shop.reserveDirty` / Dirty Wine shop intros
- `content/legal/kopvillkor*` reservation + payment-when-pallet-closes wording
- Analytics event type names (`reservation_completed`, etc.)
- Delivery-window copy that says “when the pallet ships” (not charge timing), e.g. `successStep3`
