import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpSupabase } from "./utils/supabase";
import { registerGoalTools } from "./tools/goals";
import { registerObjectiveTools } from "./tools/objectives";
import { registerProjectTools } from "./tools/projects";
import { registerTaskTools } from "./tools/tasks";
import { registerMetricsTools } from "./tools/metrics";
import { registerCatalogTools } from "./tools/catalog";
import { registerPalletTools } from "./tools/pallets";
import { registerLagerFraktReadTools } from "./tools/lager-frakt";
import { registerGscTools } from "./tools/gsc";
import { registerSystembolagetTools } from "./tools/systembolaget";
import { registerTop100Tools } from "./tools/top-100";
import { registerInvoiceTools } from "./tools/invoices";
import { registerDeliveryNoteTools } from "./tools/delivery-notes";

export function createPactMcpServer(): McpServer {
  const sb = getMcpSupabase();
  const server = new McpServer({
    name: "pact-okr",
    version: "1.0.0",
  });

  registerGoalTools(server, sb);
  registerObjectiveTools(server, sb);
  registerProjectTools(server, sb);
  registerTaskTools(server, sb);
  registerMetricsTools(server, sb);
  registerCatalogTools(server, sb);
  registerPalletTools(server, sb);
  registerLagerFraktReadTools(server, sb);
  registerGscTools(server);
  registerSystembolagetTools(server, sb);
  registerTop100Tools(server);
  // issue_invoice assigns the legal number. get_invoice_pdf is the file for an email draft.
  // Void, mark paid, and sending email stay outside MCP.
  registerInvoiceTools(server, sb);
  registerDeliveryNoteTools(server, sb);

  return server;
}
