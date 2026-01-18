# Development Workflow Guide

## Overview

This document describes the workflow for developing multiple features simultaneously while maintaining the ability to deploy individual features independently.

## Branch Strategy

### Production Branch: `main`
- **Always deployable** - Contains only tested, working code
- **Auto-deploys to production** via Vercel
- Never commit directly to `main`
- Always merge via feature branches

### Feature Branches: `feature/*`
- One branch per feature/component/area
- Always start from `main`
- Examples: `feature/new-profile-page`, `feature/cart-improvements`, `feature/wine-identity`
- Each branch gets automatic Vercel preview URL

## Quick Start

### Starting a New Feature

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull origin main

# 2. Create new branch for your feature
git checkout -b feature/your-feature-name

# 3. Start developing!
```

### Deploying a Feature

```bash
# 1. Test in Vercel preview (automatic when you push)
git push origin feature/your-feature-name

# 2. When ready, merge to main
git checkout main
git pull origin main
git merge feature/your-feature-name
git push origin main  # Auto-deploys to production
```

## Workflow Steps

### 1. Starting a New Feature

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create new branch for your feature
git checkout -b feature/your-feature-name

# Example:
# git checkout -b feature/new-profile-page
# git checkout -b feature/cart-improvements
```

### 2. During Development

```bash
# Work on your feature
# Commit often with clear messages
git add .
git commit -m "feat: add profile tabs navigation"

# Push for Vercel preview
git push origin feature/your-feature-name

# Vercel automatically creates preview URL:
# https://your-project-xxx.vercel.app
```

### 3. Testing in Preview

1. Go to Vercel Dashboard → Deployments
2. Find your feature branch deployment
3. Test the preview URL
4. Verify:
   - Feature works as expected
   - No regressions in other areas
   - All functionality is complete

### 4. Deploying to Production

When feature is complete and tested:

```bash
# Switch to main
git checkout main
git pull origin main  # Ensure you have latest

# Merge your feature branch
git merge feature/your-feature-name

# Resolve any conflicts if they occur
# (See Conflict Resolution section below)

# Push to main (auto-deploys to production)
git push origin main
```

### 5. After Deployment

```bash
# Delete local branch (optional, keeps things clean)
git branch -d feature/your-feature-name

# Delete remote branch (optional)
git push origin --delete feature/your-feature-name
```

## Handling Multiple Features

### Scenario: Two Features Developed Simultaneously

**Example:** Working on `feature/new-profile-page` and `feature/cart-improvements` at the same time.

**Strategy:**
1. Each feature in its own branch (from `main`)
2. Work on them independently
3. When one is ready → merge to `main` first
4. When the other is ready → merge to `main` (which now includes the first feature)

### Conflict Resolution

If two features modify the same files:

**Option 1: Sequential Merge (Recommended)**
```bash
# Merge first feature
git checkout main
git merge feature/new-profile-page
git push origin main

# Update second feature branch with latest main
git checkout feature/cart-improvements
git merge main  # or: git rebase main
# Resolve conflicts
git push origin feature/cart-improvements

# Test in preview
# Then merge to main
git checkout main
git merge feature/cart-improvements
git push origin main
```

**Option 2: Rebase Before Merge**
```bash
# Before merging second feature, rebase it on main
git checkout feature/cart-improvements
git rebase main
# Resolve conflicts during rebase
git push origin feature/cart-improvements --force-with-lease

# Then merge to main
git checkout main
git merge feature/cart-improvements
```

## Best Practices

### ✅ DO:
- Always start new branches from `main`
- Keep branches focused (one feature per branch)
- Commit often with clear messages
- Test in Vercel preview before merging
- Keep branches short-lived (merge within 1-2 weeks)
- Pull latest `main` before creating new branches
- Delete merged branches to keep repo clean

### ❌ DON'T:
- Don't commit directly to `main`
- Don't develop multiple features in the same branch
- Don't merge untested code
- Don't let branches diverge too far from `main`
- Don't merge feature A into feature B (merge both to `main`)

## Useful Commands

### See what branches exist
```bash
git branch -a              # All branches (local + remote)
git branch                 # Local branches only
```

### See branch differences
```bash
git diff main..feature/your-feature-name          # See all changes
git diff main --name-only                          # See only file names
git log main..feature/your-feature-name           # See commits
```

### Visualize branch structure
```bash
git log --oneline --graph --all
```

### Check current branch status
```bash
git status
git branch  # Shows current branch with *
```

### Switch between branches
```bash
git checkout feature/your-feature-name
git checkout main
```

### Stash work temporarily (if needed)
```bash
git stash                    # Save current work
git checkout other-branch    # Switch branch
# Do work...
git checkout original-branch
git stash pop                # Restore work
```

## Feature Branch Naming Convention

Use descriptive names:
- ✅ `feature/new-profile-page`
- ✅ `feature/cart-improvements`
- ✅ `feature/wine-identity-quiz`
- ✅ `feature/checkout-redesign`
- ❌ `feature/test`
- ❌ `feature/changes`
- ❌ `feature/branch1`

## Common Workflows

### Working on Profile While Cart is Broken

```bash
# Start from production (main)
git checkout main
git pull origin main
git checkout -b feature/new-profile-page

# Develop profile...
git push origin feature/new-profile-page
# Test in preview

# When ready:
git checkout main
git merge feature/new-profile-page
git push origin main  # Deploys new profile, keeps old cart
```

### Multiple Features Ready at Once

```bash
# Feature A is ready
git checkout main
git merge feature/feature-a
git push origin main

# Feature B is also ready (but started before A was merged)
git checkout feature/feature-b
git merge main  # Get Feature A changes
# Resolve conflicts if any
git push origin feature/feature-b
# Test in preview

# Merge Feature B
git checkout main
git merge feature/feature-b
git push origin main
```

## Example: Current Setup

- **main** → Production (current live code)
- **feature/new-profile-page** → New profile page development (clean branch from main)
- **feature/cart-improvements** → Cart fixes/improvements (in progress, separate branch)

When `feature/new-profile-page` is ready:
1. Merge to `main`
2. New profile goes live
3. Cart stays as-is (old working version)
4. Continue `feature/cart-improvements` separately

## Questions?

If you're unsure about the workflow:
1. Check this document
2. Test in Vercel preview first
3. Small features are safer to merge than large ones
4. When in doubt, ask before merging to `main`
