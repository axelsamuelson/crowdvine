#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Checking Cloudflare Pages readiness..."

echo "📦 Installing dependencies..."
npm ci

echo "🏗️ Building application..."
npm run build

echo "📁 Checking for output directory..."
if [ -d "out" ]; then
    echo "✅ out/ directory created successfully"
    echo "📊 Output directory size:"
    du -sh out/
    echo "📋 Output directory contents:"
    ls -la out/ | head -10
else
    echo "❌ out/ directory not found"
    echo "🔍 Checking .next directory:"
    if [ -d ".next" ]; then
        echo "✅ .next directory exists"
        ls -la .next/
    else
        echo "❌ .next directory not found"
    fi
    exit 1
fi

echo "🧪 Testing Pages Functions structure..."
if [ -d "functions" ]; then
    echo "✅ functions/ directory exists"
    echo "📋 Functions structure:"
    find functions/ -name "*.ts" | head -10
else
    echo "❌ functions/ directory not found"
    exit 1
fi

echo "✅ Cloudflare Pages readiness check completed!"
echo ""
echo "🚀 Next steps:"
echo "1. Deploy to Cloudflare Pages"
echo "2. Configure environment variables"
echo "3. Test API endpoints"
echo "4. Implement TODO functions"
