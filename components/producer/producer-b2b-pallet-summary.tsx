"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  B2bPalletProducerProgressRow,
  B2bPalletProgressSummary,
} from "@/lib/b2b-pallet-producer-status";

function PalletCountChip({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const complete = total > 0 && count >= total;
  const partial = count > 0 && !complete;
  return (
    <div
      className={cn(
        "min-w-[7rem] flex-1 rounded-xl border px-2.5 py-2",
        complete
          ? "border-emerald-200 bg-emerald-50"
          : partial
            ? "border-amber-200 bg-amber-50"
            : "border-gray-200 bg-gray-50",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-medium",
          complete
            ? "text-emerald-800"
            : partial
              ? "text-amber-900"
              : "text-gray-500",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-medium tabular-nums",
          complete
            ? "text-gray-900"
            : partial
              ? "text-amber-900"
              : "text-gray-400",
        )}
      >
        {count}/{total}
      </p>
    </div>
  );
}

function stepToneClass(tone: B2bPalletProducerProgressRow["stepTone"]) {
  switch (tone) {
    case "done":
      return "bg-emerald-50 text-emerald-800";
    case "active":
      return "bg-amber-50 text-amber-900";
    case "rejected":
      return "bg-red-50 text-red-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

type Props = {
  shippedLabel: string | null;
  deliveredLabel: string | null;
  hubName: string | null;
  hubAddress: string | null;
  progress: B2bPalletProgressSummary;
  producers: B2bPalletProducerProgressRow[];
};

export function ProducerB2bPalletSummary({
  shippedLabel,
  deliveredLabel,
  hubName,
  hubAddress,
  progress,
  producers,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      <h2 className="text-sm font-medium text-gray-900">Summary</h2>

      <dl className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <dt className="text-xs text-gray-500">Shipped</dt>
          <dd>{shippedLabel ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Delivered</dt>
          <dd>{deliveredLabel ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Consolidation hub</dt>
          <dd>
            <span className="block">{hubName ?? "—"}</span>
            {hubAddress ? (
              <span className="mt-0.5 block text-xs text-gray-500">
                {hubAddress}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="pt-1">
        <p className="text-xs text-gray-500 mb-2">
          Pallet progress · {progress.producerCount} producers
        </p>
        <div className="flex flex-wrap gap-2">
          <PalletCountChip
            label="Order sent"
            count={progress.orderSent}
            total={progress.producerCount}
          />
          <PalletCountChip
            label="Confirmed"
            count={progress.confirmed}
            total={progress.producerCount}
          />
          <PalletCountChip
            label="Hub Delivery"
            count={progress.hubDelivered}
            total={progress.producerCount}
          />
          <PalletCountChip
            label="Pallet assembled"
            count={progress.palletAssembled ? 1 : 0}
            total={1}
          />
          <PalletCountChip
            label="Pallet shipped"
            count={progress.palletShipped ? 1 : 0}
            total={1}
          />
        </div>
        {progress.declined > 0 ? (
          <p className="mt-2 text-xs text-red-700">
            {progress.declined} declined
          </p>
        ) : null}
      </div>

      {producers.length > 0 ? (
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-left transition-colors hover:bg-gray-100"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                All producers
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {open
                  ? "Hide each producer’s status"
                  : "Show each producer’s status on this pallet"}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          {open ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Producer</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {producers.map((p) => (
                    <tr
                      key={p.producerId}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="px-3 py-2.5 text-gray-900">
                        {p.producerName}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            stepToneClass(p.stepTone),
                          )}
                        >
                          {p.stepLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
