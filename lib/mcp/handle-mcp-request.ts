import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createPactMcpServer } from "./server";
import { checkMcpRateLimit } from "./utils/rate-limit";

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

/**
 * @modelcontextprotocol/sdk streamable HTTP transport returns 406 unless Accept is strict.
 * Remote clients (e.g. Claude connectors) often send a catch-all Accept or omit
 * text/event-stream, which breaks negotiation even though they can handle SSE + JSON.
 * Append MCP-required types.
 */
const MCP_CORS_HEADERS: Record<string, string> = {
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

/**
 * Streamable HTTP MCP endpoint. Stateless (ingen session) så det fungerar på Vercel serverless.
 */
export async function handleMcpRequest(req: Request): Promise<Response> {
  const method = req.method.toUpperCase();

  // CORS preflight: no Authorization header — must not require Bearer or preflight fails.
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: MCP_CORS_HEADERS });
  }

  const expected = process.env.MCP_API_KEY?.trim();
  if (!expected) {
    return new Response(
      "MCP disabled: set MCP_API_KEY in .env.local (or the host environment) and restart next dev.\n",
      { status: 503, headers: MCP_CORS_HEADERS },
    );
  }

  const token = bearerToken(req);
  if (!token || token !== expected) {
    return new Response(
      "Unauthorized: Bearer token missing or does not match MCP_API_KEY. " +
        "curl uses your shell ($MCP_API_KEY), not .env.local — run export MCP_API_KEY='…same as .env.local…' or paste the token in the header.\n",
      { status: 401, headers: MCP_CORS_HEADERS },
    );
  }

  if (!checkMcpRateLimit(token)) {
    return new Response("Too Many Requests\n", {
      status: 429,
      headers: MCP_CORS_HEADERS,
    });
  }

  if (method === "HEAD") {
    return new Response(null, { status: 200, headers: MCP_CORS_HEADERS });
  }

  const mcp = createPactMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // JSON responses work better with strict HTTP clients than long-lived SSE on serverless.
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
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}
