import type { MenuPipelineHealth } from "./health";
import {
  clearAlertSuppression,
  sendManagedPipelineAlert,
} from "./pipeline-alert-suppression";

export {
  deliverMenuPipelineAlerts,
  resolveMenuPipelineAlertTransport,
  sendMenuPipelineAlert,
  withMenuPipelineAlertBatch,
} from "./pipeline-alert-transport";

const DEFAULT_THRESHOLDS = {
  maxPendingExtraction: 20,
  maxCrawlFailedOrPartial: 10,
  maxExtractionFailedRecent: 15,
  maxStuckProcessing: 3,
};

const HEALTH_ALERT_KEYS = {
  extractionPending: "health_extraction_pending",
  crawlProblems: "health_crawl_problems",
  extractionFailedRecent: "health_extraction_failed_recent",
  stuckProcessing: "health_stuck_processing",
} as const;

export async function evaluateMenuPipelineAlerts(
  health: MenuPipelineHealth,
  context?: { cronJob?: string },
): Promise<string[]> {
  const t = DEFAULT_THRESHOLDS;
  const prefix = context?.cronJob ? `[${context.cronJob}] ` : "";
  const triggered: string[] = [];

  const checks: Array<{
    key: (typeof HEALTH_ALERT_KEYS)[keyof typeof HEALTH_ALERT_KEYS];
    active: boolean;
    line: string;
  }> = [
    {
      key: HEALTH_ALERT_KEYS.extractionPending,
      active: health.extraction.pending > t.maxPendingExtraction,
      line: `${health.extraction.pending} dokument väntar på extraktion (tröskel ${t.maxPendingExtraction})`,
    },
    {
      key: HEALTH_ALERT_KEYS.crawlProblems,
      active:
        health.sources.failed + health.sources.partial + health.sources.pending >
        t.maxCrawlFailedOrPartial,
      line: `${health.sources.failed + health.sources.partial + health.sources.pending} crawl-källor behöver åtgärd (failed/partial/pending, tröskel ${t.maxCrawlFailedOrPartial})`,
    },
    {
      key: HEALTH_ALERT_KEYS.extractionFailedRecent,
      active: health.extraction.failed_recent > t.maxExtractionFailedRecent,
      line: `${health.extraction.failed_recent} misslyckade extraktioner senaste 7 dagarna (tröskel ${t.maxExtractionFailedRecent})`,
    },
    {
      key: HEALTH_ALERT_KEYS.stuckProcessing,
      active: health.extraction.stuck_processing > t.maxStuckProcessing,
      line: `${health.extraction.stuck_processing} dokument fastnat i processing >2h (tröskel ${t.maxStuckProcessing})`,
    },
  ];

  for (const check of checks) {
    if (check.active) {
      triggered.push(check.line);
      await sendManagedPipelineAlert(
        check.key,
        `${prefix}Meny-pipeline behöver uppmärksamhet`,
        [check.line],
        "chronic",
      );
    } else {
      await clearAlertSuppression(check.key);
    }
  }

  return triggered;
}
