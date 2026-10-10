import { sendEmail } from "@/lib/email";
import { escapeHtmlBasic } from "@/lib/email/escape-html";
import { listAdminEmails } from "@/lib/operations-weekly-digest";
import type { SyncResult } from "@/lib/systembolaget/sync";

export type SyncAlertPayload = {
  result?: SyncResult;
  errorMessage?: string;
  durationMs?: number;
};

function linesForResult(payload: SyncAlertPayload): string[] {
  const { result, errorMessage, durationMs } = payload;
  if (!result) {
    return [
      `outcome: error`,
      `duration_ms: ${durationMs ?? "n/a"}`,
      `error: ${errorMessage ?? "unknown"}`,
    ];
  }
  if (result.ok) {
    return [
      `outcome: promoted`,
      `wines: ${result.wines}`,
      `old_count: ${result.oldCount}`,
      `new_count: ${result.newCount}`,
      `duration_ms: ${result.durationMs}`,
      `direct_fetched: ${result.directFetched.length}`,
    ];
  }
  if (result.reason === "timeout_guard") {
    return [
      `outcome: timeout`,
      `duration_ms: ${result.durationMs}`,
      `completed_filters: ${result.completedFilters.join(", ") || "(none)"}`,
      `remaining_filters: ${result.remainingFilters.join(", ") || "(none)"}`,
    ];
  }
  return [
    `outcome: guard_blocked`,
    `old_count: ${result.oldCount}`,
    `new_count: ${result.newCount}`,
    `duration_ms: ${result.durationMs}`,
    `direct_fetched: ${result.directFetched.length}`,
  ];
}

export type PartitionCapAlert = {
  largest: { key: string; apiDocCount: number };
  overCap: Array<{ key: string; apiDocCount: number }>;
  splitAttempted: boolean;
};

/**
 * Email every admin when an Ordervaror partition exceeds the 9,000-hit window.
 */
export async function alertSystembolagetPartitionCap(
  payload: PartitionCapAlert,
): Promise<{ sent: number; failed: number }> {
  const lines = [
    "An Ordervaror sync partition exceeded the 9,000-hit API window.",
    "The sync will price-split that partition when a cut can be found.",
    "",
    `largest: ${payload.largest.key} (${payload.largest.apiDocCount} hits)`,
    `over_cap (${payload.overCap.length}):`,
    ...payload.overCap.map((p) => `  • ${p.key}: ${p.apiDocCount}`),
    `split_attempted: ${payload.splitAttempted}`,
  ];
  return sendAdminAlert(
    "[PACT] Systembolaget Ordervaror partition over 9,000 hits",
    lines,
  );
}

/**
 * Email every admin profile when a scheduled Systembolaget sync fails.
 * Uses the same Resend path as other transactional mail.
 */
export async function alertSystembolagetSyncFailure(
  payload: SyncAlertPayload,
): Promise<{ sent: number; failed: number }> {
  const lines = linesForResult(payload);
  const subject = `[PACT] Systembolaget sync failed — ${
    payload.result && !payload.result.ok
      ? payload.result.reason
      : "error"
  }`;
  return sendAdminAlert(
    subject,
    ["Systembolaget assortment sync failed.", "", ...lines],
  );
}

async function sendAdminAlert(
  subject: string,
  lines: string[],
): Promise<{ sent: number; failed: number }> {
  const text = lines.join("\n");
  const html = `<pre>${escapeHtmlBasic(text)}</pre>`;
  const recipients = await listAdminEmails();
  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    try {
      await sendEmail({ to, subject, html, text });
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(
        "[systembolaget-sync] alert email failed",
        to,
        err instanceof Error ? err.message : err,
      );
    }
  }
  if (recipients.length === 0) {
    console.warn("[systembolaget-sync] no admin emails for alert");
  }
  return { sent, failed };
}
