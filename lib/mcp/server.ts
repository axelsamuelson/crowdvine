import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpSupabase } from "./utils/supabase";
import { registerGoalTools } from "./tools/goals";
import { registerObjectiveTools } from "./tools/objectives";
import { registerProjectTools } from "./tools/projects";
import { registerTaskTools } from "./tools/tasks";
import { registerMetricsTools } from "./tools/metrics";

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

  return server;
}
