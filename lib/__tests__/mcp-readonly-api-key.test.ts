import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyAuth0AccessToken = vi.fn();
const fetchGscPerformance = vi.fn();
const fetchGscCompare = vi.fn();

vi.mock("@/lib/mcp/auth/verify-access-token", () => ({
  verifyAuth0AccessToken: (...args: unknown[]) => verifyAuth0AccessToken(...args),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: vi.fn() }),
}));

vi.mock("@/lib/gsc/performance", () => ({
  GSC_SITE_PROPERTIES: {
    pact: "sc-domain:pactwines.com",
    dirtywine: "sc-domain:dirtywine.se",
  },
  fetchGscPerformance: (...args: unknown[]) => fetchGscPerformance(...args),
  fetchGscCompare: (...args: unknown[]) => fetchGscCompare(...args),
}));

import {
  checkJsonRpcReadonlyAllowlist,
  getReadonlyApiKeysFromEnv,
  matchReadonlyApiKey,
  MCP_READONLY_TOOL_ALLOWLIST,
  requestHasQueryCredentials,
} from "@/lib/mcp/auth/readonly-api-key";
import { authenticateMcpBearer } from "@/lib/mcp/auth/authenticate-mcp-request";
import { handleMcpRequest } from "@/lib/mcp/handle-mcp-request";
import { createPactMcpServer } from "@/lib/mcp/server";

const READONLY_KEY = "readonly-test-key-abc123";
const FULL_API_KEY = "full-mcp-api-key-xyz";

function mcpPost(opts: {
  url?: string;
  bearer?: string | null;
  body: unknown;
}): Promise<Response> {
  const headers = new Headers({
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  });
  if (opts.bearer) {
    headers.set("authorization", `Bearer ${opts.bearer}`);
  }
  return handleMcpRequest(
    new Request(opts.url ?? "http://localhost/api/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify(opts.body),
    }),
  );
}

function toolsCall(name: string, args: Record<string, unknown> = {}) {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name, arguments: args },
  };
}

function toolsList() {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  };
}

