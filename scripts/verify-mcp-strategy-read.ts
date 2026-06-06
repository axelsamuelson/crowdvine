/**
 * Verifies MCP strategy reads (same selects as list_objectives / get_full_strategy).
 * Usage: pnpm tsx scripts/verify-mcp-strategy-read.ts
 */
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { MCP_STRATEGY_OBJECTIVE_COLUMNS } from "../lib/mcp/utils/mcp-strategy-selects";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key);

async function main() {
  console.log("Checking MCP_STRATEGY_OBJECTIVE_COLUMNS (get_full_strategy standard/full, list_objectives)…");
  const { data, error } = await sb
    .from("admin_objectives")
    .select(MCP_STRATEGY_OBJECTIVE_COLUMNS)
    .is("deleted_at", null)
    .limit(3);

  if (error) {
    console.error("FAIL:", error.message);
    console.error(
      "\nApply supabase/migrations/20250525150700_admin_objective_insights.sql in the Supabase SQL editor, then re-run this script.",
    );
    process.exit(1);
  }

  console.log("OK: admin_objectives MCP columns readable, rows:", data?.length ?? 0);
}

main();
