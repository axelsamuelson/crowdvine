# /access-request — customer-visible strings

Locale: `pact_locale` cookie + shopping context (`useTranslations` / `translate`).  
Handoff SV applied only where listed. **Do not invent SV** for uncovered EN strings.

Meta (noindex page): description + `og:locale` (`sv_SE` / `en_US`) from `accessRequest.metaDescription`.

---

## Reachable UI states (mounted page)

Source: `app/access-request/access-request-client.tsx`, messages in `messages/en.json` / `messages/sv.json` under `accessRequest.*`.

### A. Default (logged out / no membership / PACT)

Shown for visitors without platform access. CTA → `/log-in`.

| EN (current) | SV | File:line (EN source / usage) | Handoff SV? |
|---|---|---|---|
| Members only | Endast för medlemmar | `messages/en.json` `accessRequest.membersOnly`; rendered `app/access-request/access-request-client.tsx` ~111 | Yes |
| Wine, but not like this. | Vin, men inte så här. | `accessRequest.tagline`; client ~120 | Yes |
| Membership by invitation. | Medlemskap via inbjudan. | `accessRequest.invitationLine`; client ~121 | Yes |

Meta description (document / OG, not on-canvas):

| EN | SV | File | Handoff? |
|---|---|---|---|
| Wine club where members share pallets of natural wine from France. | Vinklubb där medlemmarna delar pallar med naturvin från Frankrike. | `accessRequest.metaDescription`; `app/access-request/layout.tsx` `generateMetadata` | Yes (EN proposed + SV) |

### B. Dirty Wine “not set up” (`reason=no_b2b` **and** Dirty Wine host)

**When it renders:** only if `reason=no_b2b` **and** host is Dirty Wine (`dirtywine.se` / `www`, or localhost with `?b2b=1`). See `lib/access-request/no-b2b.ts`.  
On **pactwines.com**, `?reason=no_b2b` is ignored → state A (Members only).

| EN (current) | SV | File:line | Handoff SV? |
|---|---|---|---|
| Your account is not set up for Dirty Wine. | Ditt konto är inte kopplat till Dirty Wine. | `accessRequest.noB2bMessage`; client ~86 | Yes |
| Go to pactwines.com | Gå till pactwines.com | `accessRequest.goToPact`; client ~95 | Yes |
| Wine, but not like this. | Vin, men inte så här. | same as A | Yes |
| Membership by invitation. | Medlemskap via inbjudan. | same as A | Yes |

Note: Dirty Wine UI localization is fixed to Swedish (`isUiLocalizationEnabled` false). EN catalog strings exist for PACT parity / tests; production Dirty Wine visitors see SV. **EN screenshots of state B are not reachable** (locale forced to `sv`).

### C. Logged-in with access

Not a visible page state: server redirect (`app/access-request/page.tsx`) and/or client `/api/me/access` redirect. No customer-facing copy.

### D. Logged-in without access (membership missing / requester)

Same visible copy as state A (Members only + taglines). No distinct strings.

---

## Not mounted on this page (EN only — for copywriter)

`components/form-access-request.tsx` is **not imported** by `/access-request` today (gallery + CTA only). Listed so nothing is missed if rewired later. **Leave EN** until translated outside this handoff.

### Main input form

| EN | File:line | SV |
|---|---|---|
| Please enter an email or invitation code | `components/form-access-request.tsx:31` | *(leave EN)* |
| Failed to submit request | `:171`, `:473` | *(leave EN)* |

### Invite registration modal

| EN | File:line | SV |
|---|---|---|
| Complete Your Registration | `:265` | *(leave EN)* |
| Email Address | `:275` | *(leave EN)* |
| Enter your email | `:279` | *(leave EN)* |
| Password | `:291` | *(leave EN)* |
| Create a password (min 6 characters) | `:295` | *(leave EN)* |
| Full name | `:307` | *(leave EN)* |
| Your name | `:311` | *(leave EN)* |
| Please enter a valid email | `:124` | *(leave EN)* |
| Password must be at least 6 characters | `:125` | *(leave EN)* |
| Please enter your name | `:126` | *(leave EN)* |
| Choose your wine zone | `:127` | *(leave EN)* |
| Cancel | `:347` | *(leave EN)* |
| Creating Account... | `:354` | *(leave EN)* |
| Create Account | `:354` | *(leave EN)* |
| Invalid invitation code | `:216`, `:397`, `:431` | *(leave EN)* |
| Network error. Please try again. | `:221`, `:404`, `:438`, `:480` | *(leave EN)* |
| Platform unlocked! Welcome to CrowdVine. | `:391` | *(leave EN)* |
| Valid invitation code! Complete your registration below. | `:425` | *(leave EN)* |
| Access request submitted! We'll review your application soon. | `:467` | *(leave EN)* |

### Wine zone field (used by invite modal if mounted)

| EN | File:line | SV |
|---|---|---|
| Select a wine zone | `components/market/invite-wine-zone-field.tsx:70` (default placeholder) | *(leave EN)* |

### API messages surfaced via form (`app/api/access-request/route.ts`)

| EN | File:line | SV |
|---|---|---|
| Too many access requests. Please try again later. | `:15` | *(leave EN)* |
| Valid email is required | `:35` | *(leave EN)* |
| This email already has access to the platform | `:54` | *(leave EN)* |
| Please try logging in instead of requesting access | `:55` | *(leave EN)* |
| You already have a pending access request. We'll review it soon. | `:72–73` | *(leave EN)* |
| Access request updated! We'll review your application soon. | `:112–113` | *(leave EN)* |
| Failed to update request | `:105` | *(leave EN)* |
| Failed to submit request | `:119` | *(leave EN)* |

---

## Dirty Wine finding (summary)

Historically middleware on Dirty Wine redirected users without `portal_access: business` to `/access-request?reason=no_b2b`. That redirect was removed when Dirty Wine became open (no login). The page still treated **any** `reason=no_b2b` as Dirty Wine UI — including on **pactwines.com** — so a deep link showed “Your account is not set up for Dirty Wine.”  

**Fix:** host-gate with `shouldShowNoB2bAccessMessage` (`lib/access-request/no-b2b.ts`). PACT always shows Members only for that query.
