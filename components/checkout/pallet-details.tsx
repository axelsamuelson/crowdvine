"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  MapPin,
  BarChart3,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  calculateShippingCostPerBottle,
  formatShippingCost,
} from "@/lib/shipping-calculations";

interface PalletDetailsProps {
  pallet: {
    id: string;
    name: string;
    currentBottles: number;
    maxBottles: number;
    remainingBottles: number;
    pickupZoneName: string;
    deliveryZoneName: string;
    costCents: number;
  };
}

export function PalletDetails({ pallet }: PalletDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const capacityPercentage = Math.round(
    (pallet.currentBottles / pallet.maxBottles) * 100,
  );
  const isAvailable = pallet.remainingBottles > 0;
  const shippingCostPerBottle = calculateShippingCostPerBottle(
    pallet.costCents,
    pallet.maxBottles,
  );

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return "bg-gray-700";
    if (percentage >= 70) return "bg-gray-500";
    return "bg-gray-400";
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-2 rounded-lg bg-gray-100">
              <Package className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{pallet.name}</div>
              <div className="text-xs text-gray-600 font-normal">
                {pallet.pickupZoneName} → {pallet.deliveryZoneName}
              </div>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1"
            type="button"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Capacity Information */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-900">
                  Kapacitet
                </span>
                <span className="text-sm text-gray-600">
                  {capacityPercentage}% full
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getCapacityColor(capacityPercentage)}`}
                  style={{ width: `${capacityPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{pallet.currentBottles} flaskor</span>
                <span>{pallet.maxBottles} max</span>
              </div>
            </div>

            {/* Route Information */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Upphämtning</div>
                  <div className="text-sm text-gray-900 font-medium">
                    {pallet.pickupZoneName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Leverans</div>
                  <div className="text-sm text-gray-900 font-medium">
                    {pallet.deliveryZoneName}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Cost Information */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  Fraktkostnad
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pallkostnad:</span>
                  <span className="text-gray-900 font-medium">
                    {formatShippingCost(pallet.costCents)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Per flaska:</span>
                  <span className="text-gray-900 font-medium">
                    {formatShippingCost(shippingCostPerBottle)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Kostnad delat på {pallet.maxBottles} flaskor kapacitet
                </div>
              </div>
            </div>

            {/* Availability Status */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">Tillgänglighet</span>
                </div>
                <Badge variant="outline" className="text-gray-900">
                  {isAvailable
                    ? `${pallet.remainingBottles} flaskor kvar`
                    : "Full"}
                </Badge>
              </div>
            </div>

            {/* Pallet ID */}
            <div className="pt-2 border-t border-gray-200">
              <Badge variant="outline" className="text-xs text-gray-600">
                Pall-ID: {pallet.id.substring(0, 8)}...
              </Badge>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
