import {
  handleMcpRequest,
  MCP_CORS_HEADERS,
} from "@/lib/mcp/handle-mcp-request";

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
