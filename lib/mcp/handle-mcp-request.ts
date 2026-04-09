import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcpBearer } from "./auth/authenticate-mcp-request";
import { checkJsonRpcOAuthScopes } from "./auth/jsonrpc-scope";
import {
  getMcpAuthMode,
  mcpAuthIsConfigured,
  oauthConfigReady,
} from "./auth/mcp-auth-config";
import { wwwAuthenticateBearer } from "./auth/www-authenticate";
import { createPactMcpServer } from "./server";
import { checkMcpRateLimit } from "./utils/rate-limit";

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

function mcpDisabledBody(): string {
  const mode = getMcpAuthMode();
  if (mode === "oauth") {
    return (
      "MCP disabled: set AUTH0_DOMAIN and AUTH0_AUDIENCE (and MCP_AUTH_MODE=oauth).\n"
    );
  }
  if (mode === "dual") {
    return (
      "MCP disabled: dual mode requires MCP_API_KEY and AUTH0_DOMAIN + AUTH0_AUDIENCE.\n"
    );
  }
  return (
    "MCP disabled: set MCP_API_KEY in .env.local (or the host environment) and restart next dev.\n"
  );
}

/**
 * @modelcontextprotocol/sdk streamable HTTP transport returns 406 unless Accept is strict.
 * Remote clients (e.g. Claude connectors) often send a catch-all Accept or omit
 * text/event-stream, which breaks negotiation even though they can handle SSE + JSON.
 * Append MCP-required types.
 */
export const MCP_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS, HEAD",
  "Access-Control-Allow-Headers":
    "authorization, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id",
  "Access-Control-Max-Age": "86400",
};

/**
 * Relax headers the MCP SDK requires so remote clients (browser preflight, Claude, etc.) succeed.
 */
function withStreamableHttpCompatibleHeaders(req: Request): Request {
  const method = req.method.toUpperCase();
  if (method === "DELETE") return req;

  const headers = new Headers(req.headers);
  let changed = false;

  const accept = headers.get("accept") ?? "";
  const lower = accept.toLowerCase();

  if (method === "GET" && !lower.includes("text/event-stream")) {
    headers.set(
      "accept",
      accept.trim() ? `${accept}, text/event-stream` : "text/event-stream",
    );
    changed = true;
  }

  if (method === "POST") {
    if (!lower.includes("application/json") || !lower.includes("text/event-stream")) {
      const extra = "application/json, text/event-stream";
      headers.set("accept", accept.trim() ? `${accept}, ${extra}` : extra);
      changed = true;
    }
    const ct = headers.get("content-type") ?? "";
    if (!ct.toLowerCase().includes("application/json")) {
      headers.set("content-type", "application/json; charset=utf-8");
      changed = true;
    }
  }

  if (!changed) return req;

  const init: RequestInit = {
    method: req.method,
    headers,
  };
  if (req.body !== null) {
    init.body = req.body;
    init.duplex = "half";
  }

  return new Request(req.url, init);
}

function withExtraHeaders(
  base: Record<string, string>,
  extra: Record<string, string | undefined>,
): Record<string, string> {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * Streamable HTTP MCP endpoint. Stateless (ingen session) så det fungerar på Vercel serverless.
 */
export async function handleMcpRequest(req: Request): Promise<Response> {
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: MCP_CORS_HEADERS });
  }

  if (!mcpAuthIsConfigured()) {
    return new Response(mcpDisabledBody(), {
      status: 503,
      headers: MCP_CORS_HEADERS,
    });
  }

  const includeMeta = oauthConfigReady();
  const rawBearer = bearerToken(req);

  const auth = await authenticateMcpBearer(rawBearer);
  if (!auth.ok) {
    const desc =
      auth.reason === "missing"
        ? "Bearer access token required"
        : auth.message;
    const www = wwwAuthenticateBearer({
      error: "invalid_token",
      description: desc,
      req,
      includeResourceMetadata: includeMeta,
    });
    return new Response(
      auth.reason === "missing"
        ? "Unauthorized: missing Authorization: Bearer token.\n"
        : `Unauthorized: ${auth.message}\n`,
      {
        status: 401,
        headers: withExtraHeaders(MCP_CORS_HEADERS, {
          "WWW-Authenticate": www,
        }),
      },
    );
  }

  const { rateLimitKey, oauthScopes } = auth.ctx;

  if (method === "POST" && oauthScopes) {
    const clone = req.clone();
    const text = await clone.text();
    if (text) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
      if (parsed !== undefined) {
        const scopeCheck = checkJsonRpcOAuthScopes(parsed, oauthScopes);
        if (!scopeCheck.ok) {
          const www = wwwAuthenticateBearer({
            error: "insufficient_scope",
            description: scopeCheck.message,
            req,
            includeResourceMetadata: includeMeta,
          });
          return new Response(`${scopeCheck.message}\n`, {
            status: 403,
            headers: withExtraHeaders(MCP_CORS_HEADERS, {
              "WWW-Authenticate": www,
            }),
          });
        }
      }
    }
  }

  if (!checkMcpRateLimit(rateLimitKey)) {
    return new Response("Too Many Requests\n", {
      status: 429,
      headers: MCP_CORS_HEADERS,
    });
  }

  if (method === "HEAD") {
    return new Response(null, { status: 200, headers: MCP_CORS_HEADERS });
  }

  if (method === "GET") {
    const accept = (req.headers.get("accept") ?? "").toLowerCase();
    if (!accept.includes("text/event-stream")) {
      return Response.json(
        {
          ok: true,
          service: "pact-okr-mcp",
          hint: "POST JSON-RPC to this URL; use Accept: text/event-stream for SSE probe.",
        },
        { status: 200, headers: MCP_CORS_HEADERS },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(": pact-okr streamable-http reachable\n\n"),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        ...MCP_CORS_HEADERS,
      },
    });
  }

  const mcp = createPactMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await mcp.connect(transport);
  const res = await transport.handleRequest(
    withStreamableHttpCompatibleHeaders(req),
  );

  const out = new Headers(res.headers);
  for (const [k, v] of Object.entries(MCP_CORS_HEADERS)) {
    if (!out.has(k)) out.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: out,
  });
}
