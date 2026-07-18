"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventTimeline } from "./components/event-timeline";
import { CohortAnalysis } from "./components/cohort-analysis";
import { ViewsTable } from "./components/views-table";
import { MetricsCards, type Metrics28d } from "./components/metrics-cards";
import { TrafficPanel } from "./components/traffic-panel";
import { IntentPanel } from "./components/intent-panel";
import { UsersPanel } from "./components/users-panel";
import { SiteSwitcher } from "./components/site-switcher";
import {
  parseSiteParam,
  type AnalyticsSiteFilter,
} from "@/lib/analytics/analytics-site";
import { BarChart2 } from "lucide-react";

export function AnalyticsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const site = parseSiteParam(searchParams.get("site"));

  const [events, setEvents] = useState([]);
  const [metrics, setMetrics] = useState<Metrics28d | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const setSite = useCallback(
    (next: AnalyticsSiteFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("site");
      else params.set("site", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingMetrics(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/analytics/intent?days=28&site=${site}`,
        );
        const json = await res.json();
        if (!cancelled && res.ok) {
          setMetrics(json.metrics28d ?? null);
        }
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      } finally {
        if (!cancelled) setLoadingMetrics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [site]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsRes = await fetch("/api/admin/analytics?metric=events");
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoadingEvents(false);
      }
    };
    void fetchEvents();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <SiteSwitcher value={site} onChange={setSite} />
        <p className="text-xs text-gray-500 dark:text-zinc-500">
          Trafik & Nära köp filtreras på site. Användare/Debug opåverkade.
        </p>
      </div>

      <MetricsCards data={metrics} loading={loadingMetrics} />

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23]">
        <Tabs defaultValue="traffic" className="w-full">
          <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
              Rapporter
            </h2>
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-0 rounded-none gap-1 flex flex-wrap">
              <TabsTrigger
                value="traffic"
                className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-[#1F1F23] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                Trafik
              </TabsTrigger>
              <TabsTrigger
                value="intent"
                className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-[#1F1F23] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                Nära köp
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-[#1F1F23] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                Användare
              </TabsTrigger>
              <TabsTrigger
                value="customers"
                className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-[#1F1F23] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                Kunder
              </TabsTrigger>
              <TabsTrigger
                value="debug"
                className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-[#1F1F23] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                Debug
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="traffic" className="mt-0">
              <TrafficPanel site={site} />
            </TabsContent>
            <TabsContent value="intent" className="mt-0">
              <IntentPanel site={site} />
            </TabsContent>
            <TabsContent value="users" className="mt-0">
              <UsersPanel />
            </TabsContent>
            <TabsContent value="customers" className="mt-0">
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                Fas 3 — byggs när Nära köp lever
              </p>
            </TabsContent>
            <TabsContent value="debug" className="mt-0 space-y-10">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Event-timeline
                </h3>
                {loadingEvents ? (
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    Laddar event-timeline…
                  </p>
                ) : (
                  <EventTimeline events={events} showSiteBadge />
                )}
              </section>

              <section className="space-y-3 border-t border-gray-100 dark:border-zinc-800 pt-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Parkerad
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
                    Meningsfull från ~50 reservationer/månad
                  </p>
                </div>
                <CohortAnalysis />
              </section>

              <section className="space-y-3 border-t border-gray-100 dark:border-zinc-800 pt-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Views
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  Behållen från tidigare dashboard.
                </p>
                <ViewsTable />
              </section>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
