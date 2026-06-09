# Scroll Debug Guide - Systematic Isolation

## Översikt

Detta dokument beskriver hur man systematiskt felsöker scroll-buggen i ProductCard genom att lägga tillbaka komponenter en i taget och observera runtime-beteende via ScrollProbe.

## ScrollProbe UI

ScrollProbe är en fixed overlay i nedre vänstra hörnet som visar i realtid:
- **Wheel Events**: Om wheel-events detekteras (YES/NO)
- **defaultPrevented**: Om någon preventDefault() anropas på wheel-event (true/false/null)
- **deltaY**: Scroll-delta i Y-led
- **Target**: HTML-tag + första CSS-klass för elementet som fick wheel-event
- **scrollTop**: Nuvarande scroll-position för document.scrollingElement
- **Step**: Aktuellt SCROLL_STEP-värde

## Aktivera Debug Mode

1. Öppna `app/shop/components/product-card/index.tsx`
2. Sätt `DEBUG_SCROLL = true` (rad ~23)
3. Sätt `SCROLL_STEP = 0` (rad ~24)
4. Ladda om sidan - ScrollProbe ska visas i nedre vänstra hörnet

## SCROLL_STEP Matrix (0-13)

| Step | Vad som läggs till | Förväntat beteende |
|------|---------------------|-------------------|
| **0** | Minimal: `<div className="w-full aspect-[3/4] md:aspect-square bg-gray-300" />` | ✅ Scroll fungerar (KNOWN GOOD) |
| **1** | + `className="group"` på root | ✅ Scroll fungerar |
| **2** | + `relative` på root | ✅ Scroll fungerar |
| **3** | + `overflow-hidden` på root | ✅ Scroll fungerar |
| **4** | + tomma hover handlers: `onMouseEnter={() => {}}` `onMouseLeave={() => {}}` | ✅ Scroll fungerar |
| **5** | + exakt production root className (`bg-muted`) | ✅ Scroll fungerar |
| **6** | + Link "small" (liten länk i hörnet, INTE wrap hela kortet) | ✅ Scroll fungerar |
| **7** | + Link wrappar hela kortet (`block size-full`) men INGET overlay/CTA | ⚠️ **TESTA HÄR** |
| **8** | + visual overlay (pointer-events-none alltid) men INGA CTA/knappar | ⚠️ **TESTA HÄR** |
| **9** | + CTA wrappers med DUMMY buttons (inga riktiga komponenter) | ⚠️ **TESTA HÄR** |
| **10** | + AddToCartButton only | ⚠️ **TESTA HÄR** |
| **11** | + AddToCart (full component) | ⚠️ **TESTA HÄR** |
| **12** | + VariantSelector | ⚠️ **TESTA HÄR** |
| **13** | + production onTouchStart handler | ⚠️ **TESTA HÄR** |

## Testinstruktioner

För varje steg (0-13):

1. **Sätt SCROLL_STEP** till önskat värde i `index.tsx`
2. **Ladda om sidan** (full refresh, Cmd+Shift+R)
3. **Navigera till shop-sidan** (`/shop`)
4. **Hovra över ett produktkort** med musen
5. **Försök scrolla** med mushjulet (medan musen är över kortet)
6. **Observera ScrollProbe**:
   - Kolla om "Wheel Events" blir "YES" när du scrollar
   - Kolla om "defaultPrevented" blir `true` när scroll dör
   - Kolla om "scrollTop" ändras när du scrollar
   - Kolla "Target" för att se vilket element som får wheel-event

## Tolka ScrollProbe

### Scenario A: wheelPrevented = true när scroll dör
**Root cause**: Någon event listener anropar `preventDefault()` på wheel/touchmove
- **Åtgärd**: Sök efter `onWheel`, `addEventListener("wheel"`, `preventDefault` i koden
- **Lokalisera**: Kolla "Target" i ScrollProbe för att se vilket element som har listenern
- **Fix**: Ta bort preventDefault eller gör listener passive

### Scenario B: wheelPrevented = false men scrollTop ändras inte
**Root cause**: Fel scroll-container eller CSS/overlay/pointer capture
- **Åtgärd**: Kolla CSS för target-elementet (touch-action, overscroll-behavior, pointer-events)
- **Lokalisera**: Kolla "Target" i ScrollProbe
- **Fix**: Åsidosätt CSS eller fixa scroll-container

### Scenario C: Wheel Events = NO
**Root cause**: Wheel-events når inte fram till elementet
- **Åtgärd**: Kolla om något overlay blockerar events (z-index, pointer-events)
- **Fix**: Justera pointer-events eller z-index

## Identifiera Break Step

1. **Starta på Step 0** (KNOWN GOOD)
2. **Öka SCROLL_STEP med 1** i taget
3. **Testa scroll** efter varje steg
4. **När scroll slutar fungera**: Det är BREAK STEP
5. **Jämför med föregående steg**: Vad lades till som kan ha orsakat buggen?

## Efter Break Step Identifiering

När break step är identifierat:

1. **Sök i koden** efter misstänkta mekanismer:
   ```bash
   # I terminalen:
   grep -r "onWheel\|addEventListener.*wheel\|preventDefault\|stopPropagation\|setPointerCapture\|touch-action\|overscroll-behavior" app/shop/components/product-card/
   ```

2. **Prime suspects** (fil + rad):
   - Lista 1-3 misstänkta filer/rader baserat på break step

3. **Minimal fix** (max 10 rader):
   - Föreslå minimal ändring som inte ändrar UI
   - Inga workarounds som `window.scrollBy`
   - Inga router.push-ersättningar för Link om inte absolut nödvändigt

## Exempel: Om Break Step = 7

Om scroll dör på Step 7 (Link wrappar hela kortet):

**Prime Suspects:**
1. `app/shop/components/product-card/index.tsx:XXX` - Link med `style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}`
2. `app/globals.css:212` - Global `overscroll-behavior: none` på alla element

**Minimal Fix:**
- Åsidosätt `overscroll-behavior` på Link (redan implementerat)
- Om det inte fungerar: Kolla om Next.js Link har interna event listeners

## Stänga av Debug Mode

1. Sätt `DEBUG_SCROLL = false` i `index.tsx`
2. ScrollProbe försvinner automatiskt
3. Production-kod körs normalt

## Noteringar

- **Inga ändringar påverkar production** när `DEBUG_SCROLL = false`
- **ScrollProbe mountas endast** när `DEBUG_SCROLL = true`
- **Alla debug-steg är isolerade** från production-kod
- **Inga globala CSS-ändringar** görs i detta steg (isolering först)
