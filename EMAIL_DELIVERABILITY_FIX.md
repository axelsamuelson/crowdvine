# Email Deliverability Fix - Få Alla Mail Till Inbox

## Problem

Approval emails skickas från SendGrid (status 202) men kommer aldrig fram till mottagaren - varken inbox eller spam.

## Root Cause

SendGrid skickar mail, men de blockeras av Hotmail/Outlook/Gmail eftersom:

1. Avsändardomänen (pactwines.com) är inte verifierad i SendGrid
2. Ingen SPF/DKIM/DMARC konfiguration
3. Mottagande mailserver ser det som spam eller blockar helt

## Solution: Domain Authentication

### Option 1: Verify Domain (REKOMMENDERAT - Bästa Deliverability)

This is the BEST solution for production. All emails will come from @pactwines.com and have proper authentication.

#### Step 1: Go to SendGrid Domain Authentication

1. Login to SendGrid: https://app.sendgrid.com
2. Go to: Settings → Sender Authentication
3. Click: "Verify a Domain"

#### Step 2: Add Your Domain

1. Enter: `pactwines.com`
2. Select: "Yes" for branded links (recommended)
3. Click: "Next"

#### Step 3: Add DNS Records

SendGrid will give you DNS records to add. Example:

**CNAME Records (for DKIM):**

```
s1._domainkey.pactwines.com → s1.domainkey.u12345678.wl123.sendgrid.net
s2._domainkey.pactwines.com → s2.domainkey.u12345678.wl123.sendgrid.net
em123.pactwines.com → u12345678.wl123.sendgrid.net
```

**TXT Record (for SPF - may not be needed if using CNAME):**

```
pactwines.com → v=spf1 include:sendgrid.net ~all
```

#### Step 4: Add Records to Your DNS Provider

Go to wherever you registered/host pactwines.com (e.g., Namecheap, GoDaddy, Cloudflare):

1. Find DNS settings
2. Add each CNAME record exactly as shown
3. Save changes
4. Wait 24-48 hours for DNS propagation

#### Step 5: Verify in SendGrid

1. Go back to SendGrid → Sender Authentication
2. Click "Verify" next to pactwines.com
3. If DNS is propagated, it will verify successfully
4. You'll see green checkmark ✅

#### Benefits:

- ✅ Best deliverability (95%+ inbox rate)
- ✅ Professional sender reputation
- ✅ Passes DKIM, SPF, DMARC checks
- ✅ Won't be marked as spam
- ✅ Can send from any @pactwines.com email

---

### Option 2: Single Sender Verification (SNABB FIX)

This is a quick workaround if you can't verify domain immediately.

#### Step 1: Go to SendGrid Single Sender Verification

1. Login to SendGrid
2. Go to: Settings → Sender Authentication
3. Click: "Verify a Single Sender"

#### Step 2: Create Verified Sender

Fill in the form:

- **From Name:** PACT Wines
- **From Email:** (use email you have access to)
  - Option A: Use your personal email (e.g., `ave.samuelson@gmail.com`)
  - Option B: Create new email: `noreply@gmail.com` or similar
- **Reply To:** Same as from email
- **Company:** PACT Wines
- **Address:** (your address)

#### Step 3: Verify Email

1. SendGrid sends verification email to the address you entered
2. Click the verification link in that email
3. Sender is now verified ✅

#### Step 4: Update Vercel Environment Variables

1. Go to Vercel → Settings → Environment Variables
2. Update:
   ```
   SENDGRID_FROM_EMAIL=ave.samuelson@gmail.com
   SENDGRID_FROM_NAME=PACT Wines
   ```
3. Redeploy

#### Limitations:

- ⚠️ Emails come from @gmail.com (not @pactwines.com)
- ⚠️ Less professional
- ⚠️ Lower deliverability than domain verification
- ⚠️ Gmail may limit sending rate
- ✅ But it WILL work immediately

---

### Option 3: Use SendGrid's Test Email (UTVECKLING ONLY)

For development/testing only - not for production.

Update `lib/sendgrid-service.ts` to use a verified test email:

```typescript
constructor() {
  // For development: use a verified email
  this.fromEmail = process.env.NODE_ENV === 'production'
    ? process.env.SENDGRID_FROM_EMAIL || "noreply@pactwines.com"
    : "test@example.com"; // SendGrid's test email
  this.fromName = "PACT Wines";
}
```

