import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail, defaultResendFrom } from "@/lib/email";
import {
  buildCampaignEmailHtml,
  buildCampaignEmailText,
} from "@/lib/email/campaign-template";

const TERMINAL_RESERVATION_STATUSES = new Set([
  "cancelled",
  "rejected",
  "declined",
]);

function formatFromWithDisplayName(displayName: string): string {
  const base = defaultResendFrom();
  const m = base.match(/<([^>]+)>/);
  const addr = m?.[1]?.trim() ?? "noreply@pactwines.com";
  const safe = displayName.replace(/[<>]/g, "").trim() || "PACT";
  return `${safe} <${addr}>`;
}

type RecipientGroup = "all" | "no_order" | "active_reservation" | "single";

function isRecipientGroup(s: string): s is RecipientGroup {
  return s === "all" || s === "no_order" || s === "active_reservation" || s === "single";
}

async function resolveRecipientEmails(
  group: RecipientGroup,
  singleEmail: string | undefined,
): Promise<string[]> {
  const sb = getSupabaseAdmin();

  if (group === "single") {
    const e = singleEmail?.trim().toLowerCase();
    if (!e || !e.includes("@")) {
      throw new Error("Ogiltig e-postadress");
    }
    return [e];
  }

  const { data: profiles, error: pErr } = await sb
    .from("profiles")
    .select("id, email")
    .not("email", "is", null);

  if (pErr) throw new Error(pErr.message);

  const rows = (profiles ?? []) as { id: string; email: string }[];
  const byEmail = rows.filter((r) => r.email?.trim());

  if (group === "all") {
    return [...new Set(byEmail.map((r) => r.email.trim().toLowerCase()))];
  }

  const { data: reservations, error: rErr } = await sb
    .from("order_reservations")
    .select("user_id, status");

  if (rErr) throw new Error(rErr.message);

  const resList = (reservations ?? []) as {
    user_id: string | null;
    status: string | null;
  }[];

  const userIdsWithAnyReservation = new Set(
    resList.map((r) => r.user_id).filter(Boolean) as string[],
  );

  if (group === "no_order") {
    const out = byEmail
      .filter((p) => !userIdsWithAnyReservation.has(p.id))
      .map((p) => p.email.trim().toLowerCase());
    return [...new Set(out)];
  }

  // active_reservation
  const activeUserIds = new Set(
    resList
      .filter(
        (r) =>
          r.user_id &&
          r.status &&
          !TERMINAL_RESERVATION_STATUSES.has(String(r.status)),
      )
      .map((r) => r.user_id as string),
  );

  const out = byEmail
    .filter((p) => activeUserIds.has(p.id))
    .map((p) => p.email.trim().toLowerCase());
  return [...new Set(out)];
}

/**
 * POST /api/admin/email/campaign
 * Body: { recipientGroup, singleEmail?, fromName, subject, message }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => ({}));
    const recipientGroup = body.recipientGroup as string;
    const singleEmail =
      typeof body.singleEmail === "string" ? body.singleEmail : undefined;
    const countOnly = Boolean(body.countOnly);
    const fromName =
      typeof body.fromName === "string" && body.fromName.trim()
        ? body.fromName.trim()
        : "PACT";
    const subject =
      typeof body.subject === "string" ? body.subject.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!isRecipientGroup(recipientGroup)) {
      return NextResponse.json(
        { error: "Ogiltig mottagargrupp" },
        { status: 400 },
      );
    }

    let recipients: string[];
    try {
      recipients = await resolveRecipientEmails(recipientGroup, singleEmail);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunde inte hämta mottagare";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Inga mottagare matchade valet", count: 0, sent: 0, failed: 0, errors: [] },
        { status: 400 },
      );
    }

    if (countOnly) {
      return NextResponse.json({ count: recipients.length });
    }

    if (!subject) {
      return NextResponse.json({ error: "Ämnesrad krävs" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Meddelande krävs" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured", sent: 0, failed: 0, errors: [] },
        { status: 503 },
      );
    }

    const html = buildCampaignEmailHtml({ subject, messagePlain: message });
    const text = buildCampaignEmailText({ subject, messagePlain: message });
    const from = formatFromWithDisplayName(fromName);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const to of recipients) {
      try {
        await sendEmail({ to, subject, html, text, from });
        sent += 1;
      } catch (err) {
        failed += 1;
        const msg =
          err instanceof Error ? err.message : "sendEmail failed";
        errors.push(`${to}: ${msg}`);
      }
    }

    return NextResponse.json({ sent, failed, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
