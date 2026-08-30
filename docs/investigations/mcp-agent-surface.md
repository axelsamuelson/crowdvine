# MCP agent surface and authentication (investigation)

Date: 2026-08-06  
Scope: read-only inspection of this repository. No files were modified except this report.

---

## 1. MCP route and transport

### Route handlers

| Path | File | Exports |
|------|------|---------|
| `/api/mcp` | `app/api/mcp/route.ts` | `HEAD`, `GET`, `POST`, `DELETE` → all call `handleMcpRequest` (except HEAD returns empty 200 with protocol header) |
| `/api/mcp/messages` | `app/api/mcp/messages/route.ts` | Identical exports; same `handleMcpRequest` |

Both files:

```5:29:app/api/mcp/route.ts
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function HEAD(_req: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      "MCP-Protocol-Version": "2025-03-26",
      ...MCP_CORS_HEADERS,
    },
  });
}

export async function GET(req: Request) {
  return handleMcpRequest(req);
}

export async function POST(req: Request) {
  return handleMcpRequest(req);
}

export async function DELETE(req: Request) {
  return handleMcpRequest(req);
}
```

- **`runtime`**: no `export const runtime` in either route file or `lib/mcp/`. UNKNOWN whether a host-level Next.js config overrides this; looked at `app/api/mcp/**` and `lib/mcp/**` only. Next.js App Router Route Handlers default to the Node.js runtime when `runtime` is unset.
- **`dynamic`**: `force-dynamic` (both routes).
- **`maxDuration`**: `300` (both routes).

Shared implementation: `lib/mcp/handle-mcp-request.ts` → `createPactMcpServer()` in `lib/mcp/server.ts`.

Middleware bypasses session/membership gates for `/api/*` and `/.well-known/*` (includes MCP):

```187:200:middleware.ts
  // OAuth discovery (RFC 8414, RFC 9728) and MCP API — bypass Supabase session / membership gate.
  // /.well-known/* includes oauth-authorization-server and oauth-protected-resource/...
  // /api/* includes /api/mcp and /api/mcp/messages.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/.well-known/") ||
    ...
  )
    return nextWithPathname(req);
```

### SDK / adapter

| Item | Value |
|------|--------|
| Package | `@modelcontextprotocol/sdk` |
| `package.json` range | `"^1.29.0"` (`package.json` line 44) |
| Installed / lockfile | `1.29.0` (`pnpm-lock.yaml` `@modelcontextprotocol/sdk@1.29.0`; `node_modules` resolves to `1.29.0`) |
| Server class | `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js` |
| Transport class | `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js` |

No other MCP adapter package (e.g. `@vercel/mcp-adapter`) appears in `package.json`.

### Transport

**Streamable HTTP** (not a separate classic SSE MCP transport class).

Determining code:

```110:112:lib/mcp/handle-mcp-request.ts
/**
 * Streamable HTTP MCP endpoint. Stateless (ingen session) så det fungerar på Vercel serverless.
 */
```

```234:243:lib/mcp/handle-mcp-request.ts
  const mcp = createPactMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await mcp.connect(transport);
  const res = await transport.handleRequest(
    withStreamableHttpCompatibleHeaders(req),
  );
```

GET with `Accept: text/event-stream` returns a short probe SSE stream (not the SDK SSE transport):

```200:231:lib/mcp/handle-mcp-request.ts
  if (method === "GET") {
    const accept = (req.headers.get("accept") ?? "").toLowerCase();
    if (!accept.includes("text/event-stream")) {
      return Response.json(
        {
          ok: true,
          service: "pact-okr-mcp",
          hint: "POST JSON-RPC to this URL; use Accept: text/event-stream for SSE probe.",
        },
        ...
      );
    }
    ...
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        ...
      },
    });
  }
```

`SSEServerTransport` is not imported anywhere in the repo (search covered `lib/mcp` and related). `/api/mcp/messages` is the same Streamable HTTP handler (legacy path naming).

### Stateful vs stateless

