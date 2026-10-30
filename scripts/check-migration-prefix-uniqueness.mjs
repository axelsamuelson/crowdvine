#!/usr/bin/env node
/**
 * Fail CI if two files in migrations/ share the same numeric prefix,
 * except for explicitly allowlisted historic collisions.
 *
 * Only files matching /^(\d+)_.*\.sql$/ are checked.
 * Letter-suffix names (e.g. 071b_…) and unnumbered SQL are ignored.
 */
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "migrations");

/**
 * Historic duplicate prefixes already on main. Prefix → exact allowed filenames.
 * Adding a new file under an allowlisted prefix fails unless this map is updated.
 */
const HISTORIC_DUPLICATE_ALLOWLIST = {
  "049": [
    "049_add_profile_description_avatar.sql",
    "049_fix_existing_data.sql",
    "049_pallet_completion_system.sql",
    "049_verify_and_fix.sql",
  ],
  "050": ["050_add_wine_identity.sql", "050_create_analytics_tables.sql"],
  "075": ["075_add_source_to_cart_items.sql", "075_b2b_pallet_cost.sql"],
  "076": ["076_add_warehouse_orders.sql", "076_b2b_pallet_quantity_sold.sql"],
  "100": ["100_menu_extraction_critic_actor.sql", "100_operations_module.sql"],
  "101": [
    "101_menu_extracted_rows_auto_corrected_catchup.sql",
    "101_starwinelist_remove_404_sources.sql",
  ],
  "156": ["156_geo_zones_delivery_link.sql", "156_homepage_hero_en_no_em_dash.sql"],
  "157": [
    "157_dirty_wine_invoice_org_number.sql",
    "157_site_title_pact_wines.sql",
    "157_us_market_usd.sql",
  ],
  "158": ["158_dirty_wine_invoice_vat_number.sql", "158_wines_additives.sql"],
  "218": [
    "218_b2b_pallet_status.sql",
    "218_homepage_hero_title_middlemen.sql",
    "218_producers_website_instagram.sql",
    "218_systembolaget_wine_score.sql",
  ],
  "222": ["222_b2b_pallet_shipments_is_new.sql", "222_finance_fulfillment_costs.sql"],
  "230": ["230_drop_wines_is_direct_import.sql", "230_enable_rls_exposed_tables.sql"],
  "231": [
    "231_analytics_internal_visitors.sql",
    "231_soften_la_marotte_additive_claims.sql",
  ],
  "232": ["232_analytics_checkout_steps.sql", "232_mcp_audit_log_before_after.sql"],
};

const PREFIX_RE = /^(\d+)_.+\.sql$/;

const byPrefix = new Map();
for (const name of readdirSync(migrationsDir)) {
  const m = name.match(PREFIX_RE);
  if (!m) continue;
  const prefix = m[1];
  if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
  byPrefix.get(prefix).push(name);
}

const failures = [];

for (const [prefix, files] of [...byPrefix.entries()].sort((a, b) =>
  a[0].localeCompare(b[0], undefined, { numeric: true }),
)) {
  const sorted = [...files].sort();
  if (sorted.length <= 1) continue;

  const allowed = HISTORIC_DUPLICATE_ALLOWLIST[prefix];
  if (!allowed) {
    failures.push(
      `prefix ${prefix} has ${sorted.length} files (not allowlisted): ${sorted.join(", ")}`,
    );
    continue;
  }

  const allowedSorted = [...allowed].sort();
  const same =
    sorted.length === allowedSorted.length &&
    sorted.every((f, i) => f === allowedSorted[i]);
  if (!same) {
    failures.push(
      `prefix ${prefix} files changed vs historic allowlist.\n` +
        `  actual:   ${sorted.join(", ")}\n` +
        `  allowed:  ${allowedSorted.join(", ")}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Migration numeric prefix uniqueness check failed:\n");
  for (const f of failures) console.error(`- ${f}`);
  console.error(
    "\nUse the next free integer prefix. Do not add new files under an existing number.",
  );
  process.exit(1);
}

console.log(
  `Migration prefix uniqueness OK (${byPrefix.size} numbered prefixes; ${Object.keys(HISTORIC_DUPLICATE_ALLOWLIST).length} historic duplicates allowlisted).`,
);
