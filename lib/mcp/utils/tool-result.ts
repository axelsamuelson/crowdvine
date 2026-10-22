import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { logMcpToolPayloadMetrics } from "./payload-metrics";

export type McpDocument = {
  uri: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type McpPayloadMetrics = {
  tool: string;
  /** When omitted, no row_count field is logged. */
  rowCount?: number;
};

export function mcpJsonResult(
  data: unknown,
  metrics?: McpPayloadMetrics,
): CallToolResult {
  const text = JSON.stringify(data);
  if (metrics) {
    logMcpToolPayloadMetrics({
      tool: metrics.tool,
      ok: true,
      responseChars: text.length,
      rowCount: metrics.rowCount,
    });
  }
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/** JSON the model can read, plus the file itself so a client can attach it to an email draft. */
export function mcpDocumentResult(
  data: unknown,
  document: McpDocument,
  metrics?: McpPayloadMetrics,
): CallToolResult {
  const text = JSON.stringify(data);
  if (metrics) {
    logMcpToolPayloadMetrics({
      tool: metrics.tool,
      ok: true,
      responseChars: text.length,
      rowCount: metrics.rowCount,
    });
  }
  return {
    content: [
      { type: "text", text },
      {
        type: "resource",
        resource: {
          uri: document.uri,
          mimeType: document.mimeType,
          blob: Buffer.from(document.bytes).toString("base64"),
        },
      },
    ],
  };
}

export function mcpErrorResult(
  message: string,
  tool?: string,
): CallToolResult {
  if (tool) {
    logMcpToolPayloadMetrics({
      tool,
      ok: false,
      responseChars: message.length,
    });
  }
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}
