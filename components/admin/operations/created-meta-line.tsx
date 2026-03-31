/**
 * Visar när och av vem något skapades (operations: objectives, projects, tasks).
 */

export function formatOpsDateTimeSv(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("sv-SE")
}

export function CreatedMetaLine({
  createdAt,
  creatorEmail,
  className = "",
  /** Om satt och e-post saknas: visa "Okänd användare" (t.ex. tasks eller när created_by finns). */
  showUnknownIfNoCreator = false,
}: {
  createdAt: string | null | undefined
  creatorEmail?: string | null
  className?: string
  showUnknownIfNoCreator?: boolean
}) {
  if (!createdAt) return null
  const when = formatOpsDateTimeSv(createdAt)
  const who = creatorEmail?.trim() || null
  return (
    <p className={`text-xs text-gray-500 dark:text-zinc-400 ${className}`.trim()}>
      <span className="font-medium text-gray-600 dark:text-zinc-300">Skapad:</span> {when}
      {who ? (
        <>
          {" "}
          · <span title={who}>{who}</span>
        </>
      ) : showUnknownIfNoCreator ? (
        <> · Okänd användare</>
      ) : null}
    </p>
  )
}
