"use client";

import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  Home,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DeliveryProgressProps {
  status: string;
  created_at: string;
  className?: string;
}

interface DeliveryStage {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const deliveryStages: DeliveryStage[] = [
  {
    id: "placed",
    name: "Order Placed",
    icon: CheckCircle,
    description: "Reservation confirmed",
  },
  {
    id: "processing",
    name: "Processing",
    icon: Clock,
    description: "Preparing for pickup",
  },
  {
    id: "picked_up",
    name: "Picked Up",
    icon: Package,
    description: "Wine collected from producer",
  },
  {
    id: "in_transit",
    name: "In Transit",
    icon: Truck,
    description: "On the way to delivery zone",
  },
  {
    id: "delivered",
    name: "Delivered",
    icon: Home,
    description: "Arrived at destination",
  },
];

export function DeliveryProgress({
  status,
  created_at,
  className = "",
}: DeliveryProgressProps) {
  // Helper function to calculate estimated delivery date
  const getEstimatedDeliveryDate = (created_at: string): string => {
    try {
      const createdDate = new Date(created_at);
      const estimatedDelivery = new Date(
        createdDate.getTime() + 14 * 24 * 60 * 60 * 1000,
      );
      return estimatedDelivery.toLocaleDateString();
    } catch (error) {
      console.error("Error calculating delivery date:", error);
      return "TBD";
    }
  };

  // Determine current stage based on status and time
  const getCurrentStage = (status: string, created_at: string): number => {
    try {
      const createdDate = new Date(created_at);
      const now = new Date();
      const daysSinceCreated = Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Map status to stage index
      const statusMap: { [key: string]: number } = {
        placed: 0,
        processing: 1,
        picked_up: 2,
        in_transit: 3,
        delivered: 4,
        cancelled: -1,
      };

      // If status is not explicitly set, estimate based on time
      if (statusMap[status] !== undefined) {
        return statusMap[status];
      }

      // Default progression based on time
      if (daysSinceCreated < 1) return 0; // Just placed
      if (daysSinceCreated < 3) return 1; // Processing
      if (daysSinceCreated < 7) return 2; // Picked up
      if (daysSinceCreated < 14) return 3; // In transit
      return 4; // Delivered (or should be)
    } catch (error) {
      console.error("Error calculating current stage:", error);
      return 0; // Default to first stage
    }
  };

  const currentStageIndex = getCurrentStage(status, created_at);
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertCircle className="w-5 h-5 text-red-500" />
        <span className="text-sm font-medium text-red-600">Cancelled</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress Bar */}
      <div className="relative flex items-center justify-between">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10" />

        {/* Progress line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-green-500 -z-10 transition-all duration-500"
          style={{
            width: `${(currentStageIndex / (deliveryStages.length - 1)) * 100}%`,
          }}
        />

        {deliveryStages.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isUpcoming = index > currentStageIndex;

          return (
            <div
              key={stage.id}
              className="flex flex-col items-center flex-1 relative"
            >
              {/* Icon */}
              <div
                className={`
                w-8 h-8 rounded-full flex items-center justify-center mb-2 relative z-10
                transition-all duration-300
                ${
                  isCompleted
                    ? "bg-green-500 text-white shadow-lg"
                    : isCurrent
                      ? "bg-blue-500 text-white shadow-lg animate-pulse"
                      : "bg-gray-200 text-gray-400"
                }
              `}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Stage Name */}
              <span
                className={`
                text-xs font-medium text-center max-w-16
                transition-colors duration-300
                ${isCompleted || isCurrent ? "text-gray-900" : "text-gray-400"}
              `}
              >
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current Status Description */}
      <div className="text-center">
        <Badge
          variant={currentStageIndex === 4 ? "default" : "secondary"}
          className={`
            transition-all duration-300
            ${
              currentStageIndex === 4
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-blue-100 text-blue-800 border-blue-200"
            }
          `}
        >
          {deliveryStages[currentStageIndex]?.description || "Processing"}
        </Badge>
      </div>

      {/* Estimated Timeline */}
      <div className="text-xs text-gray-500 text-center">
        {currentStageIndex < 4 ? (
          <span>
            Estimated delivery: {getEstimatedDeliveryDate(created_at)}
          </span>
        ) : (
          <span className="text-green-600 font-medium">
            ✓ Delivery completed
          </span>
        )}
      </div>
    </div>
  );
}
