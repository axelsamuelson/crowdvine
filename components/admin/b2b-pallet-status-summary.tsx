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
        "min-w-[7rem] flex-1 rounded-lg border px-2.5 py-2",
        complete
          ? "border-emerald-500/30 bg-emerald-500/10"
          : partial
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900/50",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-medium",
          complete
            ? "text-emerald-700 dark:text-emerald-300"
            : partial
              ? "text-amber-800 dark:text-amber-200"
              : "text-gray-500 dark:text-zinc-400",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-medium tabular-nums",
          complete
            ? "text-gray-900 dark:text-zinc-100"
            : partial
              ? "text-amber-900 dark:text-amber-100"
              : "text-gray-400 dark:text-zinc-500",
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
      return "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "active":
      return "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200";
    case "rejected":
      return "bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

type Props = {
  shippedLabel: string | null;
  deliveredLabel: string | null;
  hubName: string;
  hubAddress: string | null;
  costLabel: string | null;
  progress: B2bPalletProgressSummary;
  producers: B2bPalletProducerProgressRow[];
};

export function AdminB2bPalletStatusSummary({
  shippedLabel,
  deliveredLabel,
  hubName,
  hubAddress,
  costLabel,
  progress,
  producers,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Pallsammanfattning
        </h2>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-zinc-400",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-gray-500 dark:text-zinc-400">Skickad</dt>
          <dd className="mt-0.5 text-sm text-gray-900 dark:text-zinc-100">
            {shippedLabel ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-zinc-400">Levererad</dt>
          <dd className="mt-0.5 text-sm text-gray-900 dark:text-zinc-100">
            {deliveredLabel ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-zinc-400">
            Konsolideringshub
          </dt>
          <dd className="mt-0.5 text-sm text-gray-900 dark:text-zinc-100">
            <span className="block">{hubName}</span>
            {hubAddress ? (
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-zinc-400">
                {hubAddress}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-zinc-400">Pallkostnad</dt>
          <dd className="mt-0.5 text-sm tabular-nums text-gray-900 dark:text-zinc-100">
            {costLabel ?? "—"}
          </dd>
        </div>
      </dl>

      {producers.length > 0 ? (
        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-[#1F1F23]">
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Pallstatus · {progress.producerCount} producenter
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
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
            <p className="mt-2 text-xs text-red-700 dark:text-red-300">
              {progress.declined} avböjda
            </p>
          ) : null}

          {open ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-[#1F1F23]">
              <table className="w-full min-w-[22rem] text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 dark:border-[#1F1F23] dark:bg-zinc-900/50 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Producent</th>
                    <th className="px-3 py-2 font-medium tabular-nums">
                      Flaskor
                    </th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {producers.map((p) => (
                    <tr
                      key={p.producerId}
                      className="border-b border-gray-50 last:border-0 dark:border-[#1F1F23]"
                    >
                      <td className="px-3 py-2.5 text-gray-900 dark:text-zinc-100">
                        {p.producerName}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gray-700 dark:text-zinc-300">
                        {p.bottleCount}
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
    </section>
  );
}
