# Test / CI baseline stabilization

Date: 2026-08-15  
Parent commit: `2805c062` (Unify pallet auto status with canonical fill)

## Initial state

- Full Vitest: **235 passed / 7 failed** (242 total)
- Scoped pallet/freight: 103 passed
- `pnpm run build`: PASS
- GitHub CI: install + build only (no Vitest)

### Failing tests

1. `lib/external-prices/__tests__/normalize.test.ts` › `normalizePdpTitle` › strips content after | …
2–7. `lib/menu-extraction/__tests__/pipeline-alert-transport.test.ts` (6 cases: email-only, webhook-only, both, neither, MENU_PIPELINE_EMAILS unset, batch)

## Root causes

| Area | Classification | Cause |
|------|----------------|-------|
| `normalizePdpTitle` | **TEST DRIFT** | Implementation intentionally strips vintage via `stripVintageFromString` for matching; test still expected years kept |
| `pipeline-alert-transport` | **TEST ISOLATION / ENVIRONMENT** | `deliverMenuPipelineAlerts` calls real `isMenuPipelinePaused()` → site content / DB → production pause flag skips all transports |

No product bugs in pallet/freight/status paths.

## Changes

- Update `normalizePdpTitle` expectations to strip vintage; keep pipe-suffix stripping
- Mock `isMenuPipelinePaused` as `false` in alert transport tests; add paused-skip case
- `.github/workflows/ci.yml`: run `pnpm test` before `pnpm run build` (fail on test failure)
- `package.json` `test` already `vitest run` (CI-safe)

## Final local result

- **30** files, **243** passed, **0** failed
- Scoped pallet/freight: **103** passed
- Build: PASS

## CI

GitHub Actions now: checkout → pnpm → install → **`pnpm test`** → **`pnpm run build`**

## Non-goals

- No pallet business semantics changed (120/720, status machine, fail-closed fill)
- No production data mutation
- No freight / Instabee / WINE_BOX_6 model changes
