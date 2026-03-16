"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FunnelChart } from "./components/funnel-chart";
import { EventTimeline } from "./components/event-timeline";
import { CohortAnalysis } from "./components/cohort-analysis";
import { UserJourneyTable } from "./components/user-journey-table";
import { MetricsCards } from "./components/metrics-cards";
import { ViewsTable } from "./components/views-table";
import { BarChart2 } from "lucide-react";

export function AnalyticsDashboard() {
  const [funnelData, setFunnelData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [funnelRes, eventsRes] = await Promise.all([
          fetch("/api/admin/analytics?metric=funnel"),
          fetch("/api/admin/analytics?metric=events"),
        ]);

        const funnel = await funnelRes.json();
        const eventsData = await eventsRes.json();

        setFunnelData(funnel);
        setEvents(eventsData.events || []);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading analytics...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MetricsCards data={funnelData?.funnel} />

      <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23]">
        <Tabs defaultValue="funnel" className="w-full">
          <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
              Reports
            </h2>
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-0 rounded-none gap-1 flex flex-wrap">
              <TabsTrigger
                value="funnel"
                className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-[#1F1F23] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                Conversion Funnel
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-[#1F1F23] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                Event Timeline
              </TabsTrigger>
              <TabsTrigger
                value="cohorts"
                className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-[#1F1F23] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                Cohort Analysis
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-[#1F1F23] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                User Journeys
              </TabsTrigger>
              <TabsTrigger
                value="views"
                className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-[#1F1F23] data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                Views
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="funnel" className="mt-0">
              <FunnelChart data={funnelData?.funnel} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-0">
              <EventTimeline events={events} />
            </TabsContent>
            <TabsContent value="cohorts" className="mt-0">
              <CohortAnalysis />
            </TabsContent>
            <TabsContent value="users" className="mt-0">
              <UserJourneyTable users={funnelData?.users} />
            </TabsContent>
            <TabsContent value="views" className="mt-0">
              <ViewsTable />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
