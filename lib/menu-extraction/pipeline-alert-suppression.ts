/**
 * Alert suppression: chronic errors notify once, then weekly while unchanged;
 * transient errors may repeat after a cooldown (self-healing conditions).
 */

import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendMenuPipelineAlert } from "./pipeline-alert-transport";

const STATE_TABLE = "menu_pipeline_alert_state";

export type AlertSuppressionPolicy = "chronic" | "transient" | "daily";

export interface AlertStateRow {
  alert_key: string;
  fingerprint: string;
  last_sent_at: string;
  send_count: number;
}

const DEFAULT_TRANSIENT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const DEFAULT_CHRONIC_REMINDER_MS = 7 * 24 * 60 * 60 * 1000;

/** Normalize volatile numbers/dates so "same" operational errors share a fingerprint. */
export function normalizeForFingerprint(text: string): string {
  return text
    .replace(/\d{4}-\d{2}-\d{2}(?:T[\d:.+\-Z]+)?/g, "<date>")
    .replace(/\d+(?:[.,]\d+)?%?/g, "<n>")
    .trim()
    .toLowerCase();
}

export function buildAlertFingerprint(
  alertKey: string,
  lines: string[],
): string {
  const payload = [alertKey, ...lines.map(normalizeForFingerprint)].join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

export function getTransientAlertCooldownMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.MENU_PIPELINE_ALERT_TRANSIENT_COOLDOWN_HOURS?.trim();
  if (!raw) return DEFAULT_TRANSIENT_COOLDOWN_MS;
  const hours = Number.parseFloat(raw);
  if (Number.isNaN(hours) || hours <= 0) return DEFAULT_TRANSIENT_COOLDOWN_MS;
  return hours * 60 * 60 * 1000;
}

export function getChronicAlertReminderMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.MENU_PIPELINE_ALERT_CHRONIC_REMINDER_DAYS?.trim();
  if (!raw) return DEFAULT_CHRONIC_REMINDER_MS;
  const days = Number.parseFloat(raw);
  if (Number.isNaN(days) || days <= 0) return DEFAULT_CHRONIC_REMINDER_MS;
  return days * 24 * 60 * 60 * 1000;
}

function elapsedMsSince(iso: string, now: Date): number {
  return now.getTime() - new Date(iso).getTime();
}

export function isChronicWeeklyReminder(
  state: AlertStateRow,
  fingerprint: string,
  now: Date = new Date(),
  chronicReminderMs: number = getChronicAlertReminderMs(),
): boolean {
  return (
    state.fingerprint === fingerprint &&
    elapsedMsSince(state.last_sent_at, now) >= chronicReminderMs
  );
}

export function shouldSendManagedAlert(
  state: AlertStateRow | null,
  fingerprint: string,
  policy: AlertSuppressionPolicy,
  now: Date = new Date(),
  transientCooldownMs: number = getTransientAlertCooldownMs(),
  chronicReminderMs: number = getChronicAlertReminderMs(),
): boolean {
  if (!state) return true;

  if (policy === "daily") {
    const sentDay = state.last_sent_at.slice(0, 10);
    return sentDay !== now.toISOString().slice(0, 10);
  }

  if (state.fingerprint !== fingerprint) {
    return true;
  }

  if (policy === "transient") {
    return elapsedMsSince(state.last_sent_at, now) >= transientCooldownMs;
  }

  // chronic: suppress repeats, but send a weekly reminder while the issue persists
  return elapsedMsSince(state.last_sent_at, now) >= chronicReminderMs;
}

export async function getAlertState(alertKey: string): Promise<AlertStateRow | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from(STATE_TABLE)
    .select("alert_key, fingerprint, last_sent_at, send_count")
    .eq("alert_key", alertKey)
    .maybeSingle();
  if (error) {
    throw new Error(`getAlertState: ${error.message}`);
  }
  return (data as AlertStateRow | null) ?? null;
}

export async function recordAlertSent(
  alertKey: string,
  fingerprint: string,
): Promise<void> {
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const existing = await getAlertState(alertKey);

  await sb.from(STATE_TABLE).upsert(
    {
      alert_key: alertKey,
      fingerprint,
      last_sent_at: now,
      send_count:
        existing?.fingerprint === fingerprint
          ? (existing.send_count ?? 0) + 1
          : 1,
    },
    { onConflict: "alert_key" },
  );
}

export async function clearAlertSuppression(alertKey: string): Promise<void> {
  const sb = getSupabaseAdmin();
  await sb.from(STATE_TABLE).delete().eq("alert_key", alertKey);
}

/**
 * Send a pipeline alert respecting suppression policy.
 * @returns true if the alert was queued/sent, false if suppressed.
 */
export async function sendManagedPipelineAlert(
  alertKey: string,
  title: string,
  lines: string[],
  policy: AlertSuppressionPolicy = "chronic",
): Promise<boolean> {
  const fingerprint = buildAlertFingerprint(alertKey, lines);
  const state = await getAlertState(alertKey);

  if (!shouldSendManagedAlert(state, fingerprint, policy)) {
    console.warn(
      "[menu-pipeline-alert] Suppressed repeat",
      { alertKey, policy, fingerprint: fingerprint.slice(0, 8) },
    );
    return false;
  }

  const isWeeklyReminder =
    policy === "chronic" &&
    state != null &&
    isChronicWeeklyReminder(state, fingerprint);

  const deliveryLines = isWeeklyReminder
    ? [
        `Veckopåminnelse: felet är fortfarande aktivt (senast rapporterat ${state.last_sent_at.slice(0, 10)}).`,
        ...lines,
      ]
    : lines;

  await sendMenuPipelineAlert(title, deliveryLines);
  await recordAlertSent(alertKey, fingerprint);
  return true;
}
