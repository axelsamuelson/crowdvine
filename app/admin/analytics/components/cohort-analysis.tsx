"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function CohortAnalysis() {
  const [cohortData, setCohortData] = useState([]);

  useEffect(() => {
    const fetchCohorts = async () => {
      const res = await fetch("/api/admin/analytics/cohorts");
      const data = await res.json();
      setCohortData(data.cohorts || []);
    };

    fetchCohorts();
  }, []);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Cohort Retention Analysis</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={cohortData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="active_users"
            stroke="#3b82f6"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="converted_users"
            stroke="#22c55e"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
