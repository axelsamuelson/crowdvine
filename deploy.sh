#!/bin/bash

# Crowdvine Deployment Script för Misshosting
# Kör detta script för att förbereda applikationen för deployment

echo "🚀 Förbereder Crowdvine för deployment..."

# 1. Installera dependencies
echo "📦 Installerar dependencies..."
npm ci --production

# 2. Bygg applikationen
echo "🔨 Bygger applikationen..."
npm run build

# 3. Skapa deployment-mapp
echo "📁 Skapar deployment-mapp..."
mkdir -p deployment

# 4. Kopiera nödvändiga filer
echo "📋 Kopierar filer..."
cp -r .next deployment/
cp -r public deployment/
cp -r node_modules deployment/
cp package.json deployment/
cp package-lock.json deployment/
cp next.config.mjs deployment/
cp tsconfig.json deployment/

# 5. Skapa start-script
cat > deployment/start.sh << 'EOF'
#!/bin/bash
export NODE_ENV=production
npm start
EOF

chmod +x deployment/start.sh

# 6. Skapa PM2 konfiguration
cat > deployment/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'crowdvine',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/your/app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

echo "✅ Deployment-filerna är redo!"
echo "📁 Deployment-mappen: ./deployment/"
echo ""
echo "Nästa steg:"
echo "1. Ladda upp deployment-mappen till din Misshosting server"
echo "2. Konfigurera environment variables"
echo "3. Starta applikationen med PM2"
