# Quick Fix: Set Admin Level

Du är inloggad som admin (profiles.role = 'admin') men din membership level är 'silver'.

## Fix: Kör detta i Supabase SQL Editor

```sql
-- Set BOTH admin users to admin level
UPDATE user_memberships
SET
  level = 'admin',
  invite_quota_monthly = 999999,
  level_assigned_at = NOW(),
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('admin@pactwines.com', 'ave.samuelson@gmail.com')
);

-- Verifiera att det funkade
SELECT
  u.email,
  p.role as profile_role,
  m.level as membership_level,
  m.impact_points,
  m.invite_quota_monthly
FROM user_memberships m
JOIN auth.users u ON u.id = m.user_id
JOIN profiles p ON p.id = m.user_id
WHERE u.email IN ('admin@pactwines.com', 'ave.samuelson@gmail.com');
```

## Resultat

Efter detta ska du se:

- Level badge: "A" med svart bakgrund och guld-border
- Impact Points: (dina nuvarande IP)
- Perks: Unlimited invites, pallet hosting, producer contact
- Invite quota: Obegränsat

## Varför Hände Detta?

Migration 035 beräknade level baserat på invitation history (IP points), inte på `profiles.role`.

För admins måste level sättas manuellt till 'admin' efter migration.

Detta är by design - admin level är en manuell assignment, inte poäng-baserad.
