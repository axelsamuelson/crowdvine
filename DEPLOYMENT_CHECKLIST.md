# ✅ Deployment Checklist för Crowdvine

## Före Deployment

### Lokalt
- [ ] Kör `./deploy.sh` för att skapa deployment-filer
- [ ] Konfigurera `.env.production` med alla nödvändiga värden:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NEXT_PUBLIC_APP_URL` (din domän)
  - [ ] Stripe-nycklar (om används)
  - [ ] Email-konfiguration (om används)

### Supabase
- [ ] Kontrollera att alla tabeller och policies är korrekta
- [ ] Testa att API:erna fungerar lokalt
- [ ] Kontrollera att RLS-policies är aktiverade

### Misshosting Server
- [ ] SSH-åtkomst till servern
- [ ] Node.js installerat (version 18+)
- [ ] PM2 installerat globalt
- [ ] Nginx installerat
- [ ] Certbot installerat (för SSL)

## Under Deployment

### Filöverföring
- [ ] Ladda upp `deployment`-mappen till servern
- [ ] Extrahera filerna i `/home/username/crowdvine-app`

### Serverkonfiguration
- [ ] Installera dependencies: `npm ci --production`
- [ ] Skapa `.env`-fil med production-värden
- [ ] Starta applikationen med PM2
- [ ] Konfigurera PM2 för automatisk start

### Nginx
- [ ] Skapa nginx-konfiguration för din domän
- [ ] Aktivera konfigurationen
- [ ] Testa nginx-konfigurationen
- [ ] Ladda om nginx

### SSL
- [ ] Skaffa SSL-certifikat med Certbot
- [ ] Kontrollera att HTTPS fungerar

### DNS
- [ ] Konfigurera A-record för din domän
- [ ] Konfigurera CNAME för www-subdomän
- [ ] Vänta på DNS-propagation (kan ta 24-48h)

## Efter Deployment

### Testning
- [ ] Besök din domän i webbläsaren
- [ ] Testa inloggning/registrering
- [ ] Testa alla huvudsakliga funktioner
- [ ] Kontrollera att bilder laddas korrekt
- [ ] Testa responsiv design på mobil

### Monitoring
- [ ] Kontrollera PM2-status: `pm2 status`
- [ ] Kontrollera loggar: `pm2 logs crowdvine`
- [ ] Kontrollera att applikationen startar vid omstart
- [ ] Sätt upp loggrotation

### Säkerhet
- [ ] Aktivera firewall: `sudo ufw enable`
- [ ] Kontrollera att endast nödvändiga portar är öppna
- [ ] Uppdatera systemet: `sudo apt update && sudo apt upgrade`

## Uppdateringar

### När du gör ändringar
- [ ] Kör `./deploy.sh` lokalt
- [ ] Ladda upp nya filer till servern
- [ ] Starta om applikationen: `pm2 restart crowdvine`
- [ ] Testa att ändringarna fungerar

### Regelbundet
- [ ] Uppdatera systemet månadsvis
- [ ] Kontrollera SSL-certifikat (förnyas automatiskt)
- [ ] Säkerhetskopiera databasen regelbundet
- [ ] Kontrollera loggar för fel

## Felsökning

### Om applikationen inte startar
- [ ] Kontrollera loggar: `pm2 logs crowdvine`
- [ ] Kontrollera environment variables
- [ ] Kontrollera att alla dependencies är installerade

### Om sidan inte laddas
- [ ] Kontrollera att PM2 kör applikationen
- [ ] Kontrollera nginx-konfigurationen
- [ ] Kontrollera att port 3000 är öppen
- [ ] Kontrollera DNS-inställningar

### Om SSL inte fungerar
- [ ] Kontrollera certifikat: `sudo certbot certificates`
- [ ] Förnya certifikat: `sudo certbot renew`
- [ ] Kontrollera nginx-konfigurationen

---

**Tips:** Spara denna checklista och kryssa av varje punkt när du genomför deployment!
