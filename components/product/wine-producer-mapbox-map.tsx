"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyMapboxAccessToken,
  getMapboxGl,
  getMapStyle,
  ignoreMapboxAuthErrors,
  preloadMapboxGl,
  safeRemoveMapboxMap,
} from "@/lib/mapbox-client";
import { cn } from "@/lib/utils";

type Props = {
  lat: number;
  lon: number;
  name: string;
  approximate?: boolean;
  className?: string;
  variant?: "inline" | "panel";
};

const DEFAULT_ZOOM = 8;
const PDP_MAP_STYLE = "satellite" as const;

export function WineProducerMapboxMap({
  lat,
  lon,
  name,
  approximate = false,
  className,
  variant = "inline",
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const isPanel = variant === "panel";

  useEffect(() => {
    preloadMapboxGl();
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    let cancelled = false;
    setMapReady(false);

    const init = async () => {
      const mapboxgl = await getMapboxGl();
      if (cancelled || !mapContainer.current) return;

      const { accessToken, style } = getMapStyle(
        process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
        PDP_MAP_STYLE,
      );
      applyMapboxAccessToken(mapboxgl, accessToken);

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: mapContainer.current,
          style,
          center: [lon, lat],
          zoom: DEFAULT_ZOOM,
          minZoom: 6,
          maxZoom: 14,
          interactive: true,
          fadeDuration: 0,
        });

        if (isPanel) {
          mapRef.current.scrollZoom.enable();
        } else {
          mapRef.current.scrollZoom.disable();
        }
        mapRef.current.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          "top-right",
        );
        ignoreMapboxAuthErrors(mapRef.current);
      }

      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }

      const el = document.createElement("div");
      el.className = cn(
        "flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow-md",
        approximate ? "border-dashed bg-amber-400" : "bg-sky-600",
      );
      el.title = name;

      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(mapRef.current);

      const finish = () => {
        if (cancelled) return;
        mapRef.current?.easeTo({
          center: [lon, lat],
          zoom: DEFAULT_ZOOM,
          duration: 300,
        });
        setMapReady(true);
        // Panel maps need resize after sticky container settles
        mapRef.current?.resize();
      };

      if (mapRef.current.loaded()) {
        finish();
      } else {
        mapRef.current.once("load", finish);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [lat, lon, name, approximate]);

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      safeRemoveMapboxMap(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isPanel || !mapReady || !mapRef.current) return;
    mapRef.current.resize();
  }, [isPanel, mapReady]);

  return (
    <div className={cn("relative", isPanel && "h-full w-full", className)}>
      <div
        ref={mapContainer}
        className={cn(
          "w-full bg-muted/30",
          isPanel ? "h-full" : "h-52 sm:h-60",
        )}
      />
      {!mapReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 text-sm text-muted-foreground">
          Laddar karta…
        </div>
      ) : null}
      <div className="absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-1 text-xs shadow-sm backdrop-blur-sm">
        {name}
      </div>
    </div>
  );
}
