## /profile surface audit

### Data sources & hooks
- `/api/user/profile` → `profile`, edit form defaults.
- `/api/user/membership` → `membershipData` (level info, invites, perks).
- `/api/user/membership/events?limit=10` → `ipEvents`.
- `/api/user/reservations` → reservations array (used for payment alerts + stats).
- `/api/user/invitations` → invites list (enhanced with signup URLs client-side).
- `/api/user/progression-buffs` → `progressionBuffs`, `totalBuffPercentage`.
- Supabase realtime channels (`invitations:${profile.id}`, `ip-events:${profile.id}`) refresh membership/invite/IP data.

### Current sections/components
1. **Membership hero**: `LevelBadge`, `LevelProgress`, ad-hoc gradient card, celebration modal hook.
2. **Progression buffs**: `ProgressionBuffDisplay`.
3. **Personal info**: inline edit form with `Input`, `Label`, state toggles, `saveProfile`.
4. **Payment/reservation alerts**: custom logic computing `pendingPaymentReservations`, `nearlyFullReservations`.
5. **Perks grid**: `PerksGrid`.
6. **Invite block**: `InviteQuotaDisplay`, admin level selector, generate/delete actions, copy buttons.
7. **Timeline**: `IPTimeline`.
8. **Reservations summary**: small cards (total bottles, active orders, unique pallets).
9. **Account actions**: sign-out button.

### Constraints / deps
- Editing relies on same layout as display; no separate route/modal.
- Invite generation uses membership level to decide endpoint & payload.
- Payment alert logic depends on `reservations` structure (items, capacity flags).
- Perks/Progression UI already extracted components—can be slotted into new sections.

