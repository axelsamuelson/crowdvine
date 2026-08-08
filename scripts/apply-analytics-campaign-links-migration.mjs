#!/usr/bin/env node
/**
 * Apply migrations/188_analytics_campaign_links.sql via Supabase Management API.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-analytics-campaign-links-migration.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config({ path: ".env.local" });

const PROJECT_REF = "abrnvjqwpdkodgrtezeg";
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens",
  );
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  join(__dirname, "../migrations/188_analytics_campaign_links.sql"),
  "utf8",
);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

const body = await res.text();
console.log(res.status, body.slice(0, 2000));
if (!res.ok) process.exit(1);
console.log("Migration 188 applied.");
