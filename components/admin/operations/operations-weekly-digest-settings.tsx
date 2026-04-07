"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  sendOperationsWeeklyDigestTestEmail,
  updateOperationsWeeklyDigestEnabled,
} from "@/lib/actions/operations-digest-settings"

type Props = {
  initialEnabled: boolean
  lastSentAt: string | null
}

export function OperationsWeeklyDigestSettings({
  initialEnabled,
  lastSentAt,
}: Props) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [pending, startTransition] = useTransition()
  const [testPending, startTest] = useTransition()

  useEffect(() => {
    setEnabled(initialEnabled)
  }, [initialEnabled])

  function persist(next: boolean) {
    const prev = enabled
    startTransition(async () => {
      try {
        await updateOperationsWeeklyDigestEnabled(next)
        toast.success(
          next
            ? "Veckoutskick aktiverat"
            : "Veckoutskick avstängt"
        )
        router.refresh()
      } catch {
        toast.error("Kunde inte spara inställningen")
        setEnabled(prev)
      }
    })
  }

  function sendTest() {
    startTest(async () => {
      const r = await sendOperationsWeeklyDigestTestEmail()
      if (r.ok) {
        toast.success("Testmail skickat till din adress")
      } else {
        toast.error(r.error ?? "Kunde inte skicka testmail")
      }
    })
  }

  const lastSentLabel = lastSentAt
    ? new Date(lastSentAt).toLocaleString("sv-SE", {
        timeZone: "Europe/Stockholm",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-gray-100 p-2 dark:bg-zinc-800">
          <Mail className="h-5 w-5 text-gray-800 dark:text-zinc-200" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
              Veckoutskick — Operations
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-700 dark:text-zinc-300">
              När detta är på skickas varje <strong>söndag kl. 12</strong>{" "}
              (Europa/Stockholm) ett e-postmeddelande till alla konton med rollen
              admin. Mailet sammanfattar nya tasks, projekt, kommentarer och
              task-aktivitet under de senaste sju dagarna.               Använder samma SendGrid-variabler som övriga utskick i projektet (
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">
                SENDGRID_API_KEY
              </code>
              ,{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">
                SENDGRID_FROM_EMAIL
              </code>
              ,{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">
                SENDGRID_FROM_NAME
              </code>
              ). Schemalagd körning via Vercel Cron kräver även{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">
                CRON_SECRET
              </code>
              .
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="weekly-digest-enabled"
                checked={enabled}
                disabled={pending}
                onCheckedChange={(v) => {
                  setEnabled(v)
                  persist(v)
                }}
              />
              <Label
                htmlFor="weekly-digest-enabled"
                className="cursor-pointer text-sm font-medium text-gray-800 dark:text-zinc-200"
              >
                Aktivera veckoutskick
              </Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full shrink-0 rounded-lg text-xs sm:w-auto"
              disabled={testPending}
              onClick={sendTest}
            >
              {testPending ? "Skickar…" : "Skicka test till mig"}
            </Button>
          </div>

          {lastSentLabel ? (
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              Senast skickat (schemalagt utskick): {lastSentLabel}{" "}
              <span className="text-gray-400 dark:text-zinc-600">
                (Stockholm)
              </span>
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              Inget schemalagt utskick har körts ännu.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