**Stateless per request**: `sessionIdGenerator: undefined` and comment “Stateless (ingen session)”. Each POST creates a new `McpServer` + transport, connects, handles one request, returns.

### Rate limiting / caching / timeouts

| Mechanism | Detail |
|-----------|--------|
| Rate limit | `checkMcpRateLimit` — fixed window 60s, max 60 requests per `rateLimitKey` (`lib/mcp/utils/rate-limit.ts`). In-memory `Map` (best-effort per serverless instance). |
| Cache | `dynamic = "force-dynamic"`; no HTTP cache wrapper on the MCP handler. CORS headers only. |
| Timeout | Route `maxDuration = 300`. No additional wrapper timeout in `handleMcpRequest`. |

---

## 2. Authentication

### Where the bearer token is read

```14:18:lib/mcp/handle-mcp-request.ts
function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}
```

Passed to `authenticateMcpBearer(rawBearer)` after config gate `mcpAuthIsConfigured()`.

### Auth modes

```9:13:lib/mcp/auth/mcp-auth-config.ts
export function getMcpAuthMode(): McpAuthMode {
  const raw = process.env.MCP_AUTH_MODE?.trim().toLowerCase();
  if (raw === "oauth" || raw === "dual") return raw;
  return "api_key";
}
```

| Mode | When enabled | Accepts |
|------|----------------|---------|
| `api_key` (default) | `MCP_API_KEY` set | Bearer must equal `MCP_API_KEY` |
| `oauth` | `AUTH0_DOMAIN` + `AUTH0_AUDIENCE` | Auth0 JWT only |
| `dual` | both API key and Auth0 env ready | Either matching API key (full tool access) or valid JWT (scope-enforced) |

```25:31:lib/mcp/auth/mcp-auth-config.ts
export function mcpAuthIsConfigured(): boolean {
  const mode = getMcpAuthMode();
  if (mode === "api_key") return apiKeyReady();
  if (mode === "oauth") return oauthConfigReady();
  return apiKeyReady() && oauthConfigReady();
}
```

If not configured → **503** with mode-specific body (`handle-mcp-request.ts` lines 120–125).

### JWT verification path (quote)

```34:56:lib/mcp/auth/verify-access-token.ts
    const { payload } = await jose.jwtVerify(token, getJwks(), {
      issuer: auth0IssuerUrl(domain),
      audience,
      clockTolerance: 30,
    });

    const scopes = new Set<string>();
    if (typeof payload.scope === "string") {
      for (const s of payload.scope.split(/\s+/)) {
        if (s) scopes.add(s);
      }
    }
    if (Array.isArray(payload.permissions)) {
      for (const p of payload.permissions) {
        if (typeof p === "string") scopes.add(p);
      }
    }

    const sub = typeof payload.sub === "string" ? payload.sub : "unknown";
    return {
      ok: true,
      token: { sub, scopes, payload },
    };
```

| Claim / setting | Exact value / source |
|-----------------|----------------------|
| JWKS URL | `https://${AUTH0_DOMAIN}/.well-known/jwks.json` via `auth0JwksUrl` (`mcp-auth-config.ts` 51–53) |
| Issuer | `https://${AUTH0_DOMAIN}/` via `auth0IssuerUrl` (`mcp-auth-config.ts` 47–49); domain normalized (strip `https://`, trailing `/`) |
| Audience | `process.env.AUTH0_AUDIENCE` via `getAuth0Audience()` |
| Algorithms | **Not set** in `jwtVerify` options. jose only restricts `alg` when `options.algorithms` is provided (`jose` flattened verify: if `algorithms` unset, no allow-list check). Allowed algs = whatever jose can verify against the JWKS key (typically Auth0 RS256). **No explicit `algorithms: ["RS256"]` (or similar) in this codebase.** |

### Does validation require `sub` → `profiles` / `auth.users`?

**No.** Token verification never queries Supabase. Missing/non-string `sub` becomes `"unknown"` and auth still succeeds. `sub` is only used as rate-limit key:

```54:59:lib/mcp/auth/authenticate-mcp-request.ts
    return {
      ok: true,
      ctx: {
        rateLimitKey: `jwt:${v.token.sub}`,
        oauthScopes: v.token.scopes,
      },
    };
```

