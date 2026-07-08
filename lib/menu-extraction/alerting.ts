import type { MenuPipelineHealth } from "./health";
import { sendMenuPipelineAlert } from "./pipeline-alert-transport";

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
