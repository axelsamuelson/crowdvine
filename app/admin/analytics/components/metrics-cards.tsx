"use client";

import { Card } from "@/components/ui/card";
import { Users, TrendingUp, ShoppingCart, CheckCircle } from "lucide-react";

interface MetricsCardsProps {
  data: any;
}

export function MetricsCards({ data }: MetricsCardsProps) {
  if (!data) return null;

  const overallConversion = data.total_users > 0
    ? ((data.reservation_completed / data.total_users) * 100).toFixed(1)
    : 0;

  const metrics = [
    {
      title: "Total Users",
      value: data.total_users,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Overall Conversion",
      value: `${overallConversion}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Added to Cart",
      value: data.first_add_to_cart,
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Reservations",
      value: data.reservation_completed,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{metric.title}</p>
                <p className="text-3xl font-bold mt-2">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <Icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
