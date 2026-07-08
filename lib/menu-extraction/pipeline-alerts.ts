/**
 * Domain-specific menu pipeline alerts (dedup + typed helpers).
 * Transport: email via Resend (MENU_PIPELINE_ALERT_EMAIL) and/or Slack webhook.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendMenuPipelineAlert } from "./pipeline-alert-transport";

const DEDUP_TABLE = "menu_pipeline_alert_dedup";

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Send at most one alert per calendar day (UTC) for a given key.
 */
export async function sendDedupedDailyAlert(
  alertKey: string,
  title: string,
  lines: string[],
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  const fullKey = `${alertKey}:${utcDayKey()}`;
  const now = new Date().toISOString();

  const { data: existing } = await sb
    .from(DEDUP_TABLE)
    .select("alert_key")
    .eq("alert_key", fullKey)
    .maybeSingle();

  if (existing) return false;

  await sendMenuPipelineAlert(title, lines);

  await sb.from(DEDUP_TABLE).upsert(
    { alert_key: fullKey, last_sent_at: now },
    { onConflict: "alert_key" },
  );

  return true;
}

export async function alertZeroSlugDiscovery(city: string): Promise<void> {
  await sendMenuPipelineAlert(
    "[crawl-menus] Slug discovery returnerade 0 träffar",
    [
      `Sitemap/HTML discovery för "${city}" gav inga slugs.`,
      "Kontrollera Browserless-kvot, Cloudflare och Starwinelist sitemap-struktur.",
    ],
  );
}

export async function alertBrowserlessLimit(
  status: 401 | 429,
  detail: string,
  cronJob?: string,
): Promise<void> {
  const prefix = cronJob ? `[${cronJob}] ` : "";
  const title =
    status === 401
      ? `${prefix}Browserless plan/kvot (401)`
      : `${prefix}Browserless rate limit (429)`;

  const lines =
    status === 401
      ? [
          "Browserless returnerade 401 – troligen slut på units/free plan.",
          detail,
          "Crawl pausas tills API-nyckel/plan är åtgärdad.",
        ]
      : [
          "Browserless returnerade 429 – för många förfrågningar.",
          detail,
        ];

  if (status === 401) {
    await sendDedupedDailyAlert("browserless_401", title, lines);
    return;
  }

  await sendMenuPipelineAlert(title, lines);
}

export async function alertDetectMenuUpdatesFailure(
  reason: string,
): Promise<void> {
  await sendMenuPipelineAlert(
    "[detect-menu-updates] Cron misslyckades",
    [reason],
  );
}

export async function alertDetectMenuUpdatesZeroWinePlaceUrls(): Promise<void> {
  await sendDedupedDailyAlert(
    "detect_menu_updates_zero_wine_place",
    "[detect-menu-updates] Inga /wine-place/ URL:er i sitemap",
    [
      "Sitemap parsades men inga wine-place-slugs hittades.",
      "Kontrollera sitemap-struktur eller fallback till widget-feed.",
    ],
  );
}

export async function alertDetectMenuUpdatesNoLastmod(): Promise<void> {
  await sendDedupedDailyAlert(
    "detect_menu_updates_no_lastmod",
    "[detect-menu-updates] Sitemap saknar lastmod",
    [
      "Ingen <lastmod> på wine-place-poster i sitemap.",
      "Byter till widget-feed-strategi för priority boost.",
    ],
  );
}

export async function alertDetectMenuUpdatesDegenerateLastmod(
  sharePct: number,
  modeDate: string,
): Promise<void> {
  await sendDedupedDailyAlert(
    "detect_menu_updates_degenerate_lastmod",
    `[detect-menu-updates] Sitemap lastmod degenerate: ${sharePct}% share on date ${modeDate}`,
    [
      `${sharePct}% of wine-place sitemap entries share lastmod date ${modeDate}.`,
      "Sitemap diffing unreliable this run — using widget-feed lane.",
    ],
  );
}

export async function alertDetectMenuUpdatesZeroEntries(): Promise<void> {
  await sendDedupedDailyAlert(
    "detect_menu_updates_zero_entries",
    "[detect-menu-updates] Inga widget-poster parsade",
    [
      'Kunde inte hitta "Newest Wine List Updates" på /stockholm.',
      "Starwinelist kan ha ändrat layout – kontrollera HTML.",
    ],
  );
}

export async function alertDetectMenuUpdatesUnmatched(
  names: string[],
): Promise<void> {
  if (names.length === 0) return;
  await sendMenuPipelineAlert(
    "[detect-menu-updates] Omatchade restaurangnamn i widget",
    [
      `${names.length} namn kunde inte matchas mot starwinelist_sources.name:`,
      ...names.slice(0, 10).map((n) => `• ${n}`),
      ...(names.length > 10 ? [`… och ${names.length - 10} till`] : []),
    ],
  );
}
