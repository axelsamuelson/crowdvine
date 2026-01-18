# Branch Switching Guide

## Quick Answer

**Ja, det går att byta mellan branches enkelt lokalt!**

Git gör det väldigt enkelt att hoppa mellan olika branches lokalt. När du byter branch byts hela projektet ut till den versionen.

## Basic Commands

### Se vilka branches som finns
```bash
git branch              # Lokala branches
git branch -a           # Alla branches (lokala + remote)
```

### Byta till en branch
```bash
git checkout main
git checkout feature/new-profile-page
git checkout feature/cart-improvements
```

### Se vilken branch du är på nu
```bash
git branch              # Markerad branch har *
git status              # Visar också branch-namn
```

## Praktiskt Exempel

### Scenario: Jobba på två features samtidigt

```bash
# Jobba på profile-sidan
git checkout feature/new-profile-page
# Utveckla...
git commit -m "feat: add profile tabs"
git push origin feature/new-profile-page

# Byt till cart-feature
git checkout feature/cart-improvements
# Utveckla...
git commit -m "feat: fix cart validation"
git push origin feature/cart-improvements

# Tillbaka till profile
git checkout feature/new-profile-page
# Fortsätt utveckla...
```

## Viktiga Saker att Veta

### 1. Git byter ALLA filer

När du byter branch byter Git ut hela projektet till den branch-versionen. Alla filer uppdateras automatiskt.

### 2. Uncommitted Changes

**Om du har uncommitted changes (ändringar som inte är committade):**

```bash
# Git kommer varna dig
git checkout other-branch
# Error: Your local changes would be overwritten

# Lösningar:
# Option 1: Commit ändringarna först
git add .
git commit -m "WIP: work in progress"
git checkout other-branch

# Option 2: Stash ändringarna (temporärt spara)
git stash
git checkout other-branch
# När du kommer tillbaka:
git checkout original-branch
git stash pop  # Hämta tillbaka ändringarna
```

### 3. Node Modules och Build Files

**Viktigt:** `node_modules` och `.next` (build-files) är oftast i `.gitignore`, så de påverkas inte av branch-switches. Men om du byter branch kan du behöva:

```bash
# Om dependencies ändrats mellan branches
npm install

# Om du får konstiga build-errors
rm -rf .next
npm run dev
```

### 4. Environment Variables

`.env.local` filer är lokala och påverkas inte av branch-switches. De är ofta i `.gitignore`.

## Workflow Exempel

### Scenario: Jobba på profile medan cart också utvecklas

```bash
# 1. Starta dagen - jobba på profile
git checkout feature/new-profile-page
npm run dev
# Utveckla på http://localhost:3000

# 2. Byt till cart-feature för att testa något
git checkout feature/cart-improvements
npm run dev  # Kör igen om dependencies ändrats
# Testa cart-funktionalitet

# 3. Tillbaka till profile
git checkout feature/new-profile-page
npm run dev
# Fortsätt utveckla
```

## Tips och Tricks

### Snabbare Branch Switching (Git 2.23+)

```bash
# Nyare Git-versioner har 'switch' som är tydligare
git switch feature/new-profile-page    # Byta branch
git switch -c feature/new-branch       # Skapa ny branch och byta
```

### Se skillnader mellan branches

```bash
# Se vad som är annorlunda i jämförelse med main
git diff main..feature/new-profile-page

# Se bara filnamn
git diff main --name-only

# Se commits som inte finns i main
git log main..feature/new-profile-page
```

### Se branch-struktur visuellt

```bash
git log --oneline --graph --all
# Visar alla branches som ett träd
```

## Vanliga Frågor

### "Betyder det att jag behöver byta branch för att testa olika features?"

**Ja, men det är enkelt!** 

```bash
git checkout feature/new-profile-page
npm run dev
# Testa profile-feature på localhost:3000

git checkout feature/cart-improvements  
npm run dev
# Testa cart-feature på localhost:3000
```

### "Vad händer med mina lokala ändringar?"

Om du har uncommitted changes:
- Git kommer varna dig
- Du måste antingen commit eller stash ändringarna först
- Annars riskerar du att förlora ändringar

**Säkraste sättet:**
```bash
git stash              # Spara ändringar temporärt
git checkout other-branch
# Jobba...
git checkout original-branch
git stash pop          # Hämta tillbaka ändringarna
```

### "Måste jag köra npm install varje gång jag byter branch?"

**Bara om `package.json` ändrats.** 

Om dependencies är desamma:
```bash
git checkout other-branch
npm run dev  # Kör direkt
```

Om dependencies ändrats:
```bash
git checkout other-branch
npm install  # Uppdatera dependencies
npm run dev
```

### "Kan jag ha flera branches öppna samtidigt?"

**Nej, men du kan öppna flera terminal-fönster/editors:**

- Terminal 1: `git checkout feature/new-profile-page && npm run dev`
- Terminal 2: `git checkout feature/cart-improvements && npm run dev` (men på annan port)

**Bättre:** Byt branch när du behöver testa något, annars jobba på en branch i taget.

## Praktiskt Exempel: En Dag med Två Features

```bash
# Måndag morgon - börja jobba på profile
git checkout feature/new-profile-page
npm run dev
# Jobba på profile-feature hela dagen

# Tisdag - behöver testa cart-feature
git checkout feature/cart-improvements
npm run dev
# Testa och fixa cart-buggar

# Onsdag - tillbaka till profile
git checkout feature/new-profile-page
npm run dev
# Fortsätt utveckla profile

# Torsdag - profile är klar!
git checkout main
git merge feature/new-profile-page
git push origin main
# Profile går live!

# Fredag - fortsätt på cart
git checkout feature/cart-improvements
npm run dev
# Jobba vidare...
```

## Summary

✅ **Ja, det är mycket enkelt att byta branches lokalt**
✅ **Bara `git checkout branch-name`**
✅ **Alla filer byts automatiskt**
✅ **Byt när du vill, så ofta du vill**
✅ **Git håller reda på allt automatiskt**

**Tips:** Håll branches korta och fokuserade, då blir det enklare att byta mellan dem!



