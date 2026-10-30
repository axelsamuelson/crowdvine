# Archived Supabase CLI-style migrations

These timestamped SQL files formerly lived under `supabase/migrations/`. They are **historical copies only**.

## Canonical location

Day-to-day schema changes belong in the numbered tree at the repo root:

**[`migrations/`](../../../migrations/)** (currently through `240_*.sql`).

That is what agents and humans should extend. Do **not** add new files here or under `supabase/migrations/`.

## Why this archive exists

- Some files are exact duplicates of numbered migrations under `migrations/` (same SQL, different naming).
- Others are older one-offs or near-duplicates that were never part of the numbered sequence.
- Production schema was applied via the numbered runner / SQL editor workflow, not by re-running this tree. Moving these files does **not** change what is already applied in production.
- There is no active `supabase/config.toml` migration pipeline in this repo that would apply this directory on deploy.

## Do not run these

Do not execute files from this folder against production or staging. If you need a change, add the next numbered file under `migrations/` (e.g. `241_…sql`). See [`AGENTS.md`](../../../AGENTS.md).
