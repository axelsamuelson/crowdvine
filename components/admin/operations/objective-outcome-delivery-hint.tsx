import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Props {
  krAggregate: number | null
  projectDelivery: number | null
}

/**
 * Compares average key-result (outcome) progress with average project task progress (delivery)
 * under the same objective.
 */
export function ObjectiveOutcomeDeliveryHint({
  krAggregate,
  projectDelivery,
}: Props) {
  if (krAggregate === null && projectDelivery === null) return null

  const showDisconnect =
    krAggregate !== null &&
    projectDelivery !== null &&
    projectDelivery >= 65 &&
    krAggregate <= 45 &&
    projectDelivery - krAggregate >= 25

  return (
    <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-[#1F1F23]">
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        {krAggregate !== null && (
          <>
            Key results (avg):{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {krAggregate}%
            </span>
          </>
        )}
        {krAggregate !== null && projectDelivery !== null && (
          <span className="text-gray-400 dark:text-zinc-500"> · </span>
        )}
        {projectDelivery !== null && (
          <>
            Project delivery (avg):{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {projectDelivery}%
            </span>
          </>
        )}
        {krAggregate !== null && projectDelivery === null && (
          <span className="block mt-1 text-gray-400 dark:text-zinc-500">
            No projects with active tasks to compare delivery progress.
          </span>
        )}
      </p>

      {showDisconnect && (
        <Alert
          className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100 [&>svg]:text-amber-700 dark:[&>svg]:text-amber-400"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            Delivery ahead of measured outcomes
          </AlertTitle>
          <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
            Task progress across projects looks strong, but key results are
            still low. Check whether work maps to the right metrics or update
            KR current values.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
