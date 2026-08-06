import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type EmailSendType =
  | "order_confirmation"
  | "payment_confirmed"
  | "payment_failed"
  | "payment_cancelled"
  | "payment_authentication_required"
  | "payment_ready";

export type ClaimEmailSendResult =
  | { status: "claimed" }
  | { status: "already_sent" }
  | { status: "error"; message: string };

/**
 * Insert a claim row BEFORE sending. Unique (email_type, reservation_id)
 * is the idempotency guarantee — conflict means skip the send.
 */
export async function claimEmailSend(opts: {
  emailType: EmailSendType | string;
  recipient: string;
  reservationId: string;
}): Promise<ClaimEmailSendResult> {
  const recipient = opts.recipient.trim();
  const reservationId = opts.reservationId.trim();
  if (!recipient || !reservationId) {
    return { status: "error", message: "recipient and reservationId required" };
  }

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("email_sends").insert({
    email_type: opts.emailType,
    recipient,
    reservation_id: reservationId,
  });

  if (!error) {
    return { status: "claimed" };
  }

  // 23505 = unique_violation
  const code = (error as { code?: string }).code;
  if (code === "23505") {
    console.warn(
      `[email_sends] skip ${opts.emailType} for reservation ${reservationId} — already claimed`,
      { recipient },
    );
    return { status: "already_sent" };
  }

  console.error("[email_sends] claim failed:", error);
  return {
    status: "error",
    message: error.message || "claim failed",
  };
}

export type SendOnceResult = "sent" | "skipped" | "failed";

/**
 * Claim then send. If claim says already_sent → skip.
 * If send throws/returns false after claim, log loudly (no auto-retry by design).
 */
export async function sendTransactionalEmailOnce(opts: {
  emailType: EmailSendType | string;
  recipient: string;
  reservationId: string;
  /** Return true when the provider accepted the message. */
  send: () => Promise<boolean>;
}): Promise<SendOnceResult> {
  const claim = await claimEmailSend({
    emailType: opts.emailType,
    recipient: opts.recipient,
    reservationId: opts.reservationId,
  });

  if (claim.status === "already_sent") {
    return "skipped";
  }
  if (claim.status === "error") {
    console.error(
      `[email_sends] refusing to send ${opts.emailType} — claim error:`,
      claim.message,
    );
    return "failed";
  }

  try {
    const ok = await opts.send();
    if (!ok) {
      console.error(
        `[email_sends] ${opts.emailType} claimed for ${opts.reservationId} but provider returned failure — will not auto-retry`,
      );
      return "failed";
    }
    console.log(
      `[email_sends] ${opts.emailType} sent for reservation ${opts.reservationId}`,
    );
    return "sent";
  } catch (e) {
    console.error(
      `[email_sends] ${opts.emailType} claimed for ${opts.reservationId} but send threw — will not auto-retry:`,
      e,
    );
    return "failed";
  }
}
