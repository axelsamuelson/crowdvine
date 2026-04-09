# Quick Fix: Staff admin vs membership tier (uppdaterad)

**Föråldrad:** Tidigare rekommenderades `user_memberships.level = 'admin'`. Det är **inte längre giltigt**.

Staff som ska nå `/admin` ska ha **plattformsroll** på `profiles`:

- `profiles.role = 'admin'`, och/eller
- `profiles.roles` innehåller `'admin'`

Medlemsnivå (`user_memberships.level`) följer bara stegen basic → brons → silver → guld → privilege (ev. requester). Eventuella gamla rader med `level = 'admin'` migreras till `privilege` via migration `113_retire_membership_level_admin.sql`.

## Verifiera i Supabase SQL Editor

```sql
SELECT
  u.email,
  p.role AS profile_role,
  p.roles AS profile_roles,
  m.level AS membership_level,
  m.invite_quota_monthly
FROM user_memberships m
JOIN auth.users u ON u.id = m.user_id
JOIN profiles p ON p.id = m.user_id
WHERE u.email IN ('admin@pactwines.com', 'ave.samuelson@gmail.com');
```

Om `profile_role` inte är `admin` (och `profile_roles` saknar `admin`), uppdatera **profiles** — inte membership-nivån — för att ge åtkomst till admin-UI.
