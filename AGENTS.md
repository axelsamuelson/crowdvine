# AGENTS.md — PACT (pactwines.com)

Canonical instructions for all AI agents (Cursor, Claude Code, cloud agents, and others) working in this repository. Prefer this file over scattered notes. Detailed AI/automation inventory: [`docs/ai/README.md`](docs/ai/README.md).

## Project overview

**PACT** sells natural wine from Languedoc / Béziers via **shared-pallet pre-orders**, delivered in **Stockholm**. The legal seller is **EURPACT OÜ**. Customer-facing copy is primarily **Swedish** (with English routes where the product supports them). Production site: [pactwines.com](https://pactwines.com).

Core model: customers reserve bottles on a shared inbound pallet; payment and fulfilment follow when the pallet fills/closes. Do not invent competing fulfilment models in copy or product logic without an explicit product decision.

## Stack and commands

Derived from `package.json`, `vercel.json`, and `.github/workflows/ci.yml`.

| Layer | Choice |
| --- | --- |
| App | Next.js (App Router) + React 19 + TypeScript |
| Package manager | **pnpm** (`packageManager` in `package.json`; CI uses `pnpm install --frozen-lockfile`) |
| UI | Tailwind CSS, shadcn/ui (`components.json`, New York style), Radix |
| Data | Supabase (Postgres + Auth + Storage) |
| Payments | Stripe |
| Email | Resend (and related mail utilities in `lib/`) |
| Hosting / crons | Vercel (`vercel.json` crons run in **UTC**) |
| Tests | Vitest (`pnpm test`); CI also runs `pnpm run build` on Node 20 |
| AI / MCP | Anthropic SDK (menu extraction); in-app MCP at `/api/mcp` (`lib/mcp/server.ts`) |

### Common commands

```bash
pnpm install          # dependencies (CI: --frozen-lockfile)
pnpm dev              # local Next.js
pnpm lint             # next lint
pnpm test             # vitest run
pnpm test:watch       # vitest watch
pnpm run build        # env check + next build
pnpm start            # production server
pnpm migrate          # tsx scripts/run-migration.ts
pnpm seed             # seed sample data
```

Menu / crawl helpers (see `package.json` scripts): `crawl:smoke`, `crawl:batch`, `crawl:local`, `extraction:test-haiku`, `import:savantbar`, etc.

CI (`.github/workflows/ci.yml`): on push/PR to `main` → install → `pnpm test` → `pnpm run build` with placeholder Supabase env vars.

## Code conventions

- TypeScript throughout; path alias `@/*` → repo root (`tsconfig.json`).
- Prefer App Router patterns under `app/`; shared UI in `components/`; domain logic in `lib/`.
- Match existing style in the files you touch (imports, naming, component structure). Do not drive-by refactor unrelated code.
- Customer UI copy: Swedish-first for the Stockholm market; keep `messages/sv.json` / `messages/en.json` and locale helpers in `lib/i18n/` consistent when adding strings.
- Do not change app behavior in docs-only or agent-onboarding PRs.
- Secrets stay in env / Vercel; never commit `.env*` (except `.env.example`).
- For UI/UX work, use the Cursor skill at `.cursor/skills/ui-ux-pro-max/` when design guidance is needed.

## Database migrations

**Canonical folder:** numbered SQL under **`migrations/`** (currently through **`240_*.sql`**, e.g. `240_analytics_abandon_reason.sql`). This is the only place for new schema work. Agents must not invent a second migration tree.

**Historical / non-canonical**

- Timestamped Supabase CLI-style copies formerly under `supabase/migrations/` are archived at **`docs/archives/supabase-migrations/`** (see that folder’s README). Many are duplicates or near-duplicates of numbered files; they are kept for history only.
- `supabase/migrations/` now holds only a pointer README — do not add SQL there.
- Older ad-hoc SQL also lives under **`docs/archives/migrations/`**.
- Archiving or documenting these trees does **not** change what is already applied in production. **Do not re-run archived SQL** against prod/staging.

**Rules for new migrations**

1. Add new migrations under **`migrations/`** only.
2. Use the **next integer prefix** after the highest existing numbered file (today: **241_…**).
3. Prefer a short descriptive snake_case suffix: `241_short_description.sql`.
4. Never add day-to-day schema changes under `supabase/migrations/` or `docs/archives/**`.
5. Never store **PII** in `user_events.event_metadata` (no names, emails, phones, streets, free-text addresses, dates of birth, etc.). Use booleans / codes / digits-only postal flags when checkout analytics need field state. See `lib/analytics/checkout-draft-metadata.ts` and migration `239_scrub_user_events_pii.sql`.

## Analytics rules

- A **conversion** is a **completed reservation** (e.g. `reservation_completed` / completed `order_reservations` — not page views or cart adds alone).
- Analyses and metric narratives must use data from **2026-08-07 onward** only (pre-cutoff data is unreliable for product decisions).
- Keep `user_events` metadata free of PII (see migrations rules above).

## In-app MCP server

- HTTP MCP endpoint: **`/api/mcp`** (also `/api/mcp/messages`).
- Server factory: **`lib/mcp/server.ts`** (`createPactMcpServer`).
- Tool modules under `lib/mcp/tools/` (goals, objectives, projects, tasks, metrics, catalog, pallets, lager/frakt, GSC, Systembolaget, top-100, invoices, delivery notes).
- Auth scopes: `mcp:read` / `mcp:write` (`lib/mcp/auth/`). Mutating tools must stay listed in the write-tool set and go through audit logging (`lib/mcp/utils/write-tool.ts`, `mcp_audit_log`).
- **Schema / tool surface changes must keep scopes and the audit log correct** — new writes need `mcp:write` registration and audit; do not bypass `mcpWriteTool` / scope checks.

Inventory: [`docs/ai/README.md`](docs/ai/README.md).

## Crons

All schedules in `vercel.json` are **UTC**. Do not assume Europe/Stockholm wall time unless the handler itself converts (e.g. operations weekly digest). Full list and purpose: [`docs/ai/README.md`](docs/ai/README.md).

## PR conventions for agents

- Prefer **small, focused PRs** (one concern per PR).
- Describe **what was tested** (commands, manual checks, or why tests were not run).
- Use title prefix **`[agent]`** and apply the GitHub label **`agent`** when available.
- Use `.github/pull_request_template.md` and check **Agent-generated** when the change was produced by an agent.
- Do not delete remote branches unless explicitly asked.
- Docs / agent-onboarding changes must not alter runtime product behavior.
