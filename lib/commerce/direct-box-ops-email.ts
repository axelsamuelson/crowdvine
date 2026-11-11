/**
 * Internal ops handoff email when a direct_box order is paid.
 * Gated by DIRECT_BOX_OPS_EMAIL_ENABLED (default OFF).
 * Never mentions carrier brand to customers — this is admin-only.
 */

import { sendEmail } from "@/lib/email";
import { sendTransactionalEmailOnce } from "@/lib/email/claim-email-send";
import { escapeHtmlBasic } from "@/lib/email/escape-html";

export function isDirectBoxOpsEmailEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    String(env.DIRECT_BOX_OPS_EMAIL_ENABLED ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

/** Admin inbox — prefer DIRECT_BOX_OPS_EMAIL, else ADMIN_EMAIL / OPERATIONS_EMAIL. */
export function resolveDirectBoxOpsEmailAddress(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | null {
  const candidates = [
    env.DIRECT_BOX_OPS_EMAIL,
    env.ADMIN_EMAIL,
    env.OPERATIONS_EMAIL,
    env.OPS_EMAIL,
  ];
  for (const c of candidates) {
    const v = String(c ?? "").trim();
    if (v.includes("@")) return v;
  }
  return null;
}

export async function sendDirectBoxOpsHandoffEmail(opts: {
  reservationId: string;
  bottles: number;
  totalSek?: number | null;
  customerEmail?: string | null;
  customerName?: string | null;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<"sent" | "skipped" | "failed"> {
  const env = opts.env ?? process.env;
  if (!isDirectBoxOpsEmailEnabled(env)) return "skipped";
  const to = resolveDirectBoxOpsEmailAddress(env);
  if (!to) return "skipped";

  const boxes = Math.floor(Math.max(0, opts.bottles) / 6);
  const subject = `[PACT] Direct box — pending handoff ${opts.reservationId.slice(0, 8)}`;
  const text = `Direct box order paid — manual handoff required.

Reservation: ${opts.reservationId}
Status: pending_manual_handoff
Bottles: ${opts.bottles} (${boxes} box(es))
Total: ${opts.totalSek != null ? `${opts.totalSek} SEK` : "n/a"}
Customer: ${opts.customerName || "—"} <${opts.customerEmail || "—"}>

Open admin B2C orders and fulfill as direct home delivery.
`;
  const html = `<p><strong>Direct box order paid — manual handoff</strong></p>
<ul>
<li>Reservation: <code>${escapeHtmlBasic(opts.reservationId)}</code></li>
<li>Status: <code>pending_manual_handoff</code></li>
<li>Bottles: ${opts.bottles} (${boxes} box(es))</li>
<li>Total: ${opts.totalSek != null ? `${escapeHtmlBasic(String(opts.totalSek))} SEK` : "n/a"}</li>
<li>Customer: ${escapeHtmlBasic(opts.customerName || "—")} &lt;${escapeHtmlBasic(opts.customerEmail || "—")}&gt;</li>
</ul>
<p>Open admin B2C orders and fulfill as direct home delivery.</p>`;

  try {
    const result = await sendTransactionalEmailOnce({
      emailType: `direct_box_ops_handoff`,
      recipient: to,
      reservationId: opts.reservationId,
      send: async () => {
        await sendEmail({ to, subject, html, text });
        return true;
      },
    });
    return result === "sent" ? "sent" : "skipped";
  } catch (e) {
    console.error("[direct-box-ops-email]", e);
    return "failed";
  }
}
