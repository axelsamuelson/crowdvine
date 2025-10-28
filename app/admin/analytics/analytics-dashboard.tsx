"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FunnelChart } from "./components/funnel-chart";
import { EventTimeline } from "./components/event-timeline";
import { CohortAnalysis } from "./components/cohort-analysis";
import { UserJourneyTable } from "./components/user-journey-table";
import { MetricsCards } from "./components/metrics-cards";

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

        console.log("Funnel data:", funnel);
        console.log("Events data:", eventsData);

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
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <MetricsCards data={funnelData?.funnel} />

      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="timeline">Event Timeline</TabsTrigger>
          <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
          <TabsTrigger value="users">User Journeys</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-4">
          <FunnelChart data={funnelData?.funnel} />
        </TabsContent>

        <TabsContent value="timeline">
          <EventTimeline events={events} />
        </TabsContent>

        <TabsContent value="cohorts">
          <CohortAnalysis />
        </TabsContent>

        <TabsContent value="users">
          <UserJourneyTable users={funnelData?.users} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
