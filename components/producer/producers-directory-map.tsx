"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyMapboxAccessToken,
  getMapboxGl,
  getMapStyle,
  ignoreMapboxAuthErrors,
  preloadMapboxGl,
  safeRemoveMapboxMap,
} from "@/lib/mapbox-client";
import { hasValidGeoCoords } from "@/lib/geo-distance";
import { resolveManyProducerCoordinates } from "@/lib/producer-geocode-client";
import { cn } from "@/lib/utils";

export type ProducersDirectoryMapItem = {
  id: string;
  name: string;
  href: string;
  lat?: number | null;
  lon?: number | null;
  region?: string | null;
  subregion?: string | null;
};

type ResolvedProducer = ProducersDirectoryMapItem & {
  lat: number;
  lon: number;
  approximate?: boolean;
};

type Props = {
  producers: ProducersDirectoryMapItem[];
  className?: string;
  /** When set, that producer’s marker is emphasized (profile pages). */
  highlightedProducerId?: string | null;
};

function toResolved(
  producer: ProducersDirectoryMapItem,
  approximate: boolean,
): ResolvedProducer | null {
  if (!hasValidGeoCoords(producer.lat, producer.lon)) return null;
  return {
    ...producer,
    lat: producer.lat!,
    lon: producer.lon!,
    approximate,
  };
}

function resolveKnown(
  producers: ProducersDirectoryMapItem[],
): ResolvedProducer[] {
  return producers
    .map((producer) => toResolved(producer, false))
    .filter((producer): producer is ResolvedProducer => producer != null);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Full-bleed Mapbox panel for the public /producers directory. */
export function ProducersDirectoryMap({
  producers,
  className,
  highlightedProducerId = null,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [resolvedProducers, setResolvedProducers] = useState<ResolvedProducer[]>(
    () => resolveKnown(producers),
  );
  const [mapReady, setMapReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const producersKey = useMemo(
    () =>
      producers
        .map(
          (p) =>
            `${p.id}:${p.lat},${p.lon}:${p.subregion}:${p.region}:${p.href}`,
        )
        .sort()
        .join("|"),
    [producers],
  );

  useEffect(() => {
    preloadMapboxGl();
  }, []);

  useEffect(() => {
    const known = resolveKnown(producers);
    setResolvedProducers(known);

    const needsGeocode = producers.filter(
      (producer) => !hasValidGeoCoords(producer.lat, producer.lon),
    );
    if (needsGeocode.length === 0) {
      setGeocoding(false);
      return;
    }

    let cancelled = false;
    setGeocoding(true);

    void resolveManyProducerCoordinates(needsGeocode).then((results) => {
      if (cancelled) return;

      const geocoded: ResolvedProducer[] = [];
      for (const result of results) {
        if ("unresolved" in result) continue;
        geocoded.push({
          ...result.producer,
          lat: result.lat,
          lon: result.lon,
          approximate: result.approximate,
        });
      }

      setResolvedProducers([...known, ...geocoded]);
      setGeocoding(false);
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
        "outdoors",
      );
      applyMapboxAccessToken(mapboxgl, accessToken);

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: mapContainer.current,
          style,
          center: [3.2, 43.3],
          zoom: 7.5,
          minZoom: 5,
          maxZoom: 14,
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
          const isHighlighted = producer.id === highlightedProducerId;
          const el = document.createElement("div");
          el.className = cn(
            "cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-md",
            isHighlighted
              ? "flex h-5 w-5 bg-foreground ring-2 ring-foreground/30"
              : "flex h-3.5 w-3.5",
            !isHighlighted &&
              (producer.approximate
                ? "border-dashed bg-amber-400"
                : "bg-sky-600"),
          );
          el.title = producer.name;

          const meta = [producer.subregion, producer.region]
            .filter(Boolean)
            .join(" · ");
          const popup = new mapboxgl.Popup({
            offset: 12,
            closeButton: false,
            maxWidth: "220px",
          }).setHTML(
            `<div style="font:13px/1.4 system-ui,sans-serif;padding:2px 0">
              <a href="${escapeHtml(producer.href)}" style="color:inherit;font-weight:600;text-decoration:underline;text-underline-offset:3px">
                ${escapeHtml(producer.name)}
              </a>
              ${
                meta
                  ? `<div style="margin-top:2px;color:#78716c;font-size:12px">${escapeHtml(meta)}</div>`
                  : ""
              }
            </div>`,
          );

          const marker = new mapboxgl.Marker({
            element: el,
            zIndexOffset: isHighlighted ? 10 : 0,
          })
            .setLngLat([producer.lon, producer.lat])
            .setPopup(popup)
            .addTo(mapRef.current);

          markersRef.current.push(marker);
          bounds.extend([producer.lon, producer.lat]);
        }

        if (resolvedProducers.length === 1) {
          mapRef.current.easeTo({
            center: [resolvedProducers[0].lon, resolvedProducers[0].lat],
            zoom: 9,
            duration: 300,
          });
        } else {
          mapRef.current.fitBounds(bounds, {
            padding: 56,
            maxZoom: 10,
            duration: 300,
          });
        }

        mapRef.current.resize();
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
  }, [resolvedProducers, highlightedProducerId]);

  useEffect(() => {
    return () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      safeRemoveMapboxMap(mapRef.current);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.resize();
  }, [mapReady]);

  if (resolvedProducers.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950 text-sm text-white/50",
          className,
        )}
      >
        {geocoding ? "Hämtar positioner…" : "Karta saknas"}
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div ref={mapContainer} className="h-full w-full bg-muted/30" />
      {!mapReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 text-sm text-muted-foreground">
          Laddar karta…
        </div>
      ) : null}
      <div className="absolute bottom-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
        {resolvedProducers.length} producenter
      </div>
    </div>
  );
}
