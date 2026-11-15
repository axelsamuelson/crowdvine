import { DriftOverviewClient } from "@/components/admin/operations/drift/drift-overview-client"
import {
  getDriftFocus,
  getDriftOverview,
} from "@/lib/actions/drift-overview"
import type { FocusPeriodKind } from "@/lib/operations/drift/focus-period"
import type {
  DriftCompanyFilter,
  DriftTab,
} from "@/lib/operations/drift/types"

interface PageProps {
  searchParams: Promise<{
    company?: string
    owner?: string
    tab?: string
    godkannande?: string
    period?: string
    periodAnchor?: string
    filter?: string
    expand?: string
    help?: string
  }>
}

function parseCompany(raw: string | undefined): DriftCompanyFilter {
  if (raw === "dirtywine") return "dirtywine"
  return "pact"
}

function parseTab(raw: string | undefined): DriftTab {
  if (
    raw === "mal" ||
    raw === "pipeline" ||
    raw === "oversikt" ||
    raw === "fokus"
  ) {
    return raw
  }
  return "oversikt"
}

function parsePeriod(raw: string | undefined): FocusPeriodKind {
  return raw === "month" ? "month" : "week"
}

export default async function OperationsDriftPage({ searchParams }: PageProps) {
  const params = await searchParams
  const company = parseCompany(params.company)
  const owner = params.owner?.trim() || null
  const tab = parseTab(params.tab)
  const godkannande = params.godkannande?.trim() || null
  const period = parsePeriod(params.period)
  const periodAnchor = params.periodAnchor?.trim() || null
  const listFilter = params.filter === "utan-poang" ? "utan-poang" : null
  const focusExpandRank = params.expand ? Number(params.expand) : null
  const focusHelpOpen = params.help === "1" || params.help === "true"

  const data = await getDriftOverview({
    company,
    owner,
  })

  const focusData =
    tab === "fokus" || listFilter === "utan-poang"
      ? await getDriftFocus({
          company,
          owner,
          period,
          periodAnchor,
        })
      : null

  const focusExpandId =
    focusData && focusExpandRank && Number.isFinite(focusExpandRank)
      ? (focusData.goals.find((g) => g.rank === focusExpandRank)?.id ?? null)
      : null

  return (
    <DriftOverviewClient
      initialData={data}
      focusData={focusData}
      company={company}
      owner={owner}
      tab={tab}
      godkannande={godkannande}
      period={period}
      periodAnchor={periodAnchor}
      listFilter={listFilter}
      focusExpandId={focusExpandId}
      focusHelpOpen={focusHelpOpen}
    />
  )
}
