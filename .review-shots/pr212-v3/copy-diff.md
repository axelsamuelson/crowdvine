# PACT copy changes — PR212 round 2 (points 6–7)

Readable before/after for Margaux. **Dirty Wine / legal payment-timing copy left unchanged.**

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

---

## PLP intro (`lib/shop/shop-root-natural-wine-content.ts`)

| Field | Old SV | New SV |
| --- | --- | --- |
| `intro` | … Du köper flaskor online, och vinet **levereras till Stockholm när pallen är full.** | … Du köper flaskor online, och vinet **levereras hem till dig när pallen stänger.** |
| `aboutText` | Du **reserverar** … **till Stockholm när pallen är full.** | Du **köper** … **hem till dig när pallen stänger.** |
| FAQ “Hur köper…” | På PACT **reserverar** du … | På PACT **köper** du … |
| longDescription closing | När tillräckligt många har **reserverat** … skickas den **till Stockholm**. | När tillräckligt många har **köpt** … skickas den. |

| Field | Old EN | New EN |
| --- | --- | --- |
| `intro` | … delivered **to Stockholm when the pallet is full.** | … delivered **to your door when the pallet closes.** |
| `aboutText` | You **reserve** … **to Stockholm when the pallet is full.** | You **buy** … **to your door when the pallet closes.** |
| FAQ “How do I buy…” | On PACT you **reserve** the natural wines… | On PACT you **buy** the natural wines… |
| longDescription closing | When enough people have **reserved** … ships **to Stockholm**. | When enough people have **bought** … ships. |

Dirty Wine intros (`SV_DIRTYWINE_INTRO` / `EN_DIRTYWINE_INTRO`) still use **reserverar / reserve + Stockholm** — unchanged.

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
| EN | step 1 | Discover & **Reserve** / **Reserve** the bottles | Discover & **buy** / **Buy** the bottles |
| EN | step 3 | from **reservation** to delivery | from **order** to delivery |

Payment-timing sentences: none altered on about (no “card charged when…” lines here).

---

## Invite / how-it-works

| File | Old | New |
| --- | --- | --- |
| `how-pact-works-section.tsx` pill | Reservera | Köp |
| same, title | Reservera, betala senare | Köp, betala senare |
| same, description | Debiteras när pallen avgår. | **unchanged** (payment timing) |
| same, legend | reserverad | köpt |
| `how-it-works-section.tsx` | Reserve in a pallet / Reserve your bottles… | Buy in a pallet / Buy your bottles… |
| `WineDiscoverySection.tsx` | Reservera → | Köp → |
| `PalletActivitySection.tsx` | reserverad | köpt |

---

## Category SEO / long copy (`lib/wine-category-content.ts`)

Pattern replacements (SV):

- `Du reserverar flaskor online` → `Du köper flaskor online`
- `Du reserverar online` → `Du köper online`
- `…skickas vinet till Stockholm` / `hemleverans i Stockholm` → home delivery / when pallet closes (no Stockholm)
- `har reserverat` → `har köpt`

Pattern replacements (EN):

- `You reserve bottles online` → `You buy bottles online`
- `You reserve online` → `You buy online`
- `Reserve online and the wine is delivered when the pallet is full.` → `Buy online and the wine is delivered to your door when the pallet closes.`
- `Reserve before the pallet to Stockholm fills.` → `Buy before the pallet fills.`

No Budbee named. No payment-charge timing sentences in this file were edited.

---

## Producer shop blurbs (`lib/producer-shop-content.ts`)

| Pattern | New |
| --- | --- |
| reservera innan pallen till Stockholm fylls | köp innan pallen fylls |
| Reservera de flaskor… | Köp de flaskor… |
| reserve before the pallet to Stockholm fills | buy before the pallet fills |
| Reserve the bottles… | Buy the bottles… |

---

## Left unchanged (explicit)

- Dirty Wine UI strings via `shop.reserveDirty` / Dirty Wine shop intros
- `content/legal/kopvillkor*` reservation + payment-when-pallet-closes wording
- Checkout strings that already say payment is taken when the pallet closes (e.g. invite “Debiteras när pallen avgår”, `placeReservationWithPayment`)
- Analytics event type names (`reservation_completed`, etc.)
