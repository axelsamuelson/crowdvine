# 🚀 Snabb Start - Crowdvine på Misshosting

## Snabbaste vägen till live:

### 1. Förbered lokalt (5 min)
```bash
# Kör deployment-scriptet
./deploy.sh

# Konfigurera environment variables
cp env.production.template .env.production
# Redigera .env.production med dina värden
```

### 2. Ladda upp till server (10 min)
```bash
# Skapa zip-fil
cd deployment && zip -r ../crowdvine.zip . && cd ..

# Ladda upp (ersätt med dina uppgifter)
scp crowdvine.zip username@your-server-ip:/home/username/
```

### 3. På servern (15 min)
```bash
# SSH in
ssh username@your-server-ip

# Extrahera och installera
unzip crowdvine.zip -d crowdvine-app
cd crowdvine-app
npm ci --production

# Konfigurera environment variables
nano .env
# Lägg till alla dina värden här

# Starta med PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Konfigurera Nginx (10 min)
```bash
# Skapa nginx-konfiguration
sudo nano /etc/nginx/sites-available/crowdvine

# Lägg till denna konfiguration:
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Aktivera
sudo ln -s /etc/nginx/sites-available/crowdvine /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL-certifikat (5 min)
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 6. DNS-inställningar
- A-record: `yourdomain.com` → `server-ip`
- CNAME: `www.yourdomain.com` → `yourdomain.com`

## ✅ Klar! Din app är live på https://yourdomain.com

## Viktiga kommandon för underhåll:
```bash
# Kontrollera status
pm2 status

# Visa loggar
pm2 logs crowdvine

# Starta om
pm2 restart crowdvine

# Uppdatera applikationen
pm2 stop crowdvine
# Ladda upp ny version
pm2 start crowdvine
```

## Om något går fel:
1. Kontrollera loggar: `pm2 logs crowdvine`
2. Kontrollera att port 3000 är öppen: `sudo netstat -tlnp | grep :3000`
3. Kontrollera Nginx: `sudo nginx -t`
4. Kontrollera environment variables i `.env`
