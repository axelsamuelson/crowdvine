#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Running CI verification for Cloudflare Pages deployment..."

echo "📦 Installing dependencies..."
npm ci

echo "🔍 Running linter..."
npm run lint

echo "🏗️ Building application..."
npm run build

echo "✅ Build completed successfully!"
echo "📁 Checking for build output..."
if [ -d ".next" ]; then
    echo "✅ .next directory created"
    echo "📊 Build size:"
    du -sh .next
else
    echo "❌ .next directory not found"
    exit 1
fi

echo "🎉 CI verification completed successfully!"