`getMcpActorProfileId` (`lib/mcp/utils/actor.ts`) looks up `profiles` for **write attribution** (`created_by`), not for request authentication. It uses `MCP_ACTOR_PROFILE_ID` or first admin/`roles` containing admin/any profile — independent of JWT `sub`.

### Scope / permission / role checks

After auth, for OAuth/dual JWT callers on POST, JSON-RPC is scope-checked (`checkJsonRpcOAuthScopes`):

Accepted scopes:

```36:42:lib/mcp/auth/tool-scopes.ts
export function tokenAllowsRead(scopes: Set<string>): boolean {
  return scopes.has("mcp:read") || scopes.has("mcp:write");
}

export function tokenAllowsWrite(scopes: Set<string>): boolean {
  return scopes.has("mcp:write");
}
```

- Write tools require `mcp:write`.
- Read tools / `tools/list` / `initialize` require `mcp:read` or `mcp:write`.
- API-key mode: `oauthScopes: null` → **scope check skipped** (`handle-mcp-request.ts` 159: `if (method === "POST" && oauthScopes)`).

No role claim (e.g. `admin`) is checked on the MCP route itself.

### OAuth metadata endpoints

| Endpoint | File | Advertises |
|----------|------|------------|
| `/.well-known/oauth-authorization-server` | `app/.well-known/oauth-authorization-server/route.ts` | Auth0 `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`; `grant_types_supported`: **`["authorization_code", "refresh_token"]` only** (no `client_credentials`); scopes include `mcp:read`, `mcp:write` plus openid/profile/email/offline_access |
| `/.well-known/oauth-protected-resource/api/mcp` | `app/.well-known/oauth-protected-resource/api/mcp/route.ts` | RFC 9728 doc via `buildProtectedResourceMetadata`: `resource`, `authorization_servers: [Auth0 issuer]`, `scopes_supported: ["mcp:read","mcp:write"]`, `bearer_methods_supported: ["header"]` |

401/403 responses may include `WWW-Authenticate` with `resource_metadata` when OAuth config is ready (`www-authenticate.ts`).

### Alternate auth paths on MCP

| Mechanism | Present on MCP? |
|-----------|-----------------|
| `MCP_API_KEY` Bearer equality | **Yes** — modes `api_key` and `dual` |
| Auth0 JWT | **Yes** — modes `oauth` and `dual` |
| `CRON_SECRET` | **No** on MCP (used by cron routes only) |
| `SUPABASE_SERVICE_ROLE_KEY` as request auth | **No** (used inside tools as DB client key) |
| `x-api-key` header | **No** matches under `lib/mcp/` |
| Internal bypass / cron secret for MCP | **No** |

Catalog HTTP APIs used by catalog MCP tools authenticate separately with `MCP_API_KEY` (`lib/catalog-api-auth.ts`, `lib/catalog-api-fetch.ts`) — server-side call from the tool, not an alternate client entry to `/api/mcp`.

### Auth0-related env vars referenced in the repo

Only two Auth0 env names appear in code (searched `process.env.AUTH0_` and Auth0 string refs):

| Env var | File:line (read sites) |
|---------|------------------------|
| `AUTH0_DOMAIN` | `lib/mcp/auth/mcp-auth-config.ts:17,35`; `lib/mcp/auth/verify-access-token.ts:58`; `lib/mcp/auth/mcp-auth-debug.ts:9,22`; `app/.well-known/oauth-authorization-server/route.ts:20` |
| `AUTH0_AUDIENCE` | `lib/mcp/auth/mcp-auth-config.ts:17,42`; `lib/mcp/auth/verify-access-token.ts:68`; `lib/mcp/auth/mcp-auth-debug.ts:10,23` |

