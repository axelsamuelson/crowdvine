# 🚀 Crowdvine Deployment Guide för Misshosting

## Översikt
Denna guide hjälper dig att ladda upp din Crowdvine-applikation till Misshosting och koppla den till din domän.

## Förutsättningar
- ✅ Misshosting-konto med SSH-åtkomst
- ✅ Domän som pekar på Misshosting
- ✅ Supabase-projekt konfigurerat
- ✅ Stripe-konto (om du använder betalningar)

## Steg 1: Förbered Applikationen Lokalt

### 1.1 Kör deployment-scriptet
```bash
./deploy.sh
```

### 1.2 Konfigurera Environment Variables
Kopiera `env.production.template` till `.env.production` och fyll i dina värden:

```bash
cp env.production.template .env.production
```

**Viktiga värden att fylla i:**
- `NEXT_PUBLIC_SUPABASE_URL`: Din Supabase projekt-URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Din Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Din Supabase service role key
- `NEXT_PUBLIC_APP_URL`: Din domän (t.ex. https://crowdvine.se)

## Steg 2: Ladda upp till Misshosting

### 2.1 Via SSH (Rekommenderat)
```bash
# Skapa en zip-fil av deployment-mappen
cd deployment
zip -r ../crowdvine-deployment.zip .
cd ..

# Ladda upp via SCP
scp crowdvine-deployment.zip username@your-server-ip:/home/username/

# SSH in på servern
ssh username@your-server-ip

# På servern:
cd /home/username
unzip crowdvine-deployment.zip -d crowdvine-app
cd crowdvine-app
```

### 2.2 Via FTP/SFTP
- Använd FileZilla eller liknande
- Ladda upp hela `deployment`-mappen till `/home/username/crowdvine-app`

## Steg 3: Konfigurera Servern

### 3.1 Installera Node.js och PM2
```bash
# Installera Node.js (om inte redan installerat)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installera PM2 globalt
sudo npm install -g pm2
```

### 3.2 Konfigurera Environment Variables
```bash
cd /home/username/crowdvine-app

# Skapa .env fil
nano .env

# Lägg till dina environment variables:
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# ... lägg till alla andra variabler
```

### 3.3 Installera Dependencies
```bash
npm ci --production
```

## Steg 4: Starta Applikationen

### 4.1 Med PM2 (Rekommenderat)
```bash
# Starta applikationen
pm2 start ecosystem.config.js

# Spara PM2-konfigurationen
pm2 save

# Konfigurera PM2 att starta vid omstart
pm2 startup
```

### 4.2 Alternativt med Docker
```bash
# Installera Docker (om inte redan installerat)
sudo apt update
sudo apt install docker.io docker-compose

# Starta med Docker Compose
docker-compose up -d
```

## Steg 5: Konfigurera Nginx (Proxy)

### 5.1 Installera Nginx
```bash
sudo apt install nginx
```

### 5.2 Skapa Nginx-konfiguration
```bash
sudo nano /etc/nginx/sites-available/crowdvine
```

**Nginx-konfiguration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.3 Aktivera konfigurationen
```bash
sudo ln -s /etc/nginx/sites-available/crowdvine /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Steg 6: SSL-certifikat (Let's Encrypt)

### 6.1 Installera Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### 6.2 Skaffa SSL-certifikat
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Steg 7: Konfigurera Domänen

### 7.1 DNS-inställningar
I din domänregistrator, peka din domän på Misshosting-servern:
- **A-record**: `yourdomain.com` → `server-ip`
- **CNAME**: `www.yourdomain.com` → `yourdomain.com`

### 7.2 Vänta på DNS-propagation
DNS-ändringar kan ta 24-48 timmar att sprida sig.

## Steg 8: Testa Deployment

### 8.1 Kontrollera att applikationen körs
```bash
# Kontrollera PM2-status
pm2 status

# Kontrollera loggar
pm2 logs crowdvine

# Kontrollera att port 3000 är öppen
sudo netstat -tlnp | grep :3000
```

### 8.2 Testa från webbläsaren
- Besök `http://yourdomain.com`
- Kontrollera att alla funktioner fungerar
- Testa inloggning och registrering

## Steg 9: Monitoring och Underhåll

### 9.1 PM2 Monitoring
```bash
# Visa status
pm2 status

# Visa loggar
pm2 logs crowdvine

# Starta om applikationen
pm2 restart crowdvine

# Stoppa applikationen
pm2 stop crowdvine
```

### 9.2 Loggrotation
```bash
# Installera PM2 logrotate
pm2 install pm2-logrotate
```

## Steg 10: Uppdateringar

### 10.1 Uppdatera Applikationen
```bash
# Lokalt: Bygg ny version
./deploy.sh

# Ladda upp till server
scp crowdvine-deployment.zip username@server:/home/username/

# På servern:
cd /home/username
unzip -o crowdvine-deployment.zip -d crowdvine-app-new
cd crowdvine-app-new
npm ci --production
pm2 restart crowdvine
```

## Felsökning

### Vanliga problem:

1. **Applikationen startar inte**
   ```bash
   pm2 logs crowdvine
   # Kontrollera environment variables
   ```

2. **502 Bad Gateway**
   - Kontrollera att applikationen körs på port 3000
   - Kontrollera Nginx-konfigurationen

3. **SSL-problem**
   ```bash
   sudo certbot renew --dry-run
   ```

4. **Database-anslutning**
   - Kontrollera Supabase-URL och nycklar
   - Kontrollera nätverksanslutning

## Support

Om du stöter på problem:
1. Kontrollera loggarna: `pm2 logs crowdvine`
2. Kontrollera Nginx-loggar: `sudo tail -f /var/log/nginx/error.log`
3. Kontrollera att alla environment variables är korrekta

## Säkerhet

- Uppdatera systemet regelbundet: `sudo apt update && sudo apt upgrade`
- Använd starka lösenord
- Aktivera firewall: `sudo ufw enable`
- Regelbundna säkerhetskopior av databasen

---

**Lycka till med din deployment! 🎉**
