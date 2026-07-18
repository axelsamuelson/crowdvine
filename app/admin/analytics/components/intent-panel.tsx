"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  INTENT_SESSION_DEFINITION,
  type IntentWine,
  type WeeklyFunnelRow,
} from "@/lib/analytics/intent-sessions";
import { FunnelStepBadgeEl } from "./funnel-step-badge";
import { WeeklyIntentFunnel } from "./weekly-intent-funnel";

type IntentEvent = {
  event_type: string;
  event_metadata: unknown;
  created_at: string;
  page_url: string | null;
};

type IntentSession = {
  session_id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  started_at: string;
  last_seen_at: string;
  wines: IntentWine[];
  cart_value: number;
  last_step: string;
  events: IntentEvent[];
};

function wineSummary(wines: IntentWine[]): string {
  if (!wines.length) return "—";
  return wines
    .map((w) => `${w.quantity}× ${w.productName}`)
    .join(", ");
}

function formatSek(value: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(value);
}

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "nyss";
  if (mins < 60) return `${mins} min sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h sedan`;
  const days = Math.floor(hours / 24);
  return `${days} d sedan`;
}

export function IntentPanel({
  site = "all",
}: {
  site?: import("@/lib/analytics/analytics-site").AnalyticsSiteFilter;
}) {
  const [sessions, setSessions] = useState<IntentSession[]>([]);
  const [weeklyFunnel, setWeeklyFunnel] = useState<WeeklyFunnelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/analytics/intent?days=56&site=${site}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Kunde inte ladda Nära köp");
        if (!cancelled) {
          setSessions(json.sessions ?? []);
          setWeeklyFunnel(json.weeklyFunnel ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Kunde inte ladda");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [site]);

  if (loading) {
    return (
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        Laddar Nära köp…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Nära köp
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            Sessioner med varukorg eller checkout som inte konverterat.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 border-gray-200 dark:border-zinc-700"
            >
              <Info className="size-3.5" aria-hidden />
              Definition
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm" align="end">
            <p className="font-medium text-gray-900 dark:text-white mb-1.5">
              Intent-session
            </p>
            <p className="text-gray-600 dark:text-zinc-300 leading-relaxed">
              {INTENT_SESSION_DEFINITION}
            </p>
          </PopoverContent>
        </Popover>
      </div>

      <WeeklyIntentFunnel weeks={weeklyFunnel} />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Intent-sessioner
        </h3>

        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 dark:border-zinc-700 px-4 py-8 text-center">
            <p className="text-sm text-gray-700 dark:text-zinc-300">
              Inga intent-sessioner i perioden.
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500 max-w-md mx-auto leading-relaxed">
              En intent-session är en ren session med{" "}
              <code className="text-[11px]">add_to_cart</code> eller checkout,
              utan reservation i sessionen, och för inloggade användare utan
              reservation inom 7 dagar. Testa genom att lägga något i varukorgen
              och lämna sidans flöde.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-zinc-800 rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
            {sessions.map((s) => {
              const open = expanded === s.session_id;
              const dateLabel = new Date(s.started_at).toLocaleDateString(
                "sv-SE",
                { year: "numeric", month: "short", day: "numeric" },
              );
              return (
                <li key={s.session_id}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(open ? null : s.session_id)
                    }
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-gray-500 dark:text-zinc-500">
                            {dateLabel}
                          </span>
                          {s.email ? (
                            <a
                              href={`mailto:${s.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-gray-900 dark:text-white underline-offset-2 hover:underline truncate"
                            >
                              {s.email}
                            </a>
                          ) : (
                            <span className="font-medium text-gray-700 dark:text-zinc-300">
                              Anonym
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-zinc-400 truncate">
                          {wineSummary(s.wines)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
                        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                          {formatSek(s.cart_value)}
                        </span>
                        <FunnelStepBadgeEl step={s.last_step} />
                        <span className="text-xs text-gray-500 dark:text-zinc-500">
                          {timeSince(s.last_seen_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 bg-gray-50/80 dark:bg-zinc-900/30 space-y-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-2">
                          Viner i varukorg
                        </p>
                        {s.wines.length === 0 ? (
                          <p className="text-sm text-gray-500">Inga viner kvar</p>
                        ) : (
                          <ul className="space-y-1">
                            {s.wines.map((w) => (
                              <li
                                key={w.productId}
                                className="text-sm text-gray-800 dark:text-zinc-200 flex justify-between gap-4"
                              >
                                <span>
                                  {w.quantity}× {w.productName}
                                </span>
                                <span className="tabular-nums text-gray-500">
                                  {formatSek(w.price * w.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-2">
                          Eventsekvens
                        </p>
                        <ol className="space-y-1.5 max-h-64 overflow-y-auto">
                          {(s.events ?? []).map((ev, i) => (
                            <li
                              key={`${ev.created_at}-${i}`}
                              className="text-xs font-mono text-gray-700 dark:text-zinc-300 flex flex-wrap gap-x-2"
                            >
                              <span className="text-gray-400 dark:text-zinc-500">
                                {new Date(ev.created_at).toLocaleTimeString(
                                  "sv-SE",
                                )}
                              </span>
                              <span>{ev.event_type}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
