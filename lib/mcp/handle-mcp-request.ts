import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createPactMcpServer } from "./server";
import { checkMcpRateLimit } from "./utils/rate-limit";

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

/**
 * Streamable HTTP MCP endpoint. Stateless (ingen session) så det fungerar på Vercel serverless.
 */
export async function handleMcpRequest(req: Request): Promise<Response> {
  const expected = process.env.MCP_API_KEY?.trim();
  if (!expected) {
    return new Response(
      "MCP disabled: set MCP_API_KEY in .env.local (or the host environment) and restart next dev.\n",
      { status: 503 },
    );
  }

  const token = bearerToken(req);
  if (!token || token !== expected) {
    return new Response(
      "Unauthorized: Bearer token missing or does not match MCP_API_KEY. " +
        "curl uses your shell ($MCP_API_KEY), not .env.local — run export MCP_API_KEY='…same as .env.local…' or paste the token in the header.\n",
      { status: 401 },
    );
  }

  if (!checkMcpRateLimit(token)) {
    return new Response("Too Many Requests\n", { status: 429 });
  }

  const mcp = createPactMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await mcp.connect(transport);
  return transport.handleRequest(req);
}