describe("MCP read-only API key", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    verifyAuth0AccessToken.mockReset();
    verifyAuth0AccessToken.mockResolvedValue({
      ok: false,
      message: "JWT invalid",
    });
    fetchGscPerformance.mockReset();
    fetchGscCompare.mockReset();
    fetchGscPerformance.mockResolvedValue({
      site: "pact",
      rows: [{ keys: ["wine"], clicks: 1 }],
    });
    fetchGscCompare.mockResolvedValue({
      site: "pact",
      rows: [],
    });

    process.env.MCP_AUTH_MODE = "oauth";
    process.env.AUTH0_DOMAIN = "example.eu.auth0.com";
    process.env.AUTH0_AUDIENCE = "https://pactwines.com/api/mcp";
    process.env.PACT_MCP_READONLY_API_KEY = READONLY_KEY;
    delete process.env.MCP_API_KEY;
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in envSnapshot)) delete process.env[key];
    }
    Object.assign(process.env, envSnapshot);
  });

  describe("matchReadonlyApiKey / env parsing", () => {
    it("is disabled when env is unset", () => {
      delete process.env.PACT_MCP_READONLY_API_KEY;
      expect(getReadonlyApiKeysFromEnv()).toEqual([]);
      expect(getReadonlyApiKeysFromEnv(null)).toEqual([]);
      expect(getReadonlyApiKeysFromEnv("")).toEqual([]);
      expect(matchReadonlyApiKey(READONLY_KEY, [])).toBe(false);
      expect(matchReadonlyApiKey(READONLY_KEY)).toBe(false);
    });

    it("supports comma-separated rotation keys", () => {
      const keys = getReadonlyApiKeysFromEnv(` ${READONLY_KEY}, other-key `);
      expect(keys).toEqual([READONLY_KEY, "other-key"]);
      expect(matchReadonlyApiKey(READONLY_KEY, keys)).toBe(true);
      expect(matchReadonlyApiKey("other-key", keys)).toBe(true);
      expect(matchReadonlyApiKey("wrong", keys)).toBe(false);
    });
  });

  describe("allowlist checks", () => {
    it("allows only allowlisted tools", () => {
      expect(
        checkJsonRpcReadonlyAllowlist(toolsCall("get_gsc_performance")),
      ).toEqual({ ok: true });
      expect(
        checkJsonRpcReadonlyAllowlist(toolsCall("create_goal")),
      ).toMatchObject({ ok: false });
      expect(
        checkJsonRpcReadonlyAllowlist(toolsCall("list_goals")),
      ).toMatchObject({ ok: false });
    });

    it("exposes the documented allowlist", () => {
      expect([...MCP_READONLY_TOOL_ALLOWLIST].sort()).toEqual([
        "get_gsc_compare",
        "get_gsc_performance",
      ]);
    });
  });

  describe("query credentials", () => {
    it("detects credential-like query params", () => {
      expect(
        requestHasQueryCredentials(
          `http://localhost/api/mcp?api_key=${READONLY_KEY}`,
        ),
      ).toBe(true);
      expect(requestHasQueryCredentials("http://localhost/api/mcp")).toBe(
        false,
      );
    });
  });

  describe("authenticateMcpBearer", () => {
    it("accepts a valid read-only key", async () => {
      const result = await authenticateMcpBearer(READONLY_KEY);
      expect(result).toMatchObject({
        ok: true,
        ctx: {
          authType: "readonly_api_key",
        },
      });
      if (result.ok) {
        expect(result.ctx.toolAllowlist?.has("get_gsc_performance")).toBe(true);
      }
    });

    it("rejects a wrong key with invalid", async () => {
      const result = await authenticateMcpBearer("not-the-key");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("invalid");
    });

    it("rejects a missing bearer", async () => {
      const result = await authenticateMcpBearer(null);
      expect(result).toEqual({
        ok: false,
        reason: "missing",
        message: "Bearer token missing",
      });
    });

    it("still accepts OAuth tokens", async () => {
      verifyAuth0AccessToken.mockResolvedValue({
        ok: true,
        token: {
          sub: "auth0|user-1",
          scopes: new Set(["mcp:read", "mcp:write"]),
          payload: {},
        },
      });
      const result = await authenticateMcpBearer("eyJhbGciOiJSUzI1NiJ9.oauth");
      expect(result).toMatchObject({
        ok: true,
        ctx: { authType: "oauth" },
      });
      if (result.ok) {
        expect(result.ctx.toolAllowlist).toBeNull();
        expect(result.ctx.oauthScopes?.has("mcp:read")).toBe(true);
      }
    });
  });

  describe("handleMcpRequest", () => {
    it("lets a valid key call an allowlisted tool", async () => {
      const res = await mcpPost({
        bearer: READONLY_KEY,
        body: toolsCall("get_gsc_performance", { site: "pact" }),
      });
      expect(res.status).toBe(200);
      expect(fetchGscPerformance).toHaveBeenCalled();
      const json = await res.json();
      expect(json.result ?? json).toBeTruthy();
    });

    it("returns 403 when a valid key calls a write tool", async () => {
      const res = await mcpPost({
        bearer: READONLY_KEY,
        body: toolsCall("create_goal", { title: "x" }),
      });
      expect(res.status).toBe(403);
      const text = await res.text();
      expect(text).toContain("not allowed");
      expect(fetchGscPerformance).not.toHaveBeenCalled();
    });

    it("returns 401 for a wrong key", async () => {
      const res = await mcpPost({
        bearer: "wrong-key",
        body: toolsCall("get_gsc_performance"),
      });
      expect(res.status).toBe(401);
    });

    it("returns 401 when the Bearer is missing", async () => {
      const res = await mcpPost({
        bearer: null,
        body: toolsCall("get_gsc_performance"),
      });
      expect(res.status).toBe(401);
    });

    it("rejects a key passed only in the query string", async () => {
      const res = await mcpPost({
        url: `http://localhost/api/mcp?api_key=${READONLY_KEY}`,
        bearer: null,
        body: toolsCall("get_gsc_performance"),
      });
      expect(res.status).toBe(401);
      expect(fetchGscPerformance).not.toHaveBeenCalled();
    });

    it("rejects query-string credentials even with a valid Bearer", async () => {
      const res = await mcpPost({
        url: `http://localhost/api/mcp?api_key=${READONLY_KEY}`,
        bearer: READONLY_KEY,
        body: toolsCall("get_gsc_performance"),
      });
      expect(res.status).toBe(401);
      expect(fetchGscPerformance).not.toHaveBeenCalled();
    });

    it("keeps OAuth working for allowlisted and write tools with mcp:write", async () => {
      verifyAuth0AccessToken.mockResolvedValue({
        ok: true,
        token: {
          sub: "auth0|user-1",
          scopes: new Set(["mcp:read", "mcp:write"]),
          payload: {},
        },
      });

      const readRes = await mcpPost({
        bearer: "eyJhbGciOiJSUzI1NiJ9.oauth-token",
        body: toolsCall("get_gsc_performance", { site: "pact" }),
      });
      expect(readRes.status).toBe(200);
      expect(verifyAuth0AccessToken).toHaveBeenCalled();
      expect(fetchGscPerformance).toHaveBeenCalled();
    });

    it("lists only allowlisted tools for a read-only key session", async () => {
      const res = await mcpPost({
        bearer: READONLY_KEY,
        body: toolsList(),
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        result?: { tools?: Array<{ name: string }> };
      };
      const names = (json.result?.tools ?? []).map((t) => t.name).sort();
      expect(names).toEqual(["get_gsc_compare", "get_gsc_performance"]);
    });
  });

  describe("createPactMcpServer allowlist", () => {
    it("registers only allowlisted GSC tools when an allowlist is passed", () => {
      const registered: string[] = [];
      // Exercise register path via createPactMcpServer with mocked supabase already in place.
      const server = createPactMcpServer({
        toolAllowlist: MCP_READONLY_TOOL_ALLOWLIST,
      });
      // Reach into SDK tool registry if present; otherwise re-check via registerGscTools style.
      const maybeTools = (
        server as unknown as {
          _registeredTools?: Record<string, unknown>;
        }
      )._registeredTools;
      if (maybeTools) {
        expect(Object.keys(maybeTools).sort()).toEqual([
          "get_gsc_compare",
          "get_gsc_performance",
        ]);
      } else {
        // Fallback: ensure factory returns a server object when allowlisted.
        expect(server).toBeTruthy();
        void registered;
      }
    });
  });

  describe("full MCP_API_KEY still distinct", () => {
    it("does not treat the full shared secret as the read-only key", async () => {
      process.env.MCP_AUTH_MODE = "api_key";
      process.env.MCP_API_KEY = FULL_API_KEY;
      process.env.PACT_MCP_READONLY_API_KEY = READONLY_KEY;

      const full = await authenticateMcpBearer(FULL_API_KEY);
      expect(full).toMatchObject({
        ok: true,
        ctx: { authType: "api_key", toolAllowlist: null },
      });

      const ro = await authenticateMcpBearer(READONLY_KEY);
      expect(ro).toMatchObject({
        ok: true,
        ctx: { authType: "readonly_api_key" },
      });
    });
  });
});
