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

function formatSekPrecise(cents: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  const econ = summary.economics;

  const avgPerBottle =
    econ.expectedContributionPerBottleCents != null
      ? formatSekPrecise(econ.expectedContributionPerBottleCents)
      : "—";

  const estBottlesToThreshold =
    econ.estimatedBottlesRemaining != null
      ? String(econ.estimatedBottlesRemaining)
      : "—";

  const estTotalAtEconomicReady =
    econ.estimatedBottlesRemaining != null
      ? String(summary.bottlesFilled + econ.estimatedBottlesRemaining)
      : "—";

  const shadowTone: "ok" | "warn" | "neutral" = econ.isEconomicallyReady
    ? "ok"
    : econ.bottlesWithSnapshot === 0 || econ.hasIncompleteSnapshots
      ? "warn"
      : "neutral";

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
        <StageChip
          label="Shipping ordered"
          done={shippingOrdered}
          active={shippingOrdered && !inTransit && !delivered}
        />
        <StageChip
          label="In transit"
          done={inTransit || delivered}
          active={inTransit}
        />
        <StageChip label="Delivered" done={delivered} />
        <StageChip
          label={
            econ.isEconomicallyReady
              ? "Shadow: economically ready"
              : `Shadow: ${econ.freightFundedPercent.toFixed(0)}% funded`
          }
          done={econ.isEconomicallyReady}
          active={!econ.isEconomicallyReady && econ.bottlesWithSnapshot > 0}
        />
      </div>

      {open ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <MetricCell
              label="Ship readiness (live)"
              value={`${summary.bottlesFilled} / ${summary.minBottlesToShip}`}
              hint={`${summary.bottlesRemainingToShip} remaining · ${summary.shipProgressPercent}% · threshold min_bottles_to_complete`}
              tone={summary.isReadyToShip ? "ok" : "warn"}
            />
            <MetricCell
              label="Physical capacity"
              value={`${summary.bottlesFilled} / ${summary.physicalBottleCapacity}`}
              hint={`${summary.physicalBottlesRemaining} remaining · ${summary.physicalUtilizationPercent}% util.`}
            />
          </div>

          <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Shadow economics
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                Informational only — does not control live ship-ready (
                {summary.minBottlesToShip} bottles)
              </p>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCell
                label="Freight funded"
                value={`${econ.freightFundedPercent.toFixed(1)}%`}
                hint={`${formatSek(econ.accumulatedContributionCents)} of ${formatSek(econ.freightTargetCents)}`}
                tone={shadowTone}
              />
              <MetricCell
                label="Est. bottles to fund freight"
                value={estBottlesToThreshold}
                hint={
                  econ.estimatedBottlesRemaining != null
                    ? `At current avg ${avgPerBottle}/bottle`
                    : econ.bottlesWithSnapshot === 0
                      ? "No snapshots yet"
                      : "Avg contribution too low / ≤ 0 to estimate"
                }
                tone={
                  econ.estimatedBottlesRemaining != null ? "neutral" : "warn"
                }
              />
              <MetricCell
                label="Est. total at economic ready"
                value={estTotalAtEconomicReady}
                hint={
                  econ.estimatedBottlesRemaining != null
                    ? `${summary.bottlesFilled} filled + ${econ.estimatedBottlesRemaining} more`
                    : "—"
                }
              />
              <MetricCell
                label="Accumulated contribution"
                value={formatSekPrecise(econ.accumulatedContributionCents)}
                hint="Sum of pre-pallet contribution from snapshots"
              />
              <MetricCell
                label="Remaining to target"
                value={formatSekPrecise(econ.remainingContributionCents)}
                hint={`Target source: ${freightSourceLabel(econ.freightTargetSource)}`}
              />
              <MetricCell
                label="Avg contribution / bottle"
                value={avgPerBottle}
                hint={`${econ.bottlesWithSnapshot} / ${summary.bottlesFilled} bottles snapshotted`}
                tone={
                  econ.bottlesWithSnapshot === 0
                    ? "warn"
                    : (econ.expectedContributionPerBottleCents ?? 0) <= 0
                      ? "warn"
                      : "neutral"
                }
              />
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-gray-500 dark:text-zinc-400">
                  Inbound freight target
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-zinc-100">
                  {econ.freightTargetCents > 0
                    ? formatSek(econ.freightTargetCents)
                    : "—"}
                  <span className="text-xs text-gray-500 dark:text-zinc-500">
                    {" · "}
                    {freightSourceLabel(econ.freightTargetSource)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-zinc-400">
                  Economically ready
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-zinc-100">
                  {econ.isEconomicallyReady ? "Yes" : "No"}
                  {econ.hasIncompleteSnapshots ? " · partial snapshots" : ""}
                </dd>
              </div>
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
                  {econ.bottlesWithSnapshot} / {summary.bottlesFilled} bottles
                  with contribution snapshot
                  {econ.hasIncompleteSnapshots ? " (partial)" : ""}
                </dd>
              </div>
            </dl>

            <ContributionBreakdownPanel
              breakdown={summary.economicsBreakdown}
              freightTargetCents={econ.freightTargetCents}
              freightTargetSource={econ.freightTargetSource}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

function formatPctOfBase(amountCents: number, baseCents: number): string | null {
  if (!Number.isFinite(baseCents) || baseCents <= 0) return null;
  const pct = (amountCents / baseCents) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded.toFixed(1)}%`;
}

function BreakdownRow({
  label,
  amountCents,
  baseCents,
  tone,
  note,
}: {
  label: string;
  amountCents: number;
  /** % of product net revenue (ex VAT). */
  baseCents?: number;
  tone?: "plus" | "minus" | "total" | "muted";
  note?: string;
}) {
  const sign =
    tone === "plus" && amountCents > 0
      ? "+"
      : tone === "minus" && amountCents !== 0
        ? "−"
        : "";
  const display =
    tone === "minus"
      ? `${sign}${formatSekPrecise(Math.abs(amountCents))}`
      : `${sign}${formatSekPrecise(amountCents)}`;
  const pct =
    baseCents != null ? formatPctOfBase(amountCents, baseCents) : null;

  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <div className="min-w-0">
        <p
          className={cn(
            "text-gray-800 dark:text-zinc-200",
            tone === "total" && "font-semibold text-gray-900 dark:text-zinc-100",
            tone === "muted" && "text-gray-500 dark:text-zinc-500",
          )}
        >
          {label}
        </p>
        {note ? (
          <p className="text-[10px] text-gray-500 dark:text-zinc-500">{note}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "tabular-nums",
            tone === "plus" && "text-emerald-700 dark:text-emerald-400",
            tone === "minus" && "text-red-700/90 dark:text-red-400/90",
            tone === "total" && "font-semibold text-gray-900 dark:text-zinc-100",
            tone === "muted" && "text-gray-500 dark:text-zinc-500",
            !tone && "text-gray-900 dark:text-zinc-100",
          )}
        >
          {display}
        </p>
        {pct ? (
          <p className="text-[10px] tabular-nums text-gray-500 dark:text-zinc-500">
            {pct}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ContributionBreakdownPanel({
  breakdown,
  freightTargetCents,
  freightTargetSource,
}: {
  breakdown: AdminPalletOperatingSummary["economicsBreakdown"];
  freightTargetCents: number;
  freightTargetSource: string;
}) {
  const [open, setOpen] = useState(false);

  if (!breakdown || breakdown.bottlesWithSnapshot <= 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs text-gray-500 dark:border-zinc-700 dark:text-zinc-500">
        Full calculation breakdown needs contribution snapshots on filled
        bottles.
        {breakdown && breakdown.bottlesWithoutSnapshot > 0
          ? ` (${breakdown.bottlesWithoutSnapshot} bottles missing snapshot)`
          : ""}
      </div>
    );
  }

  const baseCents = breakdown.productNetRevenueCents;

  return (
    <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
          Full calculation — GM1 / GM2
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="mt-3 space-y-4">
          <p className="text-[11px] text-gray-500 dark:text-zinc-500">
            Aggregated from frozen unit snapshots × quantity (
            {breakdown.bottlesWithSnapshot} bottles)
            {breakdown.bottlesWithoutSnapshot > 0
              ? ` · ${breakdown.bottlesWithoutSnapshot} without snapshot excluded`
              : ""}
            {breakdown.hasIncompleteUnitSnapshots
              ? " · some units marked incomplete"
              : ""}
            . Percentages are of product net revenue (ex VAT)
            {baseCents > 0 ? ` (${formatSekPrecise(baseCents)})` : ""}. Inbound
            pallet freight is the shadow target only — not inside GM1/GM2.
          </p>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
              GM1 — product margin
            </p>
            <p className="mb-2 text-[10px] text-gray-500 dark:text-zinc-500">
              Net product revenue − purchase − alcohol excise
            </p>
            <BreakdownRow
              label="Product revenue (gross)"
              amountCents={breakdown.productGrossRevenueCents}
              baseCents={baseCents}
              tone="plus"
            />
            <BreakdownRow
              label="Product revenue (net, ex VAT)"
              amountCents={breakdown.productNetRevenueCents}
              baseCents={baseCents}
              tone="plus"
              note="100% base for % column"
            />
            <BreakdownRow
              label="Discounts (gross)"
              amountCents={breakdown.discountCents}
              baseCents={baseCents}
              tone="muted"
              note="Already reflected in paid gross/net"
            />
            <BreakdownRow
              label="Producer purchase cost"
              amountCents={breakdown.purchaseCostCents}
              baseCents={baseCents}
              tone="minus"
            />
            <BreakdownRow
              label="Alcohol excise"
              amountCents={breakdown.exciseCents}
              baseCents={baseCents}
              tone="minus"
            />
            <BreakdownRow
              label="= GM1"
              amountCents={breakdown.gm1Cents}
              baseCents={baseCents}
              tone="total"
            />
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
              GM2 — contribution before inbound pallet
            </p>
            <p className="mb-2 text-[10px] text-gray-500 dark:text-zinc-500">
              GM1 + shipping revenue − payment fees − last-mile − EPR − refund
              reserve (= pre-pallet contribution)
            </p>
            <BreakdownRow
              label="Customer shipping revenue (net)"
              amountCents={breakdown.shippingRevenueNetCents}
              baseCents={baseCents}
              tone="plus"
            />
            <BreakdownRow
              label="Payment fees"
              amountCents={breakdown.paymentFeeCents}
              baseCents={baseCents}
              tone="minus"
            />
            <BreakdownRow
              label="Last-mile / outbound carrier"
              amountCents={breakdown.lastMileCostCents}
              baseCents={baseCents}
              tone="minus"
              note="Outbound delivery — not inbound pallet freight"
            />
            <BreakdownRow
              label="EPR reserve"
              amountCents={breakdown.eprCents}
              baseCents={baseCents}
              tone="minus"
            />
            <BreakdownRow
              label="Refund / breakage reserve"
              amountCents={breakdown.refundReserveCents}
              baseCents={baseCents}
              tone="minus"
            />
            <BreakdownRow
              label="= GM2 (pre-pallet contribution)"
              amountCents={breakdown.gm2Cents}
              baseCents={baseCents}
              tone="total"
            />
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
              Inbound pallet target (outside GM)
            </p>
            <BreakdownRow
              label="Inbound pallet freight target"
              amountCents={freightTargetCents}
              baseCents={baseCents}
              tone="muted"
              note={freightSourceLabel(freightTargetSource)}
            />
            <BreakdownRow
              label="Remaining to fund inbound"
              amountCents={Math.max(0, freightTargetCents - breakdown.gm2Cents)}
              baseCents={baseCents}
              tone="total"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
