"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Package, Truck, MapPin, BarChart3, Clock } from "lucide-react";

interface PalletDetailsProps {
  pallet: {
    id: string;
    name: string;
    currentBottles: number;
    maxBottles: number;
    remainingBottles: number;
    pickupZoneName: string;
    deliveryZoneName: string;
  };
}

export function PalletDetails({ pallet }: PalletDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const capacityPercentage = Math.round((pallet.currentBottles / pallet.maxBottles) * 100);
  const isAvailable = pallet.remainingBottles > 0;
  
  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card className={`border-l-4 ${isAvailable ? 'border-l-green-500' : 'border-l-red-500'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className={`p-2 rounded-lg ${isAvailable ? 'bg-green-100' : 'bg-red-100'}`}>
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold">{pallet.name}</div>
              <div className="text-sm text-gray-600 font-normal">
                {pallet.pickupZoneName} → {pallet.deliveryZoneName}
              </div>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Capacity Information */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Capacity</span>
                <span className="text-sm text-gray-600">{capacityPercentage}% full</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getCapacityColor(capacityPercentage)}`}
                  style={{ width: `${capacityPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{pallet.currentBottles} bottles</span>
                <span>{pallet.maxBottles} max</span>
              </div>
            </div>
            
            {/* Route Information */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-xs text-gray-500">Pickup Location</div>
                  <div className="text-sm font-medium">{pallet.pickupZoneName}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-xs text-gray-500">Delivery Area</div>
                  <div className="text-sm font-medium">{pallet.deliveryZoneName}</div>
                </div>
              </div>
            </div>
            
            {/* Availability Status */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Availability</span>
                </div>
                <Badge 
                  variant={isAvailable ? "default" : "destructive"}
                  className={isAvailable ? "bg-green-100 text-green-800" : ""}
                >
                  {isAvailable ? `${pallet.remainingBottles} bottles available` : "Full"}
                </Badge>
              </div>
            </div>
            
            {/* Pallet ID */}
            <div className="pt-2 border-t">
              <Badge variant="outline" className="text-xs">
                Pallet ID: {pallet.id.substring(0, 8)}...
              </Badge>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
