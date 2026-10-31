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

## Email previews

| File | What |
| --- | --- |
| `customer-confirmation.html` | Kundbekräftelse HTML (chrome shows From/Subject) |
| `customer-confirmation-desktop.png` | Kundmejl desktop (1280) |
| `customer-confirmation-mobile.png` | Kundmejl mobil (390) |
| `internal-notify.html` | Intern notis HTML |
| `internal-notify-desktop.png` | Notis desktop (1280) |
| `internal-notify-mobile.png` | Notis mobil (390) |
| `*.txt` | Plain-text bodies |

Raw GitHub URLs use the commit SHA that contains these files (update after push if SHA changes).

## Inloggningskrav (Axel)

- **Sortiment + priser**: öppna för alla (befintlig browse).
- **Köpförfrågan**: kräver befintlig inloggning (`/log-in?next=/b2b/inquiry`). Ingen ny auth.
- Utloggad UI: tydlig CTA **«Logga in för att skicka förfrågan»** (cart + `/b2b/inquiry`).
- `POST /api/b2b/inquiry` → **401** utan session.

| File | What |
| --- | --- |
| `login-gate.html` | Utloggad förfrågesida (mock) |
| `login-gate-desktop.png` | Desktop 1280 |
| `login-gate-mobile.png` | Mobil 390 |

## Kundsynliga texter (SV, ordagrant)

### Cart / UI

1. Skicka förfrågan
1b. Logga in för att skicka förfrågan
2. Beställningsförfrågan
2b. Du kan bläddra i sortiment och priser utan konto. För att skicka en förfrågan behöver du logga in — efter inloggning kommer du tillbaka hit.
3. Skicka en förfrågan för vinerna i din varukorg. Vi återkommer med bekräftelse och faktura — ingen betalning sker här.
4. Företag / restaurang
5. Organisationsnummer
6. Kontaktperson
7. E-post
8. Telefon
9. Leveransadress
10. Postnummer
11. Önskat leveransdatum
12. Meddelande
13. Eventuella önskemål eller frågor (valfritt)
14. Skicka förfrågan
15. Skickar…
16. Varukorgen är tom. Lägg till viner från lagret innan du skickar en förfrågan.
17. Tillbaka till sortimentet
18. Tack för din förfrågan
19. Tack för din förfrågan. Vi återkommer med bekräftelse och faktura.
20. När du skickar formuläret behandlar vi dina uppgifter för att hantera förfrågan. Läs mer i vår integritetspolicy.
21. Ett eller flera viner finns inte längre i tillräckligt antal i B2B-lagret. Uppdatera varukorgen och försök igen.
22. Beställning från producent är pausad. Ta bort producentviner från varukorgen — endast lagerviner kan förfrågas.
23. Fyll i alla obligatoriska fält.
24. Ange en giltig e-postadress.
25. Ange ett giltigt svenskt postnummer (5 siffror).
26. Ange ett giltigt telefonnummer.
27. Ange ett giltigt organisationsnummer.
28. Ange ett giltigt leveransdatum (YYYY-MM-DD).
29. För många försök. Vänta en stund och försök igen.
30. Kunde inte skicka förfrågan. Försök igen.
31. Din förfrågan
32. Priser exkl. moms

### Kundmejl

33. Tack för din förfrågan – Dirtywine  
34. Tack för din förfrågan. Vi återkommer med bekräftelse och faktura.  
35. Vi behandlar dina uppgifter för att hantera förfrågan. Integritetspolicy: https://dirtywine.se/integritetspolicy  
36. Hälsningar  
    Dirtywine / EURPACT OÜ  

### Intern notis (ämne + ingress; fältetiketter)

37. `[B2B förfrågan] {företag} ({id8})`  
38. Ny B2B-förfrågan från dirtywine.se  
39. ID / Företag / Org.nr / Kontakt / E-post / Telefon / Adress / Postnummer / Önskat leveransdatum / Meddelande / Rader / Admin: /admin/b2b-inquiries  
