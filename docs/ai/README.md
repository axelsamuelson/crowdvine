# AI and automation inventory

Companion to [`AGENTS.md`](../../AGENTS.md). Describes AI-facing surfaces and scheduled jobs in this repo. Keep this file in sync when you add MCP tools, crons, or agent owners.

## In-app MCP (`/api/mcp`)

- **Routes:** `app/api/mcp/route.ts`, `app/api/mcp/messages/route.ts`
- **Server:** `lib/mcp/server.ts` → `createPactMcpServer()`
- **Auth:** `mcp:read` / `mcp:write` (`lib/mcp/auth/`); writes audited via `lib/mcp/utils/write-tool.ts` → `mcp_audit_log`
- **Rule:** schema or tool-surface changes must keep scopes and audit logging intact

### Tool groups (`lib/mcp/tools/`)

| Group | Module | Tools (high level) |
| --- | --- | --- |
| Goals | `goals.ts` | list/get/create/update/delete goals |
| Objectives | `objectives.ts` | list/get/create/update/delete objectives |
| Projects | `projects.ts` | list/get/create/update/delete projects |
| Tasks | `tasks.ts` | list/get/create/update/delete tasks; batch create/sort; subtasks |
| Metrics / strategy | `metrics.ts` | `get_metrics`, `get_funnel_overview`, `get_full_strategy` |
| Catalog | `catalog.ts` | producers & wines (list/get/create/update) |
| Pallets (B2B + consumer) | `pallets.ts` | B2B pallets/items/status/share links; consumer `list_pallets` / `get_pallet` |
| Lager / frakt (read) | `lager-frakt.ts` | geo zones, shipping regions, rates, freight catalogue, pickup zones, quotes, B2B producer status |
| Lager / frakt (write) | `lager-frakt-writes.ts` | create/update/delete zones, regions, rates, catalogue, pallets; select freight quote |
| GSC | `gsc.ts` | Search Console performance / compare |
| Systembolaget | `systembolaget.ts` | curated guides, product search, curated wine CRUD / ranking |
| Top 100 | `top-100.ts` | top-100 producers/wines and overlap checks |
| Invoices | `invoices.ts` | recipients, drafts, issue, PDF (void/paid/email stay outside MCP) |
| Delivery notes | `delivery-notes.ts` | delivery notes + B2B orders |

## Menu-extraction pipeline

- **Code:** `lib/menu-extraction/` (crawl, detect updates, PDF extract, normalize, validate, critic, Savantbar import, etc.)
- **AI:** Anthropic (`@anthropic-ai/sdk`); models/prompts in `anthropic-models.ts`, `prompts.ts`, `critic.ts`, `service.ts`
- **Principle:** AI output is not source of truth — normalization and validation run before persistence
- **Related crons:** detect → crawl → extract → retries; plus Savantbar daily sync (see below)
- **Scripts:** `pnpm extraction:test-haiku`, `crawl:*`, `import:savantbar`

## Vercel crons (`vercel.json`, all UTC)

| Path | Schedule (UTC) | Purpose |
| --- | --- | --- |
| `/api/cron/detect-menu-updates` | `0 6,18 * * *` | Detect Starwinelist/widget menu updates; boost crawl priority |
| `/api/cron/crawl-menus` | `15 6,18 * * *` | Boosted-only Stockholm Starwinelist crawl (PDF → `menu_documents`) |
| `/api/cron/crawl-menus-weekly` | `0 4 * * 0` | Weekly full crawl sweep (all sources) |
| `/api/cron/retry-failed-crawls` | `0 2,8,14,20 * * *` | Retry partial/failed/pending crawls |
| `/api/cron/extract-menus` | `30 * * * *` | Extract pending menu documents (Anthropic pipeline) |
| `/api/cron/retry-failed-extractions` | `0 */6 * * *` | Retry failed / stale extractions |
| `/api/cron/operations-weekly-digest` | `0 7 * * 0` | Weekly operations digest email to admins (handler may further gate on Stockholm time) |
| `/api/cron/founding-member-activity` | `0 3 1 1,7 *` | Founding Member half-year activity check (Jan/Jul) |
| `/api/cron/retry-failed-payments` | `0 * * * *` | Retry card charges for due reservation payments |
| `/api/cron/sync-savantbar-menu` | `0 5 * * *` | Daily Savant Bar bottle-list sync |
| `/api/cron/systembolaget-sync` | `0 4 * * 1,4` | Systembolaget assortment sync (Mon/Thu) |
| `/api/cron/domain-authority-snapshot` | `0 5 * * 1` | Weekly domain-authority snapshot (Open PageRank + GSC + sitemap) |
| `/api/cron/pallet-hygiene` | `0 */6 * * *` | Recalculate `status_mode=auto` pallet status; cancel pallets empty ≥ 7 days (no emails, no deletes) |
| `/api/cron/reservation-expiry` | `0 7 * * *` | Pallet reservation extension asks (30d) / no-reply cancel (7d); optional max-age. Gated by `RESERVATION_EXPIRY_ENABLED` (default off), dry-run, and `RESERVATION_EXPIRY_SEND_EMAIL` (Axel approval) |

Crons are generally secured with `CRON_SECRET` (`Authorization: Bearer …`). Menu pipeline jobs also use `menuCronGate`.

Note: `app/api/cron/revalidate-systembolaget-guides` exists for on-demand revalidation but is **not** listed in `vercel.json`.

## Cursor skill: ui-ux-pro-max

- **Path:** `.cursor/skills/ui-ux-pro-max/`
- **Entry:** `SKILL.md`
- **Use:** UI/UX design guidance (styles, palettes, typography, UX rules) via searchable CSV data and `scripts/search.py`
- Prefer this skill when implementing or reviewing visually led UI work

## Agent / branch housekeeping

- **Auto-delete head branches:** enable “Automatically delete head branches” in the GitHub repo settings (Settings → General → Pull Requests). That is a repo setting, not something this repo can encode in code; keep it on so merged PR branches are removed promptly.
- **Stale `cursor/*` branches:** `.github/workflows/cleanup-merged-branches.yml` runs weekly (and on `workflow_dispatch`) and deletes remote `cursor/*` branches that are fully merged into `main` and have no open PR.

## Fråga Axel

Every bot or agent that needs something from Axel (an email to approve, money, a contract, a decision) adds one row to `public.ops_approval_queue` with `status = 'väntar'`. Rules:

- **One question per row.** `question` is the exact question to Axel, one sentence, in Swedish.
- `answer_type`: `ja_nej`, `val`, `belopp`, `datum`, `text` or `godkänn_utkast`.
- `options` (required for `val`): `[{"label": "...", "consequence": "..."}]`, a short consequence per option.
- `recommendation`: always required. The bot's own recommendation and why.
- `context`: 2–3 sentences of background. If facts are missing, say so; never invent.
- Also: `agent`, `kind` (mejl, pengar, avtal, beslut, övrigt), `link`, `deadline` if there is one, `task_id` when it belongs to a task.
- When answered: set `answer`, `answered_at` and `status` (`godkänd`, `avböjd` or `klar`).

The PACT-tavlan Page shows these rows as cards at the top, sorted by deadline and age.

## Owners

| Actor | Role |
| --- | --- |
| **Pierre** | Structure / ops |
| **Camille** | CRO |
| **Oscar** | Logistics / suppliers |
| **Claude** | Catalogue edits via the PACT MCP server |

Update this table when ownership of agent workflows changes.