---

## Current Configuration Check

### Check Vercel Environment Variables

Go to: https://vercel.com/axelsamuelson/crowdvine/settings/environment-variables

**Required Variables:**

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=welcome@pactwines.com  (must be verified!)
SENDGRID_FROM_NAME=PACT Wines
```

**Current Issue:**
`SENDGRID_FROM_EMAIL=welcome@pactwines.com` is NOT verified, so emails are blocked.

---

## Immediate Action Plan

### For PRODUCTION (Rekommenderat):

1. **Verify Domain** (pactwines.com) in SendGrid
2. **Add DNS records** from SendGrid to your DNS provider
3. **Wait 24-48h** for DNS propagation
4. **Verify in SendGrid**
5. Done! All emails will work perfectly ✅

### For QUICK FIX (Funkar direkt):

1. **Verify Single Sender** in SendGrid (use ave.samuelson@gmail.com)
2. **Update Vercel env vars:**
   ```
   SENDGRID_FROM_EMAIL=ave.samuelson@gmail.com
   SENDGRID_FROM_NAME=PACT Wines
   ```
3. **Redeploy**
4. Emails work immediately (but from @gmail.com) ✅

---

## Testing After Fix

### Step 1: Approve Access Request

1. Go to: https://pactwines.com/admin/access-control
2. Select membership level (Basic/Bronze/Silver/Gold)
3. Click "Approve" for axelrib@hotmail.com

### Step 2: Check Logs

In Vercel logs, you should see:

```
✅ Email sent successfully to axelrib@hotmail.com
statusCode: 202
```

### Step 3: Check Email

1. **Wait 1-5 minutes**
2. **Check inbox** (and spam) for axelrib@hotmail.com
3. **Email should arrive** with:
   - Subject: "Welcome to PACT - Your Access Has Been Approved"
   - From: PACT Wines (welcome@pactwines.com or verified email)
   - Clean, minimalist design
   - Working signup link

### Step 4: Test Signup

1. Click "Complete Registration" button in email
2. Should go to: https://pactwines.com/signup?token=...
3. See new premium signup page (black background, video)
4. Create account
5. Auto sign-in
6. Redirect to home page

---

## Why Emails Are Being Blocked

### Current Flow:

```
SendGrid sends email → Hotmail/Outlook receives
                     ↓
Hotmail checks: "Is sender verified?"
                     ↓
                "No" → BLOCK or SPAM
```

### After Domain Verification:

```
SendGrid sends email → Hotmail/Outlook receives
                     ↓
Hotmail checks: "Is sender verified?"
                     ↓
Checks DKIM/SPF → "Yes, valid!" → INBOX ✅
```

---

## Additional Improvements (Optional)

### 1. Add DMARC Policy

After domain verification, add DMARC record:

```
_dmarc.pactwines.com → v=DMARC1; p=quarantine; rua=mailto:dmarc@pactwines.com
```

This tells email providers how to handle emails that fail authentication.

### 2. Warm Up Sending Domain

If sending to new domain, start slowly:

- Day 1: Send 10 emails
- Day 2: Send 20 emails
- Day 3: Send 50 emails
- etc.

This builds sender reputation.

### 3. Monitor SendGrid Activity

Check SendGrid Activity dashboard:

- Bounces (hard/soft)
- Spam reports
- Blocks
- Deliverability stats

### 4. Use Custom Reply-To

Update email template to use proper reply-to:

```typescript
const msg = {
  to: data.to,
  from: { email: this.fromEmail, name: this.fromName },
  replyTo: "support@pactwines.com", // Where users can reply
  subject: data.subject,
  html: data.html,
  text: data.text,
};
```

---

## Summary

**Problem:** Emails sent but not delivered (blocked by receiving server)

**Quick Fix:** Verify single sender in SendGrid (5 min)

**Best Fix:** Verify domain in SendGrid (24-48h wait for DNS)

**Result:** All emails will reliably reach inbox ✅

---

## Contact

If emails still don't arrive after domain verification:

1. Check SendGrid Activity feed for bounce reasons
2. Check if recipient's email is valid
3. Check if recipient has blocked sender
4. Contact SendGrid support for deliverability help
