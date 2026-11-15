import { DriftOverviewClient } from "@/components/admin/operations/drift/drift-overview-client"
import { getDriftOverview } from "@/lib/actions/drift-overview"
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
  }>
}

function parseCompany(raw: string | undefined): DriftCompanyFilter {
  if (raw === "dirtywine") return "dirtywine"
  return "pact"
}

function parseTab(raw: string | undefined): DriftTab {
  if (raw === "mal" || raw === "pipeline" || raw === "oversikt") return raw
  return "oversikt"
}

export default async function OperationsDriftPage({ searchParams }: PageProps) {
  const params = await searchParams
  const company = parseCompany(params.company)
  const owner = params.owner?.trim() || null
  const tab = parseTab(params.tab)
  const godkannande = params.godkannande?.trim() || null

  const data = await getDriftOverview({
    company,
    owner,
  })

  return (
    <DriftOverviewClient
      initialData={data}
      company={company}
      owner={owner}
      tab={tab}
      godkannande={godkannande}
    />
  )
}
