import { Suspense } from "react";
import { FinanceDashboard } from "../finance-dashboard";

export const dynamic = "force-dynamic";

export default function AdminFinancePrisscenarierPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Prisscenarier
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Hypotetisk styckekonomi och priskänslighet — uppdaterar inte shoppriser
          förrän du aktivt applicerar
        </p>
      </div>
      <Suspense
        fallback={
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
            Laddar prisscenarier…
          </div>
        }
      >
        <FinanceDashboard mode="scenarios" />
      </Suspense>
    </div>
  );
}
