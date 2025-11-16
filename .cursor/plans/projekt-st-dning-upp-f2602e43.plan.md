<!-- f2602e43-dc18-45be-82ff-085416cd6c89 5643b575-ff32-457f-85f7-f0be2a7a57ad -->
# Shared Box & Following Plan

## Goals

- Let members follow profiles to discover activity
- Enable multi-user shared boxes so minimum-producer orders are easier
- Keep experience premium, transparent, and social

## Steps

1. **Model Updates**

- Extend Supabase schema with `profile_follows` (follower_id, following_id) and `shared_boxes` tables (box id, producer id, capacity, owner, status) plus `shared_box_members` join table for participants and commitments.
- Outline necessary Supabase RLS policies.

2. **Following UX**

- Add follow/unfollow controls on `/profile/[id]` and list of followed profiles in `/profile` using new server actions. Surface lightweight “Activity” feed cards (wine reserved, box joined) scoped to followed members.

3. **Shared Box Creation Flow**

- Expand product detail/cart logic to “Start shared box” for producers requiring 6+ bottles. Wizard captures desired quantity, invite message, privacy (public/open vs invite-only). Store as draft `shared_box` with creator as host.

4. **Discovery & Invitations**

- New “Explore shared boxes” page showing public/open boxes sorted by progress, filterable by producer/color. Allow host to send invites to followers or share link; integrate notifications (email + in-app) when invited or box hits milestones.

5. **Box Participation**

- Inside shared box view (modal/page), members pledge bottle counts, see remaining requirement, and chat/note area for coordination. Real-time updates via Supabase channel or polling; enforce per-user commitment editing and exit rules.

6. **Checkout Integration**

- Once commitments reach producer minimum, auto-reserve via cart service: aggregate line items, lock quantities, prompt participants to confirm payment (either host pays then charge share later, or split payments with Stripe Payment Links).

7. **Post-Purchase Tracking**

- Shared boxes appear in reservation snapshot and `/profile/reservations` with member list. Send follow-up notifications when pallet ships; allow members to rate the collaboration.

8. **Delight & Safeguards**

- Add trust cues: member avatars, progress rings, host verification. Implement reminders/escalations if box stagnates, and admin tools to resolve partial boxes.

### To-dos

- [ ] Design follow/shared-box tables & policies
- [ ] Add follow UI + activity feed integrations
- [ ] Create shared box creation & discovery UX
- [ ] Tie shared boxes into cart/checkout
- [ ] Expose shared boxes in reservations & notifications