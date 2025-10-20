"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Navigation,
  Users,
  Clock,
} from "lucide-react";

interface ZoneDetailsProps {
  zoneId: string;
  zoneName: string;
  zoneType: "pickup" | "delivery";
  centerLat?: number;
  centerLon?: number;
  radiusKm?: number;
  countryCode?: string;
}

export function ZoneDetails({
  zoneId,
  zoneName,
  zoneType,
  centerLat,
  centerLon,
  radiusKm,
  countryCode,
}: ZoneDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const zoneTypeInfo = {
    pickup: {
      title: "Pickup Zone",
      description: "Where wines are collected from producers",
      icon: <Navigation className="w-4 h-4 text-gray-600" />,
    },
    delivery: {
      title: "Delivery Zone",
      description: "Where wines are delivered to customers",
      icon: <MapPin className="w-4 h-4 text-gray-600" />,
    },
  };

  const info = zoneTypeInfo[zoneType];

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-2 rounded-lg bg-gray-100">{info.icon}</div>
            <div>
              <div className="font-semibold text-gray-900">{zoneName}</div>
              <div className="text-xs text-gray-600 font-normal">
                {info.title}
              </div>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1"
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
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{info.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {centerLat && centerLon && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Coordinates</div>
                    <div className="text-sm text-gray-900 font-medium">
                      {centerLat.toFixed(4)}, {centerLon.toFixed(4)}
                    </div>
                  </div>
                </div>
              )}

              {radiusKm && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Range</div>
                    <div className="text-sm text-gray-900 font-medium">
                      {radiusKm}km radius
                    </div>
                  </div>
                </div>
              )}

              {countryCode && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Country</div>
                    <div className="text-sm text-gray-900 font-medium">
                      {countryCode}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-200">
              <Badge variant="outline" className="text-xs text-gray-600">
                Zone ID: {zoneId.substring(0, 8)}...
              </Badge>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