Also documented in `.env.example` lines 67–69.  
No `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, etc. in source.

Related non-Auth0 MCP env (for completeness of M2M options): `MCP_AUTH_MODE`, `MCP_API_KEY`, `MCP_RESOURCE_IDENTIFIER`, `MCP_ACTOR_PROFILE_ID`.

### Would an Auth0 client-credentials token pass?

**Depends on `MCP_AUTH_MODE` and scopes. Absence of a user `sub` / `profiles` row does not reject it.**

Evidence:

1. **Default `MCP_AUTH_MODE=api_key`**: client-credentials JWT is compared to `MCP_API_KEY` string equality → **rejected** (`authenticate-mcp-request.ts` 30–37: `"Bearer token does not match MCP_API_KEY"`).

2. **Mode `oauth` or `dual` (JWT path)**: `verifyAuth0AccessToken` only requires valid signature (JWKS), `issuer`, `audience`, clock. **No profiles/`auth.users` lookup.** A typical Auth0 M2M `sub` (`{client_id}@clients`) is a string and is accepted. Missing `sub` → `"unknown"`, still `ok: true`.

3. **After JWT auth**, tool calls need scopes `mcp:read` / `mcp:write` in `scope` or `permissions`. A client-credentials token **without** those scopes authenticates at the Bearer layer but gets **403** `insufficient_scope` on `tools/call` / `tools/list` / `initialize` (`jsonrpc-scope.ts`).

4. Discovery metadata does **not** advertise `client_credentials` as a supported grant (`oauth-authorization-server/route.ts` line 41). That does not itself reject a presented M2M access token at `/api/mcp`.

**Direct answer:** A valid Auth0 client-credentials access token with matching `aud`/`iss` and `mcp:read` (and `mcp:write` if mutating) **can pass JWT auth and scope checks when `MCP_AUTH_MODE` is `oauth` or `dual`**. It is **not** rejected for lacking a user `sub`. It **fails** under default `api_key` mode (token ≠ `MCP_API_KEY`). It **fails** tool use if scopes are missing.

---

## 3. Tool inventory

Registry: `lib/mcp/server.ts` registers tools from eight modules. **44 tools** total.

| Tool name | Source file | Read or Write | Tables touched | Input schema summary |
|-----------|-------------|---------------|----------------|----------------------|
| `list_goals` | `lib/mcp/tools/goals.ts` | Read | `admin_goals`, `admin_objectives` (count) | optional `status` |
| `get_goal` | `goals.ts` | Read | `admin_goals`, `admin_objectives`, `admin_key_results`, optionally `admin_tasks` | `goal_id`; optional `include_tasks` |
| `create_goal` | `goals.ts` | Write | `admin_goals` | `title`; optional `description`, `status` |
| `update_goal` | `goals.ts` | Write | `admin_goals`, `admin_objectives` (count) | `goal_id`; optional title/description/status |
| `delete_goal` | `goals.ts` | Write | `admin_objectives` (null `goal_id`), `admin_goals` soft-delete | `goal_id` |
| `list_objectives` | `lib/mcp/tools/objectives.ts` | Read | `admin_objectives`, `admin_key_results`, `admin_goals` | optional `goal_id`, `status` |
| `get_objective` | `objectives.ts` | Read | `admin_objectives`, `admin_projects`, `admin_tasks`, `admin_objective_metrics`, `admin_key_results`, `admin_goals` | `objective_id`; optional include flags |
| `create_objective` | `objectives.ts` | Write | `admin_objectives` | `title`; optional description, `goal_id`, `status`, `period` |
| `update_objective` | `objectives.ts` | Write | `admin_objectives` | `objective_id`; optional patch fields |
| `delete_objective` | `objectives.ts` | Write | `admin_objectives` soft-delete | `objective_id` |
| `list_projects` | `lib/mcp/tools/projects.ts` | Read | `admin_projects` | optional `objective_id`, `status` |
| `get_project` | `projects.ts` | Read | `admin_projects`, optionally `admin_tasks` | `project_id`; optional `include_tasks` |
| `create_project` | `projects.ts` | Write | `admin_projects` | `title`; optional description, `objective_id`, `key_result_id`, `status` |
| `update_project` | `projects.ts` | Write | `admin_projects` | `project_id`; optional patch |
| `delete_project` | `projects.ts` | Write | `admin_projects` soft-delete | `project_id` |
| `list_tasks` | `lib/mcp/tools/tasks.ts` | Read | `admin_tasks` | optional `project_id`, `objective_id`, `parent_task_id`, `include_subtasks`, `status`, `limit`, `offset` |
| `get_task` | `tasks.ts` | Read | `admin_tasks` | `task_id` |
| `create_task` | `tasks.ts` | Write | `admin_tasks` | `title`; optional description, project/objective/parent, status, priority |
| `update_task` | `tasks.ts` | Write | `admin_tasks` | `task_id`; optional patch incl. parent/status |
| `batch_update_task_sort` | `tasks.ts` | Write | `admin_tasks` | `items[]` of `task_id` + sort fields (max 200) |
| `delete_task` | `tasks.ts` | Write | `admin_tasks` soft-delete + detach children | `task_id` |
| `batch_create_tasks` | `tasks.ts` | Write | `admin_tasks` | optional project/objective/parent; `tasks[]` |
| `create_subtask` | `tasks.ts` | Write | `admin_tasks` | `parent_task_id`, `title`; optional description |
| `set_subtask_done` | `tasks.ts` | Write | `admin_tasks` | `subtask_id`, `done` |
| `get_metrics` | `lib/mcp/tools/metrics.ts` | Read | RPC `admin_refresh_objective_metrics`; `admin_objective_metrics` | `objective_id` |
| `get_funnel_overview` | `metrics.ts` | Read | `user_journey_funnel` or fallback `user_events`; `order_reservation_items` | none |
| `get_full_strategy` | `metrics.ts` | Read | `admin_goals`, `admin_objectives`, `admin_projects`, `admin_tasks` | optional `include_completed`, `detail_level` |
| `list_producers` | `lib/mcp/tools/catalog.ts` | Read | via `/api/producers` → producers (catalog) | none |
| `get_producer` | `catalog.ts` | Read | `/api/producers/:id` | `id` |
| `create_producer` | `catalog.ts` | Write | `/api/producers` POST | name, region; optional country, bios, etc. |
| `update_producer` | `catalog.ts` | Write | `/api/producers/:id` PATCH | `id` + partial fields |
| `list_wines` | `catalog.ts` | Read | `/api/wines` | optional `producer_id`, `type`, `is_published` |
| `get_wine` | `catalog.ts` | Read | `/api/wines/:id` | `id` |
| `create_wine` | `catalog.ts` | Write | `/api/wines` POST → `wines` | producer_id, name, appellation, PDP fields, etc. |
| `update_wine` | `catalog.ts` | Write | `/api/wines/:id` PATCH | `id` + partial PDP/catalog fields |
| `list_b2b_pallets` | `lib/mcp/tools/pallets.ts` | Read | `b2b_pallet_shipments`, `b2b_pallet_shipment_items`, `wines`, `producers` | optional `is_active` |
| `get_b2b_pallet` | `pallets.ts` | Read | same | `id` |
| `create_b2b_pallet` | `pallets.ts` | Write | `b2b_pallet_shipments` | `name`; optional cost/shipped/pickup |
| `add_wine_to_b2b_pallet` | `pallets.ts` | Write | `b2b_pallet_shipment_items` | `pallet_id`, `wine_id`, `quantity`; optional cost override |
| `update_b2b_pallet_item` | `pallets.ts` | Write | `b2b_pallet_shipment_items` | `id`; optional quantity / quantity_sold / cost |
| `list_pallets` | `pallets.ts` | Read | `pallets`, `shipping_regions`, `producers` | optional `status` |
| `get_pallet` | `pallets.ts` | Read | `pallets`, `order_reservations`, `order_reservation_items`, `wines`, `producers` | `id` |
| `get_gsc_performance` | `lib/mcp/tools/gsc.ts` | Read | Google Search Console API (no DB) | optional site, dates, dimension, limit, page_filter |
| `get_gsc_compare` | `gsc.ts` | Read | Google Search Console API | optional site, dimension, period_days, limit |

Write-tool name set for OAuth gating matches `WRITE_TOOLS` in `lib/mcp/auth/tool-scopes.ts` (lines 5–29).

### Tool-level authorization

- **API key / dual with API key**: every tool callable; no per-tool gate beyond auth.
- **OAuth JWT**: only `mcp:read` vs `mcp:write` (see §2). No per-user ownership checks inside tools.
- Write path wraps mutations with audit logging (`mcpWriteTool` → `logMcpAudit`).

### DB client

```1:6:lib/mcp/utils/supabase.ts
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Supabase admin client for MCP tools (service role, bypasses RLS). */
export function getMcpSupabase() {
  return getSupabaseAdmin();
}
```

```3:12:lib/supabase-admin.ts
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  ...
  return createClient(supabaseUrl, supabaseServiceKey);
}
```

**Service-role client; RLS bypassed.** GSC tools use Google service account (`GSC_SERVICE_ACCOUNT_KEY`), not Supabase. Catalog tools call internal HTTP APIs authenticated with `MCP_API_KEY`.

### `user_id` parameters acting on other users

No MCP tool input schema accepts a caller-supplied `user_id` to impersonate or mutate another user’s rows. `user_id` appears only as columns inside funnel aggregation (`get_funnel_overview`). Task/goal/project creates set `created_by` from `getMcpActorProfileId`, not from the JWT.

### Task ownership guards (`list_tasks`, `update_task`, `delete_task`, `batch_update_task_sort`, `set_subtask_done`)

**No guard exists** preventing modification of tasks created by another profile.

- `list_tasks`: filters by project/objective/parent/status/`deleted_at` only — no `created_by` filter (`tasks.ts` 72–84).
- `update_task`: updates by `id` only (`tasks.ts` 257–262).
- `delete_task`: soft-deletes by `id` only (`tasks.ts` 357–360).
- `batch_update_task_sort`: verifies IDs exist and not deleted; updates by `id` only (`tasks.ts` 303–328).
- `set_subtask_done`: updates by `id` only (`tasks.ts` 510–515).

Service role + no ownership filter ⇒ any authenticated MCP caller with write scope (or API key) can mutate any non-deleted task by UUID.

---

## 4. Existing weekly digest cron

### Route

`app/api/cron/operations-weekly-digest/route.ts`  
Vercel cron (`vercel.json` lines 27–29): path `/api/cron/operations-weekly-digest`, schedule **`0 7 * * 0`** (Sunday 07:00 UTC, once weekly).

### Auth

```13:18:app/api/cron/operations-weekly-digest/route.ts
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
```

### Queries / data assembled

Implemented in `lib/operations-weekly-digest.ts` → `buildOperationsDigestPayload(since)` (lookback 7 days):

1. **`admin_task_activity`**: activity since `sinceIso`, join `admin_tasks`, `profiles` (actor email); skip deleted tasks; up to 120 lines.
2. **`admin_task_comments`**: comments since, join tasks + author profiles; up to 40 lines.
3. **`admin_tasks`**: new tasks (`created_at >= since`, not deleted); up to 25.
4. **`admin_projects`**: new projects; up to 20.

Email HTML/text composed by `digestPayloadToHtml` / `digestPayloadToText` in the same file.

### Recipients

`listAdminEmails()`: `profiles` where `role = "admin"` and email not null.  
Sent via `sendGridService.sendEmail` with `emailKind: "operations_digest"` (Resend under the hood per UI copy).

Scheduled entry: `runScheduledWeeklyOperationsDigest` — requires settings enabled, Stockholm Sunday 12:00–12:14 window, and not sent within last 5 days; then builds payload, emails all admins, marks `admin_operations_weekly_digest_settings.last_sent_at`.

Settings UI / test send: `components/admin/operations/operations-weekly-digest-settings.tsx`, `lib/actions/operations-digest-settings.ts` (test email to current admin only).

### Is it currently working?

**Scheduled path has an obvious schedule mismatch (likely always skips):**

| Source | Claim |
|--------|--------|
| Route comment (`route.ts` 8–9) | Cron hourly on Sundays; run only Stockholm Sun 12:00–12:14 |
| UI copy | Sunday 12 Europe/Stockholm |
| Code gate | `isStockholmSundayNoonWindow` → weekday Sun and hour === 12 and minute &lt; 15 |
| `vercel.json` | **`0 7 * * 0`** — once at **07:00 UTC** on Sunday |

At 07:00 UTC, Europe/Stockholm is 08:00 (CEST) or 09:00 (CET), **never** 12:00. Cron would return `{ ok: true, skipped: "not_time_slot" }` whenever it fires while enabled.

Additional skip conditions that are intentional: `enabled=false`, `already_sent_recently`, `no_emails_sent` (zero successful sends).

Manual/test path (`sendOperationsWeeklyDigestTestEmail`) does not use the time window; that path can still work if Resend/admin email work.

Callers that exist: Vercel cron → GET route; admin settings toggle + test action. No evidence of a removed caller in code — the dead/mismatched piece is the **cron schedule vs time-window gate**.

---

## 5. Data availability gaps (weekly operations report)

| Desired data | Reachable via MCP? | Tool / alternate |
|--------------|--------------------|------------------|
| Task status by project | **Yes** | `list_tasks` (`project_id`, `status`); `get_project` (`include_tasks=true`); `get_full_strategy` (`detail_level=full`) |
| Funnel numbers | **Yes** (all-time aggregate, not week-scoped) | `get_funnel_overview` → `user_journey_funnel` / `user_events` + bottle sum from `order_reservation_items`. Week-window funnel: **not** exposed as an MCP param; analytics admin routes / tables hold time-bounded data separately |
| GSC click deltas | **Yes** | `get_gsc_compare` (and `get_gsc_performance`) |
| Pallet fill state | **Yes** (derive from response) | `get_pallet` returns `bottle_capacity`, `total_bottles`, `wine_counts` (fill % not precomputed; same reservation statuses as `PALLET_FILL_STATUSES` in `lib/pallet-fill-count.ts`). `list_pallets` has capacity/status but not fill totals |
| B2B pallet stock | **Yes** | `list_b2b_pallets` / `get_b2b_pallet` (`quantity`, `quantity_sold` on items) |

---

## Blockers for machine-to-machine access

Most severe first:

1. **Default auth mode is shared-secret (`MCP_AUTH_MODE` unset → `api_key`)**. An Auth0 client-credentials JWT does not equal `MCP_API_KEY` and is rejected at Bearer check. Production mode is UNKNOWN from this repo alone (env not readable here for deploy); code default blocks JWT-only M2M unless operators set `oauth` or `dual`.

2. **OAuth tool use requires Auth0 scopes `mcp:read` / `mcp:write`**. Client-credentials tokens without those claims in `scope` or `permissions` pass JWT verify but fail JSON-RPC scope checks with 403. Authorization-server metadata also omits `client_credentials` from `grant_types_supported`, which can confuse discovery-based clients (does not itself reject a presented token).

3. **No algorithms allow-list is configured** (informational / ops risk, not a blocker if Auth0 RS256 JWKS works). UNKNOWN whether any non-RS256 M2M tokens would be accepted; jose does not restrict `alg` unless `options.algorithms` is set.

4. **Catalog MCP tools require `MCP_API_KEY` server-side** even when the outer MCP request used OAuth (`catalogApiFetch` throws if `MCP_API_KEY` missing). OAuth-only deployments without API key break producer/wine tools.

5. **Service-role DB + no per-caller ownership** — not an auth blocker for connecting, but any successful M2M credential can read/write all admin/strategy/pallet data exposed by tools (including any task by id).

6. **Weekly digest cron schedule vs Stockholm noon window** — unrelated to MCP auth, but the existing scheduled digest path will not send under current `vercel.json` timing; not a substitute for an agent-driven report until fixed.

Non-blockers confirmed: JWT path does **not** require `sub` ∈ `profiles`/`auth.users`; middleware does not require browser session for `/api/mcp`; transport is stateless Streamable HTTP suitable for serverless POST.
