# X/Twitter Profile Page Clone - Design Inspiration

**Källa:** v0.app template - X/Twitter Profile Page Clone

**Syfte:** Inspiration för CrowdVine's nya social media-liknande profile-sida med follow-funktionalitet.

## Designprinciper att Behålla

### ✅ Layout & Struktur
- **3-kolumns layout:** Left sidebar, main content, right sidebar
- **Responsive:** Sidebars döljs på mobil, main content stackas
- **Max width:** `max-w-[1300px]` för desktop
- **Profile header:** Stor profilbild, cover image, stats
- **Tabs navigation:** Posts, Replies, Media, Likes
- **Feed layout:** Chronological feed med posts

### ✅ UX Patterns
- **Follow/Unfollow button:** Sticky position när man scrollar
- **Profile stats:** Followers, Following, Posts counts
- **Profile actions:** Message, Follow, More options
- **Content tabs:** Easy switching mellan olika content-typer
- **Mobile-first:** Bottom nav för mobil

## Anpassningar för CrowdVine

### ❌ Måste Ändras

#### 1. **Färger (Kritisk)**
**Problem:** X/Twitter clone använder `oklch()` color space och olika färger  
**Lösning:** Använd CrowdVine's HSL-baserade color tokens

**CrowdVine's färger (från `app/globals.css`):**
```css
--background: 223.81 0% 94%;        /* Ljus beige/grå */
--foreground: 223.81 0% 4%;         /* Mörk text */
--primary: 223.81 0% 9%;            /* Mörk för buttons */
--muted: 223.81 0% 88%;             /* Ljus för cards */
--border: 223.81 0% 74%;            /* Border färg */
```

**Byta ut:**
- Alla `oklch()` → `hsl(var(--variable))`
- Använd Tailwind classes: `bg-background`, `text-foreground`, `border-border`
- Behåll samma struktur men byt färgsystem

#### 2. **Fonts (Redan Matchar! ✅)**
**Status:** Båda använder Geist Sans och Geist Mono  
**Action:** Se till att `app/layout.tsx` importerar fonts korrekt

**CrowdVine's font setup:**
```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
```

#### 3. **Border Radius**
**X/Twitter:** `--radius: 0.625rem`  
**CrowdVine:** `--radius: 0.5rem`

**Action:** Använd CrowdVine's radius: `rounded-lg`, `rounded-md`, etc.

#### 4. **Spacing**
**CrowdVine har custom spacing:**
- `--sides: 1rem` (mobile), `1.5rem` (desktop)
- `--top-spacing: 4rem` (mobile), `6rem` (desktop)

**Action:** Använd `px-sides`, `py-sides`, `pt-top-spacing` för konsistens

#### 5. **Layout Integration**
**Problem:** X/Twitter clone har egna sidebars  
**Lösning:** 
- Använd CrowdVine's befintliga header (från `components/layout/header`)
- Integrera profile-main content i CrowdVine's layout
- Ta bort left/right sidebars eller anpassa till CrowdVine's navigation

#### 6. **Buttons & Components**
**Action:** Använd CrowdVine's UI components:
- `@/components/ui/button`
- `@/components/ui/avatar`
- `@/components/ui/tabs`
- `@/components/ui/card`

#### 7. **Dark Mode**
**X/Twitter clone:** Har dark mode support  
**CrowdVine:** Använder `darkMode: "media"` men kanske inte implementerat fullt ut

**Action:** Behåll dark mode struktur men matcha CrowdVine's dark mode färger om det finns.

## Implementation Plan

### Steg 1: Extract Core Components
1. `ProfileMain` - Huvudkomponenten
2. Profile header structure
3. Tabs navigation
4. Feed/post list

### Steg 2: Anpassa Färger
1. Byta alla `oklch()` → `hsl(var(--*))`
2. Använd Tailwind color tokens: `bg-background`, `text-foreground`
3. Testa färgkontraster

### Steg 3: Integrera med CrowdVine
1. Använd CrowdVine's `PageLayout` eller liknande
2. Integrera med befintlig header/navigation
3. Använd CrowdVine's button, avatar, tabs components

### Steg 4: Anpassa Content
1. Byta X/Twitter-specifik content (tweets, etc.) mot CrowdVine content
2. Integrera med befintlig profile data
3. Lägg till follow-funktionalitet

## Viktiga Filer

- `components/profile-main.tsx` - Huvudkomponenten
- `components/left-sidebar.tsx` - Navigation (kan tas bort/anpassas)
- `components/right-sidebar.tsx` - Recommendations (kan tas bort/anpassas)
- `app/globals.css` - Färger (ska anpassas till CrowdVine)

## Notes

- **Fonts matchar redan** ✅ - Båda använder Geist
- **Färger måste ändras** ❌ - Olika color systems
- **Layout kan användas** ✅ - Men måste integreras med CrowdVine's header
- **Components bör anpassas** ⚠️ - Använd CrowdVine's UI library



