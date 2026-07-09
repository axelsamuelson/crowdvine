/**
 * Domain-specific menu pipeline alerts (dedup + typed helpers).
 * Transport: email via Resend (MENU_PIPELINE_ALERT_EMAIL) and/or Slack webhook.
 *
 * Chronic alerts fire once per stable error until the fingerprint changes or
 * the underlying condition clears. Transient alerts (e.g. 429) may repeat
 * after MENU_PIPELINE_ALERT_TRANSIENT_COOLDOWN_HOURS (default 6h).
 */
import {
  clearAlertSuppression,
  sendManagedPipelineAlert,
} from "./pipeline-alert-suppression";

/** @deprecated Use sendManagedPipelineAlert with an explicit policy. */
export async function sendDedupedDailyAlert(
  alertKey: string,
  title: string,
  lines: string[],
): Promise<boolean> {
  return sendManagedPipelineAlert(alertKey, title, lines, "chronic");
}

export async function alertZeroSlugDiscovery(city: string): Promise<void> {
  await sendManagedPipelineAlert(
    "crawl_zero_slug_discovery",
    "[crawl-menus] Slug discovery returnerade 0 träffar",
    [
      `Sitemap/HTML discovery för "${city}" gav inga slugs.`,
      "Kontrollera Browserless-kvot, Cloudflare och Starwinelist sitemap-struktur.",
    ],
    "chronic",
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

  const alertKey = status === 401 ? "browserless_401" : "browserless_429";
  const policy = status === 401 ? "chronic" : "transient";
  await sendManagedPipelineAlert(alertKey, title, lines, policy);
}

export async function alertDetectMenuUpdatesFailure(
  reason: string,
): Promise<void> {
  await sendManagedPipelineAlert(
    "detect_menu_updates_failure",
    "[detect-menu-updates] Cron misslyckades",
    [reason],
    "chronic",
  );
}

export async function alertDetectMenuUpdatesZeroWinePlaceUrls(): Promise<void> {
  await sendManagedPipelineAlert(
    "detect_menu_updates_zero_wine_place",
    "[detect-menu-updates] Inga /wine-place/ URL:er i sitemap",
    [
      "Sitemap parsades men inga wine-place-slugs hittades.",
      "Kontrollera sitemap-struktur eller fallback till widget-feed.",
    ],
    "chronic",
  );
}

export async function alertDetectMenuUpdatesNoLastmod(): Promise<void> {
  await sendManagedPipelineAlert(
    "detect_menu_updates_no_lastmod",
    "[detect-menu-updates] Sitemap saknar lastmod",
    [
      "Ingen <lastmod> på wine-place-poster i sitemap.",
      "Byter till widget-feed-strategi för priority boost.",
    ],
    "chronic",
  );
}

export async function alertDetectMenuUpdatesDegenerateLastmod(
  sharePct: number,
  modeDate: string,
): Promise<void> {
  await sendManagedPipelineAlert(
    "detect_menu_updates_degenerate_lastmod",
    `[detect-menu-updates] Sitemap lastmod degenerate: ${sharePct}% share on date ${modeDate}`,
    [
      `${sharePct}% of wine-place sitemap entries share lastmod date ${modeDate}.`,
      "Sitemap diffing unreliable this run — using widget-feed lane.",
    ],
    "chronic",
  );
}

export async function alertDetectMenuUpdatesZeroEntries(): Promise<void> {
  await sendManagedPipelineAlert(
    "detect_menu_updates_zero_entries",
    "[detect-menu-updates] Inga widget-poster parsade",
    [
      'Kunde inte hitta "Newest Wine List Updates" på /stockholm.',
      "Starwinelist kan ha ändrat layout – kontrollera HTML.",
    ],
    "chronic",
  );
}

export async function alertDetectMenuUpdatesUnmatched(
  names: string[],
): Promise<void> {
  if (names.length === 0) return;
  await sendManagedPipelineAlert(
    "detect_menu_updates_unmatched_names",
    "[detect-menu-updates] Omatchade restaurangnamn i widget",
    [
      `${names.length} namn kunde inte matchas mot starwinelist_sources.name:`,
      ...names.slice(0, 10).map((n) => `• ${n}`),
      ...(names.length > 10 ? [`… och ${names.length - 10} till`] : []),
    ],
    "chronic",
  );
}

export { clearAlertSuppression } from "./pipeline-alert-suppression";
