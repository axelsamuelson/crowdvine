import { Suspense } from "react";
import { FinanceDashboard } from "./finance-dashboard";

export const dynamic = "force-dynamic";

export default function AdminFinancePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Finans
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Intäkter, marginaler, styckekonomi och rörelsekostnader — intern
          redovisning för PACT och Dirtywine
        </p>
      </div>
      <Suspense
        fallback={
          <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-6 text-sm text-gray-500">
            Laddar finans…
          </div>
        }
      >
        <FinanceDashboard />
      </Suspense>
    </div>
  );
}
