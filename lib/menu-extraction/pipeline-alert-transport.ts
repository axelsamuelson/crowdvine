import { AsyncLocalStorage } from "node:async_hooks";
import { sendEmail } from "@/lib/email";
import { escapeHtmlBasic } from "@/lib/email/escape-html";

export interface MenuPipelineAlertPayload {
  alertType: string;
  title: string;
  lines: string[];
  timestamp: string;
  source?: string;
}

export interface MenuPipelineAlertTransportConfig {
  email: string | null;
  webhook: string | null;
}

interface AlertBatchContext {
  queue: MenuPipelineAlertPayload[];
  warnedUnconfigured: boolean;
}

const batchContext = new AsyncLocalStorage<AlertBatchContext>();

const UNCONFIGURED_WARN =
  "[menu-pipeline-alert] Alerting unconfigured: set MENU_PIPELINE_ALERT_EMAIL and/or MENU_PIPELINE_ALERT_WEBHOOK_URL";

export function resolveMenuPipelineAlertTransport(
  env: NodeJS.ProcessEnv = process.env,
): MenuPipelineAlertTransportConfig {
  return {
    email: env.MENU_PIPELINE_ALERT_EMAIL?.trim() || null,
    webhook: env.MENU_PIPELINE_ALERT_WEBHOOK_URL?.trim() || null,
  };
}

export function alertTypeFromTitle(title: string): string {
  const match = title.match(/^\[([^\]]+)\]/);
  return match?.[1]?.trim() ?? "pipeline";
}

export function oneLineSummary(title: string, lines: string[]): string {
  const stripped = title.replace(/^\[[^\]]+\]\s*/, "").trim();
  if (stripped) return stripped;
  return lines[0]?.trim() ?? "Menu pipeline alert";
}

function formatSlackText(title: string, lines: string[]): string {
  return [`*${title}*`, ...lines.map((line) => `• ${line}`)].join("\n");
}

function formatSlackBatch(alerts: MenuPipelineAlertPayload[]): string {
  return alerts
    .map(
      (alert, index) =>
        `*Alert ${index + 1}/${alerts.length}: ${alert.title}*\n${alert.lines.map((line) => `• ${line}`).join("\n")}`,
    )
    .join("\n\n");
}

export function buildEmailSubject(alerts: MenuPipelineAlertPayload[]): string {
  if (alerts.length === 1) {
    const alert = alerts[0]!;
    return `[CrowdVine pipeline] ${alert.alertType}: ${oneLineSummary(alert.title, alert.lines)}`;
  }
  return `[CrowdVine pipeline] batch: ${alerts.length} alerts`;
}

export function buildEmailBody(alerts: MenuPipelineAlertPayload[]): string {
  return alerts
    .map((alert, index) => {
      const details = {
        alert_type: alert.alertType,
        timestamp: alert.timestamp,
        source: alert.source ?? alert.alertType,
        title: alert.title,
        details: alert.lines,
      };
      const header =
        alerts.length === 1
          ? "Menu pipeline alert"
          : `Menu pipeline alert ${index + 1} of ${alerts.length}`;
      return `${header}\n${JSON.stringify(details, null, 2)}`;
    })
    .join("\n\n---\n\n");
}

async function postWebhook(url: string, text: string): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

/**
 * Deliver queued alerts via configured transports.
 * Email: one message per batch. Webhook: one post per batch.
 * Both fire when both env vars are set.
 */
export async function deliverMenuPipelineAlerts(
  alerts: MenuPipelineAlertPayload[],
  options: {
    transport?: MenuPipelineAlertTransportConfig;
    ctx?: AlertBatchContext | null;
    sendEmailFn?: typeof sendEmail;
    fetchFn?: typeof fetch;
  } = {},
): Promise<void> {
  if (alerts.length === 0) return;

  const transport = options.transport ?? resolveMenuPipelineAlertTransport();
  const sendEmailImpl = options.sendEmailFn ?? sendEmail;
  const fetchImpl = options.fetchFn ?? fetch;

  if (!transport.email && !transport.webhook) {
    const ctx = options.ctx ?? batchContext.getStore() ?? null;
    if (!ctx?.warnedUnconfigured) {
      console.warn(UNCONFIGURED_WARN);
      if (ctx) ctx.warnedUnconfigured = true;
    }
    return;
  }

  if (transport.email) {
    try {
      const body = buildEmailBody(alerts);
      await sendEmailImpl({
        to: transport.email,
        subject: buildEmailSubject(alerts),
        html: `<pre>${escapeHtmlBasic(body)}</pre>`,
        text: body,
      });
    } catch (err) {
      console.warn(
        "[menu-pipeline-alert] Email failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (transport.webhook) {
    try {
      const text =
        alerts.length === 1
          ? formatSlackText(alerts[0]!.title, alerts[0]!.lines)
          : formatSlackBatch(alerts);
      await fetchImpl(transport.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (err) {
      console.warn(
        "[menu-pipeline-alert] Webhook failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}

export function buildMenuPipelineAlertPayload(
  title: string,
  lines: string[],
): MenuPipelineAlertPayload {
  const alertType = alertTypeFromTitle(title);
  return {
    alertType,
    title,
    lines,
    timestamp: new Date().toISOString(),
    source: alertType,
  };
}

/**
 * Queue an alert for batched delivery, or deliver immediately outside a batch scope.
 */
export async function sendMenuPipelineAlert(
  title: string,
  lines: string[],
): Promise<void> {
  const payload = buildMenuPipelineAlertPayload(title, lines);
  const ctx = batchContext.getStore();
  if (ctx) {
    ctx.queue.push(payload);
    return;
  }
  await deliverMenuPipelineAlerts([payload], { ctx });
}

/**
 * Run a cron/handler scope where all pipeline alerts are batched into one email/webhook post.
 */
export async function withMenuPipelineAlertBatch<T>(
  fn: () => Promise<T>,
): Promise<T> {
  return batchContext.run({ queue: [], warnedUnconfigured: false }, async () => {
    try {
      return await fn();
    } finally {
      const ctx = batchContext.getStore();
      if (ctx && ctx.queue.length > 0) {
        await deliverMenuPipelineAlerts(ctx.queue, { ctx });
      }
    }
  });
}
