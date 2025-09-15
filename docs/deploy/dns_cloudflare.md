# DNS Migration to Cloudflare

## Overview
This guide covers migrating DNS from Miss Hosting to Cloudflare for the dirtywine.se domain.

## Prerequisites
- Cloudflare account
- Access to Miss Hosting DNS settings
- Domain registrar access (if needed)

## Step 1: Add Site to Cloudflare

1. **Login to Cloudflare Dashboard**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Click "Add a Site"

2. **Enter Domain**
   - Enter `dirtywine.se`
   - Select plan (Free plan is sufficient for most use cases)

3. **DNS Import**
   - Cloudflare will scan existing DNS records
   - Review and confirm the imported records

## Step 2: Review DNS Records

### Critical Records to Verify
- **A Record**: `dirtywine.se` → `your-server-ip`
- **CNAME**: `www.dirtywine.se` → `dirtywine.se`
- **MX Records**: Email server records (if email is hosted elsewhere)
- **TXT Records**: SPF, DKIM, DMARC records

### Email Configuration
If email is hosted on Miss Hosting or another service:
- **MX Records**: Keep existing email server records
- **SPF Record**: `v=spf1 include:_spf.google.com include:misshosting.com ~all`
- **DKIM Record**: Keep existing DKIM record
- **DMARC Record**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@dirtywine.se`

## Step 3: Update Nameservers

1. **Get Cloudflare Nameservers**
   - In Cloudflare dashboard, go to "DNS" → "Nameservers"
   - Note the two nameservers (e.g., `ns1.cloudflare.com`, `ns2.cloudflare.com`)

2. **Update at Domain Registrar**
   - Login to your domain registrar
   - Update nameservers to Cloudflare's nameservers
   - Wait for propagation (can take up to 48 hours)

## Step 4: Configure Cloudflare Pages

1. **Connect Repository**
   - Go to Cloudflare Pages dashboard
   - Click "Connect to Git"
   - Select your GitHub repository

2. **Build Configuration**
   - **Build Command**: `npm run build`
   - **Output Directory**: `out`
   - **Node.js Version**: `18` (or latest)

3. **Environment Variables**
   - Add all required environment variables
   - Mark sensitive variables as "Encrypted"

## Step 5: Custom Domain Setup

1. **Add Custom Domain**
   - In Pages project settings
   - Add `dirtywine.se` and `www.dirtywine.se`

2. **SSL/TLS Configuration**
   - **SSL/TLS Mode**: "Full (Strict)"
   - **Always Use HTTPS**: Enabled
   - **HTTP/3**: Enabled

3. **DNS Records**
   - Cloudflare will automatically create CNAME records
   - Verify records point to your Pages project

## Step 6: Testing

### DNS Propagation Check
```bash
# Check nameserver propagation
dig NS dirtywine.se

# Check A record
dig A dirtywine.se

# Check CNAME record
dig CNAME www.dirtywine.se
```

### Website Testing
1. **HTTP/HTTPS**: Test both protocols
2. **WWW/Non-WWW**: Test both subdomains
3. **API Endpoints**: Test Pages Functions
4. **Email**: Test email delivery (if applicable)

## Step 7: Performance Optimization

### Cloudflare Settings
1. **Caching**
   - **Caching Level**: Standard
   - **Browser Cache TTL**: 4 hours
   - **Edge Cache TTL**: 1 month

2. **Speed**
   - **Auto Minify**: HTML, CSS, JS
   - **Brotli Compression**: Enabled
   - **Rocket Loader**: Enabled

3. **Security**
   - **Security Level**: Medium
   - **Bot Fight Mode**: Enabled
   - **DDoS Protection**: Enabled

## Rollback Plan

If issues occur, rollback steps:

1. **Revert Nameservers**
   - Change nameservers back to Miss Hosting
   - Wait for propagation

2. **Deploy to Vercel**
   - Use the same repository
   - Deploy to Vercel as fallback
   - Update DNS to point to Vercel

3. **Emergency DNS**
   - Use Cloudflare's emergency DNS if needed
   - Point to backup server

## DNS Checklist

### Before Migration
- [ ] Document current DNS records
- [ ] Test email functionality
- [ ] Backup current configuration
- [ ] Plan maintenance window

### During Migration
- [ ] Add site to Cloudflare
- [ ] Import DNS records
- [ ] Update nameservers
- [ ] Configure Pages project
- [ ] Test website functionality

### After Migration
- [ ] Verify DNS propagation
- [ ] Test all website functions
- [ ] Test email delivery
- [ ] Monitor performance
- [ ] Update documentation

## Common Issues

### DNS Propagation Delays
- Can take up to 48 hours
- Use `dig` command to check propagation
- Clear local DNS cache if needed

### Email Issues
- Verify MX records are correct
- Check SPF/DKIM/DMARC records
- Test email delivery

### SSL Certificate Issues
- Ensure "Full (Strict)" SSL mode
- Check certificate validity
- Verify domain ownership

## Support Resources

- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [DNS Propagation Checker](https://dnschecker.org/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
