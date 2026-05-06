import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { sendEmail, defaultResendFrom } from "@/lib/email";
import {
  isAdminEmailTemplateId,
  renderAdminEmail,
} from "@/lib/email/admin-email-preview";

function formatFromWithDisplayName(displayName: string): string {
  const base = defaultResendFrom();
  const m = base.match(/<([^>]+)>/);
  const addr = m?.[1]?.trim() ?? "noreply@pactwines.com";
  const safe = displayName.replace(/[<>]/g, "").trim() || "PACT";
  return `${safe} <${addr}>`;
}

/**
 * POST /api/admin/email/send-test
 * Body: { templateId: string, previewOnly?: boolean }
 * - previewOnly: returns { html, subject } without sending.
 * - else: sends the template to the logged-in admin email (sample data).
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
    const previewOnly = Boolean(body.previewOnly);

    if (!templateId || !isAdminEmailTemplateId(templateId)) {
      return NextResponse.json(
        { error: "Unknown or missing templateId" },
        { status: 400 },
      );
    }

    const rendered = await renderAdminEmail(templateId, {
      recipientEmail: admin.email,
      recipientDisplayName: "Anna Andersson (test)",
    });

    if (previewOnly) {
      return NextResponse.json({
        ok: true,
        html: rendered.html,
        subject: rendered.subject,
      });
    }

    if (!process.env.RESEND_API_KEY?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "RESEND_API_KEY is not configured",
        },
        { status: 503 },
      );
    }

    await sendEmail({
      to: admin.email,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
      from: formatFromWithDisplayName("PACT"),
    });

    return NextResponse.json({
      ok: true,
      sentTo: admin.email,
      subject: rendered.subject,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
