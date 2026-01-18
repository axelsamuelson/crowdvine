"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ActivityItem {
  id: string;
  timestamp: string;
  userName: string;
  city: string;
  bottles: number;
  producerName: string;
  wineName: string;
  palletName: string;
}

interface LiveStats {
  activeUsers: number;
  bottlesToday: number;
  activityFeed: ActivityItem[];
}

export function SocialVisualization() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/admin/activity/live");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // Use mock data
          setStats(getMockStats());
        }
      } catch (error) {
        console.error("Error fetching activity data:", error);
        setStats(getMockStats());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Rotate through activity feed
  useEffect(() => {
    if (!stats || stats.activityFeed.length === 0) return;

    const interval = setInterval(() => {
      setCurrentActivityIndex((prev) => (prev + 1) % stats.activityFeed.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [stats]);

  const getMockStats = (): LiveStats => {
    return {
      activeUsers: 47,
      bottlesToday: 234,
      activityFeed: [
        {
          id: "1",
          timestamp: new Date().toISOString(),
          userName: "Kim",
          city: "Stockholm",
          bottles: 3,
          producerName: "Le Bouc à Trois Pattes",
          wineName: "Rouge 2022",
          palletName: "Languedoc Early November",
        },
        {
          id: "2",
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          userName: "Lisa",
          city: "Göteborg",
          bottles: 6,
          producerName: "Domaine de la Clape",
          wineName: "Blanc 2023",
          palletName: "Languedoc Early November",
        },
        {
          id: "3",
          timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          userName: "Marcus",
          city: "Malmö",
          bottles: 2,
          producerName: "Mas de la Seranne",
          wineName: "Rosé 2022",
          palletName: "Languedoc Early November",
        },
        {
          id: "4",
          timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
          userName: "Emma",
          city: "Uppsala",
          bottles: 4,
          producerName: "Domaine de l'Aigle",
          wineName: "Rouge 2021",
          palletName: "Languedoc Early November",
        },
        {
          id: "5",
          timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          userName: "Anders",
          city: "Lund",
          bottles: 5,
          producerName: "Le Bouc à Trois Pattes",
          wineName: "Blanc 2023",
          palletName: "Roussillon Community Pick",
        },
      ],
    };
  };

  // Generate contributions graph data (last 7 days)
  const generateContributionsGraph = () => {
    const days = 7;
    const graph: { date: string; count: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      // Simulate activity count (in real app, this would come from API)
      const count = Math.floor(Math.random() * 20) + 5;
      graph.push({ date: dateStr, count });
    }

    return graph;
  };

  const contributions = generateContributionsGraph();
  const maxCount = Math.max(...contributions.map((c) => c.count));

  if (loading) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-muted/30 rounded-2xl border border-border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Laddar aktivitet...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-muted/30 rounded-2xl border border-border">
        <p className="text-sm text-muted-foreground">Ingen data tillgänglig</p>
      </div>
    );
  }

  const currentActivity = stats.activityFeed[currentActivityIndex];

  return (
    <div className="w-full h-full min-h-[600px] space-y-6">
      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/30 border border-border rounded-2xl p-6"
        >
          <p className="text-sm text-muted-foreground mb-2">Aktiva användare</p>
          <p className="text-3xl font-light text-foreground">{stats.activeUsers}</p>
          <p className="text-xs text-muted-foreground mt-1">Senaste 7 dagarna</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-muted/30 border border-border rounded-2xl p-6"
        >
          <p className="text-sm text-muted-foreground mb-2">Flaskor idag</p>
          <p className="text-3xl font-light text-foreground">{stats.bottlesToday}</p>
          <p className="text-xs text-muted-foreground mt-1">Reserverade just nu</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-muted/30 border border-border rounded-2xl p-6"
        >
          <p className="text-sm text-muted-foreground mb-2">Senaste aktivitet</p>
          <p className="text-lg font-light text-foreground">
            {stats.activityFeed.length} händelser
          </p>
          <p className="text-xs text-muted-foreground mt-1">Senaste 24 timmarna</p>
        </motion.div>
      </div>

      {/* Activity Feed */}
      <div className="bg-muted/30 border border-border rounded-2xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">
          Live aktivitet
        </h3>
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {currentActivity && (
              <motion.div
                key={currentActivity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-start gap-4 p-4 bg-background rounded-lg border border-border"
              >
                <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background text-sm font-medium flex-shrink-0">
                  {currentActivity.userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{currentActivity.userName}</span> från{" "}
                    <span className="font-medium">{currentActivity.city}</span> reserverade{" "}
                    <span className="font-medium">{currentActivity.bottles} flaskor</span> från{" "}
                    <span className="font-medium">{currentActivity.producerName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentActivity.palletName}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Activity list (last 5) */}
          <div className="space-y-2 mt-4">
            {stats.activityFeed.slice(1, 6).map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-2 text-sm text-muted-foreground"
              >
                <div className="w-6 h-6 rounded-full bg-foreground/20 flex items-center justify-center text-xs">
                  {activity.userName.charAt(0).toUpperCase()}
                </div>
                <span>
                  {activity.userName} reserverade {activity.bottles} flaskor från{" "}
                  {activity.producerName}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Contributions Graph */}
      <div className="bg-muted/30 border border-border rounded-2xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">
          Aktivitet senaste veckan
        </h3>
        <div className="flex items-end gap-2 h-32">
          {contributions.map((contribution, index) => {
            const height = (contribution.count / maxCount) * 100;
            const date = new Date(contribution.date);
            const dayName = date.toLocaleDateString("sv-SE", { weekday: "short" });

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="w-full bg-foreground rounded-t"
                  style={{ minHeight: "4px" }}
                />
                <span className="text-xs text-muted-foreground">{dayName}</span>
                <span className="text-xs text-muted-foreground">{contribution.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

