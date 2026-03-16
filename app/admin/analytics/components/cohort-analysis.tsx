"use client";

import { useEffect, useState } from "react";
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
    <div className="space-y-4 cohort-chart text-gray-700 dark:text-gray-300">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Cohort Retention Analysis
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={cohortData}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.4} />
          <XAxis dataKey="week" tick={{ fill: "currentColor", fontSize: 12 }} stroke="currentColor" />
          <YAxis tick={{ fill: "currentColor", fontSize: 12 }} stroke="currentColor" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              color: "#111",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
            wrapperClassName="cohort-tooltip"
          />
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
    </div>
  );
}
