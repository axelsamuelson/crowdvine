"use client";

import { useEffect, useRef, useState } from "react";
import {
  getMapboxGl,
  getMapStyle,
  ignoreMapboxAuthErrors,
  preloadMapboxGl,
} from "@/lib/mapbox-client";
import { cn } from "@/lib/utils";

type Props = {
  lat: number;
  lon: number;
  name: string;
  approximate?: boolean;
  className?: string;
};

const DEFAULT_ZOOM = 8;
const PDP_MAP_STYLE = "satellite" as const;

export function WineProducerMapboxMap({
  lat,
  lon,
  name,
  approximate = false,
  className,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

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
      mapboxgl.accessToken = accessToken;

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

        mapRef.current.scrollZoom.disable();
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
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div ref={mapContainer} className="h-52 w-full sm:h-60 bg-muted/30" />
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
