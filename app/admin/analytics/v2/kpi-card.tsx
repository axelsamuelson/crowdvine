"use client";

import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatSvNumber, formatSvPercent } from "@/lib/analytics/v2/labels";
import { lowNLevel, wilsonInterval } from "@/lib/analytics/v2/wilson";

export function KpiCard({
  label,
  value,
  ofTotal,
  compareAbs,
  comparePct,
  definition,
  monoKey,
}: {
  label: string;
  value: number | string;
  ofTotal?: { num: number; den: number };
  compareAbs?: number | null;
  comparePct?: number | null;
  definition: string;
  monoKey?: string;
}) {
  const level = ofTotal ? lowNLevel(ofTotal.den) : "ok";
  const wilson =
    ofTotal && ofTotal.den > 0
      ? wilsonInterval(ofTotal.num, ofTotal.den)
      : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="cursor-help text-xs font-medium text-gray-600 dark:text-gray-400">
            {label}
          </p>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">
          <p>{definition}</p>
          {monoKey ? (
            <p className="mt-1 font-mono text-xs opacity-80">{monoKey}</p>
          ) : null}
          {wilson ? (
            <p className="mt-1 text-xs">
              Wilson 95 %: {formatSvPercent(wilson.low)}–
              {formatSvPercent(wilson.high)}
            </p>
          ) : null}
        </TooltipContent>
      </Tooltip>
      <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
        {typeof value === "number" ? formatSvNumber(value) : value}
      </p>
      {ofTotal ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="tabular-nums">
            {formatSvNumber(ofTotal.num)} av {formatSvNumber(ofTotal.den)}
          </span>
          {level === "hide" ? null : (
            <span
              className={
                level === "caution"
                  ? "inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"
                  : "tabular-nums"
              }
            >
              {level === "caution" ? (
                <AlertTriangle className="h-3 w-3" aria-hidden />
              ) : null}
              {formatSvPercent(ofTotal.num / Math.max(1, ofTotal.den))}
            </span>
          )}
          {level === "hide" ? (
            <span className="text-amber-700 dark:text-amber-300">
              För få sessioner för andel
            </span>
          ) : null}
        </p>
      ) : null}
      {compareAbs != null ? (
        <p className="mt-2 text-xs tabular-nums text-gray-500 dark:text-gray-400">
          {compareAbs >= 0 ? "+" : ""}
          {formatSvNumber(compareAbs)}
          {comparePct != null && Math.abs(comparePct) < 10_000
            ? ` (${comparePct >= 0 ? "+" : ""}${formatSvPercent(comparePct / 100)})`
            : ""}
          {" "}mot föregående
        </p>
      ) : null}
    </div>
  );
}
