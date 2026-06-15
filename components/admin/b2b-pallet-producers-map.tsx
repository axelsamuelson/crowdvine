"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getMapboxGl,
  getMapStyle,
  ignoreMapboxAuthErrors,
  preloadMapboxGl,
} from "@/lib/mapbox-client";
import { hasValidGeoCoords } from "@/lib/geo-distance";
import { resolveManyProducerCoordinates } from "@/lib/producer-geocode-client";
import { cn } from "@/lib/utils";

export type B2bPalletMapProducerInput = {
  id: string;
  name: string;
  lat?: number | null;
  lon?: number | null;
  bottles: number;
  isPickup: boolean;
  subregion?: string | null;
  region?: string | null;
};

export type B2bPalletMapProducer = B2bPalletMapProducerInput & {
  lat: number;
  lon: number;
  approximate?: boolean;
};

type Props = {
  producers: B2bPalletMapProducerInput[];
  missingLocationNames?: string[];
  className?: string;
};

function toResolvedProducer(
  producer: B2bPalletMapProducerInput,
  approximate: boolean,
): B2bPalletMapProducer | null {
  if (!hasValidGeoCoords(producer.lat, producer.lon)) return null;
  return {
    ...producer,
    lat: producer.lat!,
    lon: producer.lon!,
    approximate,
  };
}

function resolveKnownProducers(
  producers: B2bPalletMapProducerInput[],
): B2bPalletMapProducer[] {
  return producers
    .map((producer) => toResolvedProducer(producer, false))
    .filter((producer): producer is B2bPalletMapProducer => producer != null);
}

export function B2bPalletProducersMap({
  producers,
  missingLocationNames = [],
  className,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [resolvedProducers, setResolvedProducers] = useState<
    B2bPalletMapProducer[]
  >(() => resolveKnownProducers(producers));
  const [unresolvedNames, setUnresolvedNames] = useState<string[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const producersKey = useMemo(
    () =>
      producers
        .map(
          (p) =>
            `${p.id}:${p.lat},${p.lon}:${p.isPickup}:${p.bottles}:${p.subregion}:${p.region}`,
        )
        .sort()
        .join("|"),
    [producers],
  );

  useEffect(() => {
    preloadMapboxGl();
  }, []);

  useEffect(() => {
    const known = resolveKnownProducers(producers);
    setResolvedProducers(known);

    const needsGeocode = producers.filter(
      (producer) => !hasValidGeoCoords(producer.lat, producer.lon),
    );
    if (needsGeocode.length === 0) {
      setUnresolvedNames([]);
      return;
    }

    let cancelled = false;

    void resolveManyProducerCoordinates(needsGeocode).then((results) => {
      if (cancelled) return;

      const geocoded: B2bPalletMapProducer[] = [];
      const unresolved: string[] = [];

      for (const result of results) {
        if ("unresolved" in result) {
          unresolved.push(result.producer.name);
          continue;
        }
        geocoded.push({
          ...result.producer,
          lat: result.lat,
          lon: result.lon,
          approximate: result.approximate,
        });
      }

      setResolvedProducers([...known, ...geocoded]);
      setUnresolvedNames(unresolved);
    });

    return () => {
      cancelled = true;
    };
  }, [producersKey, producers]);

  useEffect(() => {
    if (!mapContainer.current || resolvedProducers.length === 0) return;

    let cancelled = false;
    setMapReady(false);

    const init = async () => {
      const mapboxgl = await getMapboxGl();
      if (cancelled || !mapContainer.current) return;

      const { accessToken, style } = getMapStyle(
        process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      );
      mapboxgl.accessToken = accessToken;

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: mapContainer.current,
          style,
          center: [3.2, 43.3],
          zoom: 7.5,
          minZoom: 5,
          maxZoom: 15,
          fadeDuration: 0,
        });

        mapRef.current.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          "top-right",
        );
        ignoreMapboxAuthErrors(mapRef.current);
      }

      const renderMarkers = () => {
        if (!mapRef.current) return;

        for (const marker of markersRef.current) {
          marker.remove();
        }
        markersRef.current = [];

        const bounds = new mapboxgl.LngLatBounds();

        for (const producer of resolvedProducers) {
          const el = document.createElement("div");
          el.className = cn(
            "flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow-md",
            producer.isPickup
              ? "bg-green-500 ring-2 ring-green-300"
              : producer.approximate
                ? "border-dashed bg-amber-400"
                : "bg-sky-600",
          );
          el.title = producer.name;

          const popup = new mapboxgl.Popup({
            offset: 12,
            closeButton: false,
            className: "b2b-pallet-map-popup",
          }).setHTML(
            `<div style="font: 13px/1.4 system-ui,sans-serif;padding:2px 0">
              <strong>${producer.name}</strong><br/>
              ${producer.bottles} flaskor${
                producer.isPickup
                  ? "<br/><span style='color:#16a34a'>Upphämtningsplats</span>"
                  : producer.approximate
                    ? "<br/><span style='color:#d97706'>Uppskattad position (subregion)</span>"
                    : ""
              }
            </div>`,
          );

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([producer.lon, producer.lat])
            .setPopup(popup)
            .addTo(mapRef.current);

          markersRef.current.push(marker);
          bounds.extend([producer.lon, producer.lat]);
        }

        if (resolvedProducers.length === 1) {
          mapRef.current.easeTo({
            center: [resolvedProducers[0].lon, resolvedProducers[0].lat],
            zoom: 10,
            duration: 300,
          });
        } else if (resolvedProducers.length > 1) {
          mapRef.current.fitBounds(bounds, {
            padding: 48,
            maxZoom: 11,
            duration: 300,
          });
        }

        if (!cancelled) setMapReady(true);
      };

      if (mapRef.current.loaded()) {
        renderMarkers();
      } else {
        mapRef.current.once("load", renderMarkers);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [resolvedProducers]);

  useEffect(() => {
    return () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const allMissing = [...missingLocationNames, ...unresolvedNames];

  if (producers.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400",
          className,
        )}
      >
        Inga producenter på pallen.
      </div>
    );
  }

  if (resolvedProducers.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400",
          className,
        )}
      >
        {allMissing.length > 0 ? (
          <>
            Hämtar kartpositioner…
            <p className="mt-2 text-xs">
              Saknar koordinater: {allMissing.join(", ")}
            </p>
          </>
        ) : (
          "Hämtar kartpositioner…"
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700">
        <div ref={mapContainer} className="h-64 w-full sm:h-72 bg-muted/30" />
        {!mapReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 text-sm text-gray-500 dark:text-zinc-400">
            Laddar karta…
          </div>
        ) : null}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 rounded-md bg-white/90 px-2 py-1 text-xs shadow-sm dark:bg-zinc-900/90">
          <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-zinc-300">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" />
            Producent
          </span>
          <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-zinc-300">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-amber-600 bg-amber-400" />
            Uppskattad
          </span>
          <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-zinc-300">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 ring-1 ring-green-300" />
            Upphämtningsplats
          </span>
        </div>
      </div>
      {allMissing.length > 0 ? (
        <p className={hintClass}>
          Saknar kartposition: {allMissing.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

const hintClass = "text-xs text-gray-500 dark:text-zinc-400";
