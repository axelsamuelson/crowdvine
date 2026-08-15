"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminPalletOperatingSummary } from "@/lib/admin-pallet-operating-summary";

function MetricCell({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "neutral";
}) {
  return (
    <div
      className={cn(
        "min-w-[7rem] flex-1 rounded-lg border px-2.5 py-2",
        tone === "ok"
          ? "border-emerald-500/30 bg-emerald-500/10"
          : tone === "warn"
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900/50",
      )}
    >
      <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-gray-900 dark:text-zinc-100">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-gray-500 dark:text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function StageChip({
  label,
  active,
  done,
}: {
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
        done
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
          : active
            ? "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
            : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300",
      )}
    >
      {label}
    </span>
  );
}

function formatSek(cents: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function freightSourceLabel(source: string) {
  switch (source) {
    case "manual_override":
      return "Manual override";
    case "selected_quote":
      return "Selected inbound quote";
    case "legacy_cost":
      return "Legacy pallet cost";
    default:
      return "None";
  }
}

type Props = {
  summary: AdminPalletOperatingSummary;
};

export function AdminPactPalletStatusSummary({ summary }: Props) {
  const [open, setOpen] = useState(true);
  const st = (summary.operationalStatus || "").toLowerCase();
  const shippingOrdered = st === "shipping_ordered" || !!summary.shippingOrderedAt;
  const inTransit = [
    "awaiting_pickup",
    "picked_up",
    "in_transit",
    "out_for_delivery",
  ].includes(st);
  const delivered = st === "delivered";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Pallet summary
        </h2>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-zinc-400",
            open && "rotate-180",
          )}
        />
      </button>

      <div className="mt-3 flex flex-wrap gap-2">
        <StageChip
          label={`Orders ${summary.bottlesFilled}/${summary.minBottlesToShip}`}
          active={!summary.isReadyToShip && summary.bottlesFilled > 0}
          done={summary.isReadyToShip}
        />
        <StageChip label="Ready to ship" done={summary.isReadyToShip} />
        <StageChip label="Shipping ordered" done={shippingOrdered} active={shippingOrdered && !inTransit && !delivered} />
        <StageChip label="In transit" done={inTransit || delivered} active={inTransit} />
        <StageChip label="Delivered" done={delivered} />
      </div>

      {open ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCell
              label="Ship readiness (live)"
              value={`${summary.bottlesFilled} / ${summary.minBottlesToShip}`}
              hint={`${summary.bottlesRemainingToShip} remaining · ${summary.shipProgressPercent}%`}
              tone={summary.isReadyToShip ? "ok" : "warn"}
            />
            <MetricCell
              label="Physical capacity"
              value={`${summary.bottlesFilled} / ${summary.physicalBottleCapacity}`}
              hint={`${summary.physicalBottlesRemaining} remaining · ${summary.physicalUtilizationPercent}% util.`}
            />
            <MetricCell
              label="Shadow economics"
              value={`${summary.economics.freightFundedPercent.toFixed(0)}% funded`}
              hint={`${formatSek(summary.economics.accumulatedContributionCents)} / ${formatSek(summary.economics.freightTargetCents)} · informational only`}
              tone={
                summary.economics.isEconomicallyReady
                  ? "ok"
                  : summary.economics.hasIncompleteSnapshots
                    ? "warn"
                    : "neutral"
              }
            />
            <MetricCell
              label="Inbound freight target"
              value={
                summary.economics.freightTargetCents > 0
                  ? formatSek(summary.economics.freightTargetCents)
                  : "—"
              }
              hint={freightSourceLabel(summary.economics.freightTargetSource)}
              tone={
                summary.economics.freightTargetSource === "legacy_cost"
                  ? "warn"
                  : "neutral"
              }
            />
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-zinc-400">
                Inbound logistics
              </dt>
              <dd className="mt-0.5 text-gray-900 dark:text-zinc-100">
                {summary.inbound.providerName ?? "—"}
                {summary.inbound.serviceName
                  ? ` · ${summary.inbound.serviceName}`
                  : ""}
                {summary.inbound.totalSekCents != null
                  ? ` · ${formatSek(summary.inbound.totalSekCents)}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-zinc-400">
                Outbound (Instabee)
              </dt>
              <dd className="mt-0.5 text-gray-900 dark:text-zinc-100">
                {summary.outbound.packagingConfigured
                  ? `${summary.outbound.packagingCode} configured`
                  : `${summary.outbound.packagingCode ?? "Packaging"} incomplete`}
                {summary.outbound.incompleteQuoteCount > 0
                  ? ` · ${summary.outbound.incompleteQuoteCount} incomplete quote(s)`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-zinc-400">
                Operational status
              </dt>
              <dd className="mt-0.5 capitalize text-gray-900 dark:text-zinc-100">
                {(summary.operationalStatus || "—").replace(/_/g, " ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-zinc-400">
                Snapshots
              </dt>
              <dd className="mt-0.5 text-gray-900 dark:text-zinc-100">
                {summary.economics.bottlesWithSnapshot} / {summary.bottlesFilled}{" "}
                bottles with contribution snapshot
                {summary.economics.hasIncompleteSnapshots ? " (partial)" : ""}
              </dd>
            </div>
          </dl>
        </>
      ) : null}
    </section>
  );
}
