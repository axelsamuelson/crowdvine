import type { MenuPipelineHealth } from "./health";

const DEFAULT_THRESHOLDS = {
  maxPendingExtraction: 20,
  maxCrawlFailedOrPartial: 10,
  maxExtractionFailedRecent: 15,
  maxStuckProcessing: 3,
};

function formatSlackText(title: string, lines: string[]): string {
  return [`*${title}*`, ...lines.map((l) => `• ${l}`)].join("\n");
}

/**
 * POST JSON to MENU_PIPELINE_ALERT_WEBHOOK_URL (Slack incoming webhook or compatible).
 * No-op when env var is unset.
 */
export async function sendMenuPipelineAlert(
  title: string,
  lines: string[],
): Promise<void> {
  const url = process.env.MENU_PIPELINE_ALERT_WEBHOOK_URL?.trim();
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: formatSlackText(title, lines) }),
    });
  } catch (err) {
    console.warn(
      "[menu-pipeline-alert] Webhook failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function evaluateMenuPipelineAlerts(
  health: MenuPipelineHealth,
  context?: { cronJob?: string },
): Promise<string[]> {
  const t = DEFAULT_THRESHOLDS;
  const triggered: string[] = [];

  if (health.extraction.pending > t.maxPendingExtraction) {
    triggered.push(
      `${health.extraction.pending} dokument väntar på extraktion (tröskel ${t.maxPendingExtraction})`,
    );
  }
  const crawlProblems =
    health.sources.failed + health.sources.partial + health.sources.pending;
  if (crawlProblems > t.maxCrawlFailedOrPartial) {
    triggered.push(
      `${crawlProblems} crawl-källor behöver åtgärd (failed/partial/pending, tröskel ${t.maxCrawlFailedOrPartial})`,
    );
  }
  if (health.extraction.failed_recent > t.maxExtractionFailedRecent) {
    triggered.push(
      `${health.extraction.failed_recent} misslyckade extraktioner senaste 7 dagarna (tröskel ${t.maxExtractionFailedRecent})`,
    );
  }
  if (health.extraction.stuck_processing > t.maxStuckProcessing) {
    triggered.push(
      `${health.extraction.stuck_processing} dokument fastnat i processing >2h (tröskel ${t.maxStuckProcessing})`,
    );
  }

  if (triggered.length > 0) {
    const prefix = context?.cronJob ? `[${context.cronJob}] ` : "";
    await sendMenuPipelineAlert(
      `${prefix}Meny-pipeline behöver uppmärksamhet`,
      triggered,
    );
  }

  return triggered;
}
