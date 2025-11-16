## Admin surface inventory

### Proposed groupings
- **Insights**: `/admin`, `/admin/analytics`
- **Catalog**: `/admin/producers`, `/admin/wines`, `/admin/wine-boxes`, `/admin/images`, `/admin/content`
- **Logistics**: `/admin/pallets`, `/admin/bookings`, `/admin/reservations`, `/admin/zones`, `/admin/pallets/new`, `/admin/pallets/[id]`, `/admin/reservations/[id]`, `/admin/zones/new`
- **Access & Membership**: `/admin/users`, `/admin/memberships`, `/admin/access-control`, `/admin/producer-groups`

### Route-by-route notes
- `/admin`: Landing dashboard; currently mixes KPIs, pallet progress, bookings, and quick links.
- `/admin/analytics`: Funnels, timelines, user journeys; overlaps with dashboard KPIs.
- `/admin/users`: CRUD for profiles; linked to memberships.
- `/admin/memberships`: Membership level editor; shares data with users.
- `/admin/producers`: Producer list + detail forms, also reachable via bookings/pallets.
- `/admin/wines`: Wine catalog, create/edit flows; referenced in bookings and wine boxes.
- `/admin/wine-boxes`: Bundled offerings; depends on wines and producers.
- `/admin/images`: Asset management; supports wines/producers.
- `/admin/content`: Site messaging (hero, copy) used globally.
- `/admin/bookings`: Reservation requests per pallet/wine.
- `/admin/reservations`: Events/logistics view; overlaps with bookings/pallets.
- `/admin/pallets`: Core logistics hub for bottle capacity, bookings; ties to zones.
- `/admin/zones`: Delivery/pickup regions that pallets depend on.
- `/admin/producer-groups`: Tagging/segmentation used by campaigns.
- `/admin/access-control`: Invitation codes, approvals; influences who sees admin.

### Overlap summary
- Analytics data (dashboard vs `/admin/analytics`) can unify under **Insights**.
- Catalog data (producers, wines, wine boxes, content, images) shares forms & actions and should adopt shared components.
- Logistics screens (pallets/zones/bookings/reservations) share tables, capacity meters, and should get consistent layout.
- Access screens (users, memberships, access-control, producer-groups) all rely on profile/membership tables and can reuse list patterns.

### Shared component hooks
- `AdminPageShell` (client) lets each page push `title`, `description`, breadcrumbs, badges, and header actions into the global chrome.
- `AdminStatGrid` standardizes simple KPI blocks so Insights/Catalog pages stay visually aligned.

