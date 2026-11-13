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
    project?: string
    tab?: string
    godkannande?: string
  }>
}

function parseCompany(raw: string | undefined): DriftCompanyFilter {
  if (raw === "pact" || raw === "dirtywine" || raw === "both") return raw
  return "both"
}

function parseTab(raw: string | undefined): DriftTab {
  if (raw === "botar" || raw === "pipeline" || raw === "oversikt") return raw
  return "oversikt"
}

export default async function OperationsDriftPage({ searchParams }: PageProps) {
  const params = await searchParams
  const company = parseCompany(params.company)
  const owner = params.owner?.trim() || null
  const projectId = params.project?.trim() || null
  const tab = parseTab(params.tab)
  const godkannande = params.godkannande?.trim() || null

  const data = await getDriftOverview({
    company,
    owner,
    projectId,
  })

  return (
    <DriftOverviewClient
      initialData={data}
      company={company}
      owner={owner}
      projectId={projectId}
      tab={tab}
      godkannande={godkannande}
    />
  )
}
