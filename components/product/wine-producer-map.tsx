"use client";

import { useEffect, useState } from "react";
import { isInMetropolitanFrance } from "@/lib/france-topo-map";
import { hasValidGeoCoords } from "@/lib/geo-distance";
import { resolveProducerCoordinates } from "@/lib/producer-geocode-client";
import { cn } from "@/lib/utils";
import { WineProducerMapboxMap } from "@/components/product/wine-producer-mapbox-map";
import { WineProducerTopoMap } from "@/components/product/wine-producer-topo-map";

export type WineProducerMapLocation = {
  name: string;
  lat?: number | null;
  lon?: number | null;
  subregion?: string | null;
  region?: string | null;
};

export type WineProducerMapVariant = "inline" | "panel";

type Props = {
  producer: WineProducerMapLocation;
  className?: string;
  variant?: WineProducerMapVariant;
};

type ResolvedCoords = {
  lat: number;
  lon: number;
  approximate: boolean;
};

function initialCoords(
  producer: WineProducerMapLocation,
): ResolvedCoords | null {
  if (!hasValidGeoCoords(producer.lat, producer.lon)) return null;
  return {
    lat: producer.lat!,
    lon: producer.lon!,
    approximate: false,
  };
}

export function WineProducerMap({
  producer,
  className,
  variant = "inline",
}: Props) {
  const [resolvedCoords, setResolvedCoords] = useState<ResolvedCoords | null>(
    () => initialCoords(producer),
  );
  const [topoFailed, setTopoFailed] = useState(false);
  const [geocoding, setGeocoding] = useState(
    () =>
      !initialCoords(producer) &&
      Boolean(producer.subregion || producer.region),
  );

  useEffect(() => {
    setTopoFailed(false);
  }, [producer.lat, producer.lon, producer.region, producer.name]);

  useEffect(() => {
    const known = initialCoords(producer);
    if (known) {
      setResolvedCoords(known);
      setGeocoding(false);
      return;
    }

    let cancelled = false;
    setGeocoding(true);

    void resolveProducerCoordinates(producer).then((coords) => {
      if (cancelled) return;
      setResolvedCoords(coords);
      setGeocoding(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    producer.lat,
    producer.lon,
    producer.subregion,
    producer.region,
    producer.name,
  ]);

  if (!resolvedCoords && !geocoding) return null;

  const useTopo =
    resolvedCoords &&
    !topoFailed &&
    isInMetropolitanFrance(resolvedCoords.lat, resolvedCoords.lon);

  const isPanel = variant === "panel";

  return (
    <div className={cn(isPanel ? "h-full w-full" : "space-y-2", className)}>
      <div
        className={cn(
          "overflow-hidden bg-card",
          isPanel
            ? "h-full w-full"
            : "rounded-none border-t border-border/60",
        )}
      >
        {geocoding ? (
          <div
            className={cn(
              "flex w-full items-center justify-center bg-muted/20 text-sm text-muted-foreground",
              isPanel ? "h-full" : "h-52 sm:h-60",
            )}
          >
            Hämtar position…
          </div>
        ) : resolvedCoords && useTopo ? (
          <WineProducerTopoMap
            lat={resolvedCoords.lat}
            lon={resolvedCoords.lon}
            name={producer.name}
            regionName={producer.region}
            approximate={resolvedCoords.approximate}
            variant={variant}
            onError={() => setTopoFailed(true)}
          />
        ) : resolvedCoords ? (
          <WineProducerMapboxMap
            lat={resolvedCoords.lat}
            lon={resolvedCoords.lon}
            name={producer.name}
            approximate={resolvedCoords.approximate}
            variant={variant}
          />
        ) : null}
      </div>
    </div>
  );
}
