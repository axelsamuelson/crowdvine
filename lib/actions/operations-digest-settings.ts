"use server"

import { revalidatePath } from "next/cache"
import { getCurrentAdmin } from "@/lib/admin-auth-server"
import { sendGridService } from "@/lib/sendgrid-service"
import {
  buildOperationsDigestPayload,
  digestLookbackSince,
  digestPayloadToHtml,
  digestPayloadToText,
  getWeeklyDigestSettings,
  setWeeklyDigestEnabled,
} from "@/lib/operations-weekly-digest"

export async function updateOperationsWeeklyDigestEnabled(
  enabled: boolean
): Promise<void> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error("Unauthorized")
  await setWeeklyDigestEnabled(enabled)
  revalidatePath("/admin/operations/objectives/settings")
}

export async function sendOperationsWeeklyDigestTestEmail(): Promise<{
  ok: boolean
  error?: string
}> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error("Unauthorized")
  if (!admin.email) {
    return { ok: false, error: "Din admin-profil saknar e-postadress." }
  }

  try {
    const payload = await buildOperationsDigestPayload(digestLookbackSince())
    const html = digestPayloadToHtml(payload)
    const text = digestPayloadToText(payload)
    const subject = `[Test] Operations weekly summary — ${payload.periodLabel}`

    const sent = await sendGridService.sendEmail({
      to: admin.email,
      subject,
      html,
      text,
      emailKind: "operations_digest",
    })

    if (!sent) {
      return {
        ok: false,
        error: "SendGrid returnerade false (kolla API-nyckel och avsändare).",
      }
    }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Okänt fel",
    }
  }
}

export { getWeeklyDigestSettings }
