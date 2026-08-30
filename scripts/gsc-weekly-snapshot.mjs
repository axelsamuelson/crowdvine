/**
 * One-shot GSC weekly snapshot — uses suganthan-gsc-mcp auth + analytics.
 * Env loaded from .cursor/mcp.json (not committed).
 */
import { readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const mcp = JSON.parse(
  readFileSync(new URL("../.cursor/mcp.json", import.meta.url), "utf8"),
);
const env = mcp.mcpServers.gsc.env;
for (const [k, v] of Object.entries(env)) process.env[k] = v;

const { fetchAllRows } = require(
  "/Users/axelsamuelson/.nvm/versions/node/v20.19.3/lib/node_modules/suganthan-gsc-mcp/dist/analytics.js",
);

const SITE = "sc-domain:pactwines.com";

async function periodTotals(startDate, endDate) {
  const rows = await fetchAllRows(
    { startDate, endDate, dimensions: ["date"] },
    SITE,
  );
  let clicks = 0;
  let impressions = 0;
  let posWeighted = 0;
  for (const r of rows) {
    clicks += r.clicks;
    impressions += r.impressions;
    posWeighted += r.position * r.impressions;
  }
  const days = rows.length || 1;
  return {
    startDate,
    endDate,
    days: rows.length,
    clicks,
    impressions,
    clicksPerDay: clicks / days,
    impressionsPerDay: impressions / days,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    position: impressions > 0 ? posWeighted / impressions : 0,
    daily: rows
      .map((r) => ({
        date: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        position: r.position,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function pctChange(cur, prev) {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

const BASELINE = {
  "hippie killer": { position: 15.5, impressions: 6 },
  "septentrion wein": { position: 8.4, impressions: 5 },
  "leno dolce sole": { position: 8.5, impressions: 4 },
  "la robina": { position: 9.7, impressions: 3 },
  "rött naturvin": { position: 18.0, impressions: 2 },
  "thomas chany": { position: 11.5, impressions: 2 },
  "orange naturvin": { position: 12.0, impressions: 1 },
  "sybil baldassarre": { position: 10.0, impressions: 1 },
  "best natural wines": { position: 30.0, impressions: 20 },
};

const GUIDE_PATHS = [
  "/guides/worlds-best-natural-wine-producers",
  "/guides/worlds-best-natural-wines",
  "/guides/pierre-overnoy",
  "/guides/thierry-allemand",
  "/guides/josko-gravner",
  "/guides/jean-francois-ganevat",
  "/guides/jean-foillard",
  "/guides/marcel-lapierre",
  "/guides/radikon",
  "/guides/jura-natural-wine",
  "/guides/beaujolais-natural-wine",
  "/guides/georgia-natural-wine",
  "/guides/worlds-best-orange-wines",
  "/guides/worlds-best-natural-champagne",
  "/guides",
];

async function main() {
  console.error("Fetching GSC data…");

  const [last7, prev7, pages28, queries28, queriesSinceAug1, comboPage] =
    await Promise.all([
      periodTotals("2026-08-19", "2026-08-25"),
      periodTotals("2026-08-12", "2026-08-18"),
      fetchAllRows(
        {
          startDate: "2026-07-28",
          endDate: "2026-08-24",
          dimensions: ["page"],
          dimensionFilterGroups: [
            {
              filters: [
                {
                  dimension: "page",
                  operator: "contains",
                  expression: "/guides/",
                },
              ],
            },
          ],
        },
        SITE,
      ),
      fetchAllRows(
        {
          startDate: "2026-07-28",
          endDate: "2026-08-24",
          dimensions: ["query"],
        },
        SITE,
      ),
      fetchAllRows(
        {
          startDate: "2026-08-01",
          endDate: "2026-08-24",
          dimensions: ["query"],
        },
        SITE,
      ),
      fetchAllRows(
        {
          startDate: "2026-07-28",
          endDate: "2026-08-24",
          dimensions: ["page"],
          dimensionFilterGroups: [
            {
              filters: [
                {
                  dimension: "page",
                  operator: "contains",
                  expression: "rod-och-orange-naturvin",
                },
              ],
            },
          ],
        },
        SITE,
      ),
    ]);

  const queryMap = new Map(
    queries28.map((r) => [r.keys[0].toLowerCase(), r]),
  );

  const pipelineDiff = Object.entries(BASELINE).map(([q, base]) => {
    const row = queryMap.get(q.toLowerCase());
    return {
      query: q,
      baseline: base,
      current: row
        ? {
            position: row.position,
            impressions: row.impressions,
            clicks: row.clicks,
          }
        : null,
      positionChange: row ? row.position - base.position : null,
      impressionsChange: row ? row.impressions - base.impressions : null,
    };
  });

  const guideRows = pages28
    .map((r) => ({
      page: r.keys[0],
      path: (() => {
        try {
          return new URL(r.keys[0]).pathname;
        } catch {
          return r.keys[0];
        }
      })(),
      impressions: r.impressions,
      clicks: r.clicks,
      position: r.position,
      ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);

  const knownGuidePaths = new Set(GUIDE_PATHS);
  const guidesWithData = new Set(
    guideRows.map((r) => r.path.replace(/\/$/, "")),
  );
  const guidesZeroImpressions = GUIDE_PATHS.filter(
    (p) => !guidesWithData.has(p) && !guideRows.some((r) => r.path.startsWith(p)),
  );

  const guideKeywords = [
    "natural wine",
    "orange wine",
    "jura",
    "beaujolais",
    "gravner",
    "overnoy",
    "allemand",
    "ganevat",
    "foillard",
    "lapierre",
    "radikon",
    "qvevri",
    "georgia",
    "champagne",
    "best natural",
    "top 100",
    "gang of four",
    "pact wines",
  ];

  const newSinceAug1 = queriesSinceAug1
    .filter((r) => r.impressions > 0)
    .map((r) => ({
      query: r.keys[0],
      impressions: r.impressions,
      clicks: r.clicks,
      position: r.position,
    }))
    .sort((a, b) => b.impressions - a.impressions);

  const guideRelatedNew = newSinceAug1.filter((r) =>
    guideKeywords.some((k) => r.query.toLowerCase().includes(k)),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    site: SITE,
    note: "GSC data may lag 2–3 days; end date capped at latest available.",
    section1: {
      last7: last7,
      prev7: prev7,
      wow: {
        impressionsPerDay: {
          last7: last7.impressionsPerDay,
          prev7: prev7.impressionsPerDay,
          changePct: pctChange(
            last7.impressionsPerDay,
            prev7.impressionsPerDay,
          ),
          changeAbs:
            last7.impressionsPerDay - prev7.impressionsPerDay,
        },
        clicksPerDay: {
          last7: last7.clicksPerDay,
          prev7: prev7.clicksPerDay,
          changePct: pctChange(last7.clicksPerDay, prev7.clicksPerDay),
        },
        ctr: {
          last7: last7.ctr,
          prev7: prev7.ctr,
          changePp: last7.ctr - prev7.ctr,
        },
        position: {
          last7: last7.position,
          prev7: prev7.position,
          change: last7.position - prev7.position,
        },
      },
      target100ImpPerDayByAug31: {
        target: 100,
        last7Actual: last7.impressionsPerDay,
        gap: 100 - last7.impressionsPerDay,
      },
    },
    section2: {
      period: { startDate: "2026-07-28", endDate: "2026-08-24" },
      guidePages: guideRows,
      guidesZeroImpressions,
      totalGuideImpressions: guideRows.reduce((s, r) => s + r.impressions, 0),
      totalGuideClicks: guideRows.reduce((s, r) => s + r.clicks, 0),
    },
    section3: {
      period: { startDate: "2026-07-28", endDate: "2026-08-24" },
      pipelineDiff,
    },
    section4: {
      periodSinceAug1: { startDate: "2026-08-01", endDate: "2026-08-24" },
      uniqueQueries28d: queries28.length,
      uniqueQueriesSinceAug1: queriesSinceAug1.length,
      guideRelatedNew,
      topNewSinceAug1: newSinceAug1.slice(0, 30),
    },
    section5: {
      page: "/vin/rod-och-orange-naturvin",
      rows: comboPage.map((r) => ({
        page: r.keys[0],
        impressions: r.impressions,
        clicks: r.clicks,
        position: r.position,
      })),
      stillGettingImpressions: comboPage.some((r) => r.impressions > 0),
    },
  };

  const outPath = new URL("../tmp/gsc-weekly-snapshot.json", import.meta.url);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
