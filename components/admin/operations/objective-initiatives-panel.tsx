import {
  listInitiativesForObjective,
} from "@/lib/actions/initiatives"
import type { DriftCompany } from "@/lib/operations/drift/priority-rules"
import { InitiativeFormDialog } from "./initiative-form-dialog"

interface Props {
  objectiveId: string
  company: DriftCompany
  objectiveRank: number
}

export async function ObjectiveInitiativesPanel({
  objectiveId,
  company,
  objectiveRank,
}: Props) {
  const initiatives = await listInitiativesForObjective(objectiveId)
  const nextSort = initiatives.length + 1
  const nextKey = `${objectiveRank}.${nextSort}`

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Initiativ
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {initiatives.length} initiativ under målet
          </p>
        </div>
        <InitiativeFormDialog
          objectiveId={objectiveId}
          company={company}
          nextSortOrder={nextSort}
          nextKeyHint={nextKey}
        />
      </div>

      {initiatives.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Inga initiativ ännu.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
          {initiatives.map((init) => (
            <li
              key={init.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                  <span className="text-gray-500 dark:text-zinc-400">
                    {init.key}
                  </span>{" "}
                  {init.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Ansvarig {init.owner_agent} · ordning {init.sort_order}
                </p>
              </div>
              <InitiativeFormDialog
                objectiveId={objectiveId}
                company={company}
                nextSortOrder={init.sort_order}
                nextKeyHint={init.key}
                initiative={init}
                triggerLabel="Redigera"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
