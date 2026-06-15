"use client";

import * as d3 from "d3";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createFullFranceProjection,
  findRegionAtPoint,
  findRegionByName,
  FRANCE_MAJOR_CITIES,
  FRANCE_TOPO_HEIGHT,
  FRANCE_TOPO_WIDTH,
  generateDotsInFeature,
  getCode,
  getName,
  getRegionLabel,
  loadFranceRegions,
  type FranceGeoFeature,
  type FranceTopoDot,
} from "@/lib/france-topo-map";
import { cn } from "@/lib/utils";

type Props = {
  lat: number;
  lon: number;
  name: string;
  regionName?: string | null;
  approximate?: boolean;
  className?: string;
  onError?: () => void;
};

type ProjectedCity = {
  name: string;
  x: number;
  y: number;
};

type ProjectedRegionLabel = {
  code: string;
  name: string;
  x: number;
  y: number;
  isHighlighted: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const WHEEL_ZOOM_SENSITIVITY = 0.00035;

function getWheelZoomFactor(event: WheelEvent): number {
  let delta = event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
  else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= 400;

  const factor = Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY);
  return Math.max(0.97, Math.min(1.03, factor));
}

export function WineProducerTopoMap({
  lat,
  lon,
  name,
  regionName,
  approximate = false,
  className,
  onError,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomGroupRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);

  const [regions, setRegions] = useState<FranceGeoFeature[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void loadFranceRegions()
      .then((loaded) => {
        if (!cancelled) setRegions(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          onError?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onError]);

  const highlightedRegion = useMemo(() => {
    if (!regions) return null;
    return (
      findRegionAtPoint(regions, lon, lat) ??
      findRegionByName(regions, regionName)
    );
  }, [regions, lon, lat, regionName]);

  const projection = useMemo(() => {
    if (!regions?.length) return null;
    return createFullFranceProjection(regions);
  }, [regions]);

  const geoPath = useMemo(() => {
    if (!projection) return null;
    return d3.geoPath().projection(projection);
  }, [projection]);

  const highlightCode = highlightedRegion ? getCode(highlightedRegion) : null;

  const dotsByRegion = useMemo(() => {
    if (!regions || !projection || !geoPath) {
      return {} as Record<string, FranceTopoDot[]>;
    }

    const dots: Record<string, FranceTopoDot[]> = {};
    for (const region of regions) {
      const code = getCode(region);
      const area = geoPath.area(region as d3.GeoPermissibleObjects);
      const target = Math.min(320, Math.max(70, Math.round(area / 3200)));
      dots[code] = generateDotsInFeature(
        region,
        projection,
        geoPath,
        target,
      );
    }
    return dots;
  }, [regions, projection, geoPath]);

  const regionLabels = useMemo((): ProjectedRegionLabel[] => {
    if (!regions || !geoPath) return [];

    return regions
      .map((region) => {
        const code = getCode(region);
        const [x, y] = geoPath.centroid(region as d3.GeoPermissibleObjects);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

        return {
          code,
          name: getRegionLabel(getName(region)),
          x,
          y,
          isHighlighted: code === highlightCode,
        };
      })
      .filter((label): label is ProjectedRegionLabel => label != null);
  }, [regions, geoPath, highlightCode]);

  const cities = useMemo((): ProjectedCity[] => {
    if (!projection) return [];

    return FRANCE_MAJOR_CITIES.map((city) => {
      const projected = projection([city.lon, city.lat]);
      if (!projected) return null;
      const [x, y] = projected;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { name: city.name, x, y };
    }).filter((city): city is ProjectedCity => city != null);
  }, [projection]);

  const pin = useMemo(() => {
    if (!projection) return null;
    const projected = projection([lon, lat]);
    if (!projected) return null;
    const [x, y] = projected;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }, [projection, lon, lat]);

  useEffect(() => {
    if (!svgRef.current || !zoomGroupRef.current || !geoPath) return;

    const svgElement = svgRef.current;
    const svg = d3.select(svgElement);
    const zoomGroup = d3.select(zoomGroupRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [FRANCE_TOPO_WIDTH, FRANCE_TOPO_HEIGHT],
      ])
      .filter((event) => {
        // Wheel handled via non-passive native listener (React/Safari block preventDefault otherwise).
        if (event.type === "wheel") return false;
        if (event.type === "dblclick") return true;
        return (
          !event.button &&
          (event.type === "mousedown" ||
            event.type === "touchstart" ||
            event.type === "touchmove")
        );
      })
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform.toString());
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const factor = getWheelZoomFactor(event);
      const pointer = d3.pointer(event, svgElement);
      d3.select(svgElement).call(zoom.scaleBy, factor, pointer);
    };

    svgElement.addEventListener("wheel", handleWheel, { passive: false });
    setMapVisible(true);

    return () => {
      svg.on(".zoom", null);
      svgElement.removeEventListener("wheel", handleWheel);
      zoomBehaviorRef.current = null;
    };
  }, [geoPath]);

  const zoomBy = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const resetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  if (loadError) return null;

  if (!regions || !geoPath) {
    return (
      <div
        className={cn(
          "flex h-52 w-full items-center justify-center bg-muted/20 text-sm text-muted-foreground sm:h-60",
          className,
        )}
      >
        Laddar karta…
      </div>
    );
  }

  return (
    <div className={cn("relative text-foreground", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FRANCE_TOPO_WIDTH} ${FRANCE_TOPO_HEIGHT}`}
        className={cn(
          "h-52 w-full touch-none sm:h-60",
          "cursor-grab active:cursor-grabbing",
          mapVisible ? "opacity-100" : "opacity-0",
          "transition-opacity duration-300",
        )}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Karta över ${name}${highlightedRegion ? ` i ${getName(highlightedRegion)}` : ""}`}
      >
        <g ref={zoomGroupRef}>
          {regions.map((region) => {
            const code = getCode(region);
            const isHighlighted = code === highlightCode;

            return (
              <path
                key={`outline-${code}`}
                d={geoPath(region as d3.GeoPermissibleObjects) || ""}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={isHighlighted ? 2 : 1.1}
                opacity={isHighlighted ? 0.8 : 0.32}
              />
            );
          })}

          {regions.map((region) => {
            const code = getCode(region);
            const isHighlighted = code === highlightCode;
            const dots = dotsByRegion[code] || [];
            const baseOpacity = isHighlighted ? 0.58 : 0.16;

            return (
              <g key={`dots-${code}`} style={{ pointerEvents: "none" }}>
                {dots.map((dot, index) => (
                  <circle
                    key={index}
                    cx={dot.x}
                    cy={dot.y}
                    r={isHighlighted ? 1.25 : 1}
                    fill="currentColor"
                    opacity={baseOpacity}
                  />
                ))}
              </g>
            );
          })}

          {regionLabels.map((label) => (
            <text
              key={`region-label-${label.code}`}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="currentColor"
              opacity={label.isHighlighted ? 0.9 : 0.42}
              fontSize={label.isHighlighted ? 13 : 11}
              fontWeight={label.isHighlighted ? 600 : 500}
              style={{
                pointerEvents: "none",
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {label.name}
            </text>
          ))}

          {cities.map((city) => (
            <g key={`city-${city.name}`} style={{ pointerEvents: "none" }}>
              <circle
                cx={city.x}
                cy={city.y}
                r={2.2}
                fill="currentColor"
                opacity={0.55}
              />
              <text
                x={city.x + 7}
                y={city.y + 3}
                fill="currentColor"
                opacity={0.5}
                fontSize={10}
                fontWeight={500}
                style={{
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                }}
              >
                {city.name}
              </text>
            </g>
          ))}

          {pin ? (
            <g style={{ pointerEvents: "none" }}>
              <circle
                cx={pin.x}
                cy={pin.y}
                r={approximate ? 11 : 9}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                opacity={0.4}
              />
              <circle
                cx={pin.x}
                cy={pin.y}
                r={approximate ? 5 : 4.5}
                fill="currentColor"
                stroke="hsl(var(--background))"
                strokeWidth={2.25}
              />
            </g>
          ) : null}
        </g>
      </svg>

      <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-md border border-border/60 bg-background/90 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          aria-label="Zooma in"
          className="flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:bg-muted"
          onClick={() => zoomBy(1.35)}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Zooma ut"
          className="flex h-8 w-8 items-center justify-center border-t border-border/60 text-foreground transition-colors hover:bg-muted"
          onClick={() => zoomBy(1 / 1.35)}
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        className="absolute right-2 top-[4.75rem] rounded-md border border-border/60 bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground sm:top-[5.25rem]"
        onClick={resetZoom}
      >
        Återställ
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2">
        <div className="rounded-md bg-background/90 px-2 py-1 text-xs shadow-sm backdrop-blur-sm">
          {name}
        </div>
        {highlightedRegion ? (
          <div className="rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
            {getName(highlightedRegion)}
            {approximate ? " · uppskattad" : ""}
          </div>
        ) : null}
      </div>
    </div>
  );
}
