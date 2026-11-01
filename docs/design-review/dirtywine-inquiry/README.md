# Dirtywine B2B inquiry — design / legal review

Artifacts for Juliette (copy) and counsel. Generated from `lib/b2b/inquiry-copy.ts` + `lib/b2b/inquiry-emails.ts`.

## Email sender (Resend)

**Probe 2026-10-31** (send-only API key on crowdvine):

| From | Result |
| --- | --- |
| `Dirtywine <noreply@dirtywine.se>` | **403** — `The dirtywine.se domain is not verified` |
| `Dirtywine <noreply@pactwines.com>` | **200** — accepted |

Until `dirtywine.se` is verified in [Resend Domains](https://resend.com/domains), code defaults to:

```text
Dirtywine <noreply@pactwines.com>
```

Configurable:

```bash
DIRTYWINE_RESEND_FROM=Dirtywine <noreply@pactwines.com>
# After verification:
# DIRTYWINE_RESEND_FROM=Dirtywine <noreply@dirtywine.se>
DIRTYWINE_RESEND_REPLY_TO=axel@dirtywine.se
```

### DNS to verify `dirtywine.se` in Resend

Exact host/value strings are generated when the domain is added in the Resend dashboard (Records tab). Typical send-domain set (copy exact values from Resend — do not invent DKIM keys):

| Type | Name (host) | Purpose |
| --- | --- | --- |
| **MX** | `send` | SPF feedback / bounce path (`feedback-smtp.<region>.amazonses.com`, priority from Resend) |
| **TXT** | `send` | SPF, e.g. `v=spf1 include:amazonses.com ~all` |
| **TXT** | `resend._domainkey` | DKIM public key (long `p=…` value from Resend) |

Optional but recommended after SPF/DKIM pass:

| Type | Name | Value (start permissive) |
| --- | --- | --- |
| **TXT** | `_dmarc` | `v=DMARC1; p=none; rua=mailto:axel@dirtywine.se` |

Notes:

- On Cloudflare: CNAME/TXT for DKIM must be **DNS only** (no orange-cloud proxy).
- Newer Resend domains may show **CNAME** instead of TXT/MX — always paste the Records tab exactly.
- After DNS propagates, click **Verify** in Resend, then set `DIRTYWINE_RESEND_FROM=Dirtywine <noreply@dirtywine.se>`.

## Email / login previews (v4 — Inès)

| File | What |
| --- | --- |
| `login-gate-v4-390.png` | Utloggad förfrågesida mobil (Menu \| logo ≤24px \| cart; list = mejlstruktur) |
| `dirtywine-home-header-v4-390.png` | Dirtywine startsida 390 med fixad mobilheader |
| `customer-confirmation-v4.html` | Kundmejl (utan separat «Priser exkl. moms»-rad) |

**Mobilheader:** Felet med staplad meny + logo utanför fanns **före PR:en** i den meningen att headern/koden inte ändrades här — men den trasiga v3-dumpen var en felaktig HTML-mock. Produktion `dirtywine.se` hade redan Menu\|logo\|cart. Denna PR skärper **bara Dirtywine** (`isDirtywineSite`): `grid-cols-[auto_1fr_auto]`, logo `max-h-6` (24px). **pactwines.com opåverkad.**

## Inloggningskrav (Axel) + Inès UI

- **Sortiment + priser**: öppna för alla (befintlig browse).
- **Köpförfrågan**: kräver befintlig inloggning (`/log-in?next=/b2b/inquiry`). Ingen ny auth.
- Utloggad UI: CTA **«Logga in för att skicka förfrågan»**; ingress enligt Inès; totalrad + «Priser exkl. moms» en gång.
- `POST /api/b2b/inquiry` → **401** utan session.
- **«Inget konto? Ansök om företagskonto»**: **saknas** — ingen B2B-företagskontoansökan i repot (`/access-request` är invite/members only; `/producer/signup` är producent). Länken läggs inte till.

## Kundsynliga texter (SV, ordagrant)

### Cart / UI

1. Skicka förfrågan
1b. Logga in för att skicka förfrågan
2. Beställningsförfrågan
2b. Logga in för att skicka förfrågan. Du kommer tillbaka hit med din lista kvar.
3. Skicka en förfrågan för vinerna i din varukorg. Vi återkommer med bekräftelse och faktura — ingen betalning sker här.
… (formulärfält oförändrade)
18. Tack för din förfrågan
19. Vi återkommer med bekräftelse och faktura inom en arbetsdag.
31. Din förfrågan
32. Priser exkl. moms (+ totalrad: antal flaskor + summa)

### Kundmejl

33. Tack, vi har fått din förfrågan – Dirtywine  
34. Vi återkommer med bekräftelse och faktura inom en arbetsdag.  
35. Footer (juridiskt granskad): `Dirty Wine drivs av Axel Samuelson (enskild firma), [ADRESS|DIRTYWINE_LEGAL_ADDRESS], Stockholm · axel@dirtywine.se · Integritetspolicy · Du får det här mejlet eftersom du skickade en förfrågan på dirtywine.se.`  
36. Hälsningar, Dirty Wine (From-header oförändrad: Dirtywine <noreply@pactwines.com>)

### Intern notis

37. `[B2B förfrågan] {företag} ({id8})`  
38. Ny B2B-förfrågan från dirtywine.se + ordervärde exkl. moms  
39. Admin: absolut klickbar URL till `/admin/b2b-inquiries`  
