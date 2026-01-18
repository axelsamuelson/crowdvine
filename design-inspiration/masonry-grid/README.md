# Masonry Grid Design

**Källa:** V0 Template - Masonry Grid

**Beskrivning:** A dynamic layout system with balanced distribution using CSS Grid

## Huvudfunktioner:

### 1. Masonry Grid Layout
- Använder CSS Grid med `auto-rows-[20px]` för dynamisk höjd
- `gridRowEnd: span ${Math.ceil(item.height / 20)}` för att skapa masonry-effekt
- Responsiv grid med breakpoints: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`
- Smooth hover transitions med `hover:border-foreground/20`

### 2. Förbättrad Tabs-komponent
- Modern styling med `data-slot` attribut för bättre struktur
- Rounded corners med `rounded-lg` för TabsList
- Bättre active state styling med `data-[state=active]:bg-background`
- Dark mode support med `dark:` variants
- Focus states med ring effects

### 3. Designprinciper

**Layout:**
- Max-width container: `max-w-7xl mx-auto`
- Generous padding: `p-6 lg:p-12`
- Gap spacing: `gap-3`

**Styling:**
- Border transitions: `border-border` → `hover:border-foreground/20`
- Opacity transitions: `opacity-60` → `group-hover:opacity-100`
- Smooth transitions: `transition-all duration-200`

**Typography:**
- Large headings: `text-5xl font-bold`
- Balanced text: `text-balance`
- Mono font for numbers: `font-mono`

## Relevans för CrowdVine:

### Potentiella användningsområden:

1. **Produktgalleri:**
   - Masonry grid för vinprodukter med olika bildhöjder
   - Visuellt intressant layout för shop-sidan

2. **Producer showcase:**
   - Grid-layout för att visa producenter
   - Olika kortstorlekar baserat på innehåll

3. **Concept-sidor:**
   - Masonry layout för att visa olika koncept
   - Dynamisk layout som anpassar sig till innehåll

4. **Tabs-komponent:**
   - Förbättrad tabs för navigation
   - Kan användas i concept-11 eller andra sidor

## Tekniska detaljer:

### CSS Grid Masonry Implementation:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-[20px]">
  {items.map((item) => (
    <div
      style={{
        gridRowEnd: `span ${Math.ceil(item.height / 20)}`,
      }}
    >
      {/* Content */}
    </div>
  ))}
</div>
```

### Tabs Implementation:
- Använder Radix UI primitives
- Data-slot attribut för bättre struktur
- Modern styling med rounded corners och shadows

## Nästa steg:

1. Implementera masonry grid för produktgalleri
2. Uppgradera tabs-komponenten med denna styling
3. Använda designprinciperna i concept-sidor





