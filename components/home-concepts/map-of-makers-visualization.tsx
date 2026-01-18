"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { X, Filter, Search, RotateCcw } from "lucide-react";

interface Wine {
  id: string;
  wine_name: string;
  vintage: string;
  color: string;
  handle: string;
  base_price_cents: number;
  label_image_path?: string;
}

interface Producer {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  reservedBottles: number;
  short_description?: string;
  logo_image_path?: string;
  address_city?: string;
  wines?: Wine[];
}

interface Zone {
  id: string;
  name: string;
  center_lat: number;
  center_lon: number;
  radius_km: number;
  zone_type: "delivery" | "pickup";
}

export function MapOfMakersVisualization() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapboxglRef = useRef<any>(null);
  const listenersAdded = useRef(false);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredProducer, setHoveredProducer] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [bottlesRange, setBottlesRange] = useState<[number, number]>([0, 200]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/admin/producers/map-data");
        if (response.ok) {
          const result = await response.json();
          if (result.producers && result.producers.length > 0) {
            setProducers(result.producers);
          } else {
            setProducers(getMockProducers());
          }
          if (result.zones && result.zones.length > 0) {
            setZones(result.zones);
          } else {
            setZones(getMockZones());
          }
        } else {
          setProducers(getMockProducers());
          setZones(getMockZones());
        }
      } catch (error) {
        console.error("Error fetching producer data:", error);
        setProducers(getMockProducers());
        setZones(getMockZones());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation - ESC to close popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedProducer) {
        setSelectedProducer(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedProducer]);

  const getMockProducers = (): Producer[] => {
    return [
      {
        id: "1",
        name: "Domaine de la Clape",
        region: "Languedoc",
        lat: 43.3444,
        lon: 3.2169,
        reservedBottles: 120,
        short_description: "Premium wines from Languedoc",
        address_city: "Béziers",
        logo_image_path: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
        wines: [
          {
            id: "w1",
            wine_name: "Domaine de la Clape Rouge",
            vintage: "2020",
            color: "red",
            handle: "domaine-clape-rouge-2020",
            base_price_cents: 14800,
            label_image_path: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
          },
        ],
      },
      {
        id: "2",
        name: "Le Bouc à Trois Pattes",
        region: "Languedoc",
        lat: 43.5,
        lon: 3.4,
        reservedBottles: 95,
        short_description: "Organic wines from Languedoc",
        address_city: "Montpellier",
        wines: [],
      },
      {
        id: "3",
        name: "Mas de la Seranne",
        region: "Languedoc",
        lat: 43.2,
        lon: 3.0,
        reservedBottles: 150,
        short_description: "Biodynamic wines",
        address_city: "Narbonne",
        wines: [],
      },
      {
        id: "4",
        name: "Domaine de l'Aigle",
        region: "Languedoc",
        lat: 43.1,
        lon: 3.1,
        reservedBottles: 122,
        short_description: "Traditional winemaking",
        address_city: "Carcassonne",
        wines: [],
      },
      {
        id: "5",
        name: "Domaine Roussillon",
        region: "Roussillon",
        lat: 42.7,
        lon: 2.9,
        reservedBottles: 87,
        short_description: "Catalan wines",
        address_city: "Perpignan",
        wines: [],
      },
    ];
  };

  const getMockZones = (): Zone[] => {
    return [
      {
        id: "zone-1",
        name: "Béziers 500 km",
        center_lat: 43.3444,
        center_lon: 3.2169,
        radius_km: 500,
        zone_type: "delivery",
      },
      {
        id: "zone-2",
        name: "Béziers Pickup Point",
        center_lat: 43.3444,
        center_lon: 3.2169,
        radius_km: 50,
        zone_type: "pickup",
      },
    ];
  };

  // Initialize Mapbox map
  useEffect(() => {
    // Wait for container to be ready
    const checkAndInit = () => {
      if (!mapContainer.current) {
        setTimeout(checkAndInit, 100);
        return;
      }
      
      if (map.current) {
        return;
      }

      // Container is ready, proceed with initialization
      initMap();
    };

    const initMap = async () => {
      try {
        // Import CSS dynamically
        await import("mapbox-gl/dist/mapbox-gl.css");
        
        const mapboxgl = (await import("mapbox-gl")).default;
        mapboxglRef.current = mapboxgl;

        // Set Mapbox access token (optional - can use free OSM style without token)
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        
        // Always use OSM tiles (free, no token required)
        // Only use Mapbox style if token is explicitly provided
        let mapStyle: string | object;
        
        if (mapboxToken) {
          // Use Mapbox style if token is provided
          mapboxgl.accessToken = mapboxToken;
          mapStyle = "mapbox://styles/mapbox/light-v11";
        } else {
          // Use OSM tiles (no token required)
          // Don't set accessToken at all to avoid auth errors
          // Set a dummy token to prevent Mapbox from trying to authenticate
          mapboxgl.accessToken = "pk.dummy";
          mapStyle = {
            version: 8,
            sources: {
              "osm-tiles": {
                type: "raster",
                tiles: [
                  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                ],
                tileSize: 256,
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              },
            },
            layers: [
              {
                id: "osm-layer",
                type: "raster",
                source: "osm-tiles",
                minzoom: 0,
                maxzoom: 19,
              },
            ],
          };
        }

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: mapStyle,
          center: [3.2, 43.3], // Languedoc-Roussillon center
          zoom: 7.5,
          minZoom: 6,
          maxZoom: 15,
        });

        map.current.on("load", () => {
          // Small delay to ensure map is fully ready
          setTimeout(() => {
            setMapLoaded(true);
          }, 100);
        });

        map.current.on("error", (e: any) => {
          // Silently ignore authentication/authorization errors when using OSM tiles
          // These are expected when using a dummy token with OSM
          if (
            e.error &&
            (e.error.message?.includes("token") ||
              e.error.message?.includes("Access Token") ||
              e.error.message?.includes("Unauthorized") ||
              e.error.message?.includes("Forbidden"))
          ) {
            return; // Silently ignore auth errors when using OSM
          }
          // Only log non-auth errors
          if (e.error && !e.error.message?.includes("CORS")) {
            console.error("Map error:", e);
          }
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      } catch (error) {
        console.error("Error initializing map:", error);
        setLoading(false);
      }
    };

    // Start initialization check
    checkAndInit();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Filter producers based on filters
  const filteredProducers = useMemo(() => {
    return producers.filter((producer) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          producer.name.toLowerCase().includes(query) ||
          producer.region?.toLowerCase().includes(query) ||
          producer.address_city?.toLowerCase().includes(query) ||
          producer.short_description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Region filter
      if (selectedRegions.length > 0 && !selectedRegions.includes(producer.region)) {
        return false;
      }

      // Color filter (check if producer has wines with selected colors)
      if (selectedColors.length > 0) {
        const producerColors = producer.wines?.map((w) => w.color.toLowerCase()) || [];
        const hasSelectedColor = selectedColors.some((color) =>
          producerColors.includes(color.toLowerCase())
        );
        if (!hasSelectedColor) return false;
      }

      // Price range filter (check if producer has wines in price range)
      if (producer.wines && producer.wines.length > 0) {
        const minPrice = priceRange[0] * 100; // Convert to cents
        const maxPrice = priceRange[1] * 100;
        const hasWineInRange = producer.wines.some(
          (wine) => wine.base_price_cents >= minPrice && wine.base_price_cents <= maxPrice
        );
        if (!hasWineInRange) return false;
      }

      // Reserved bottles filter
      if (
        producer.reservedBottles < bottlesRange[0] ||
        producer.reservedBottles > bottlesRange[1]
      ) {
        return false;
      }

      return true;
    });
  }, [producers, searchQuery, selectedRegions, selectedColors, priceRange, bottlesRange]);

  // Get unique regions and max values for sliders
  const uniqueRegions = useMemo(() => {
    return Array.from(new Set(producers.map((p) => p.region).filter(Boolean)));
  }, [producers]);

  const maxPrice = useMemo(() => {
    return Math.max(
      ...producers.flatMap((p) => p.wines?.map((w) => w.base_price_cents / 100) || [0]),
      1000
    );
  }, [producers]);

  const maxBottles = useMemo(() => {
    return Math.max(...producers.map((p) => p.reservedBottles), 200);
  }, [producers]);

  // Add producers as markers using GeoJSON source and layers (better for map following)
  useEffect(() => {
    if (!map.current || !mapLoaded || filteredProducers.length === 0) {
      return;
    }

    // Wait for map to be fully ready
    if (!map.current.isStyleLoaded()) {
      const waitForStyle = () => {
        if (map.current && map.current.isStyleLoaded()) {
          addProducersLayer();
        } else {
          setTimeout(waitForStyle, 100);
        }
      };
      waitForStyle();
      return;
    }

    addProducersLayer();

    function addProducersLayer() {
      if (!map.current) return;

      // Remove existing layers first (before removing source)
      if (map.current.getLayer("producers-circles")) {
        map.current.removeLayer("producers-circles");
      }
      if (map.current.getLayer("producers-clusters")) {
        map.current.removeLayer("producers-clusters");
      }
      
      // Remove source if it exists
      if (map.current.getSource("producers")) {
        map.current.removeSource("producers");
      }

      // Create GeoJSON data from filtered producers
      const features = filteredProducers
        .filter((producer) => {
          // Verify coordinates are valid
          return (
            typeof producer.lat === "number" &&
            typeof producer.lon === "number" &&
            !isNaN(producer.lat) &&
            !isNaN(producer.lon) &&
            producer.lat >= -90 &&
            producer.lat <= 90 &&
            producer.lon >= -180 &&
            producer.lon <= 180
          );
        })
        .map((producer) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [producer.lon, producer.lat], // [lng, lat]
          },
          properties: {
            id: producer.id,
            name: producer.name,
            reservedBottles: producer.reservedBottles,
          },
        }));

      // Add source with clustering (always create new source after removal)
      try {
        map.current.addSource("producers", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features,
          },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Wait for source to be ready before adding layers
        const source = map.current.getSource("producers") as any;
        if (source) {
          // Wait for source to load
          const addLayersWhenReady = () => {
            if (!map.current) return;
            
            const sourceCheck = map.current.getSource("producers") as any;
            if (!sourceCheck || !sourceCheck.loaded) {
              setTimeout(addLayersWhenReady, 50);
              return;
            }
            // Add cluster circles layer
            try {
              if (map.current.getLayer("producers-clusters")) {
                map.current.removeLayer("producers-clusters");
              }
              if (!map.current.getSource("producers")) {
                console.error("Source 'producers' not found when trying to add layers");
                return;
              }
              map.current.addLayer({
                id: "producers-clusters",
                type: "circle",
                source: "producers",
                filter: ["has", "point_count"],
                paint: {
                  "circle-color": "#000",
                  "circle-radius": [
                    "step",
                    ["get", "point_count"],
                    20,
                    10, 30,
                    30, 40,
                  ],
                  "circle-stroke-width": 3,
                  "circle-stroke-color": "#fff",
                  "circle-opacity": 0.8,
                },
              });
            } catch (error) {
              console.error("Error adding cluster layer:", error);
            }

            // Skip cluster count labels - they require fonts that may not be available
            // Clusters will still work without text labels

            // Add circle layer for individual markers
            try {
              if (map.current.getLayer("producers-circles")) {
                map.current.removeLayer("producers-circles");
              }
              map.current.addLayer({
                id: "producers-circles",
                type: "circle",
                source: "producers",
                filter: ["!", ["has", "point_count"]],
                paint: {
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["get", "reservedBottles"],
                    0, 10,
                    50, 15,
                    100, 20,
                    150, 25,
                  ],
                  "circle-color": [
                    "case",
                    ["==", ["get", "reservedBottles"], 0], "#666",
                    ["<", ["get", "reservedBottles"], 50], "#444",
                    ["<", ["get", "reservedBottles"], 100], "#222",
                    "#000",
                  ],
                  "circle-stroke-width": 4,
                  "circle-stroke-color": "#fff",
                  "circle-opacity": 1,
                },
              });
            } catch (error) {
              console.error("Error adding circles layer:", error);
            }

            // Add click handler for clusters - zoom in (only once)
            if (!listenersAdded.current && map.current) {
              map.current.on("click", "producers-clusters", (e: any) => {
          const features = map.current.queryRenderedFeatures(e.point, {
            layers: ["producers-clusters"],
          });
          const clusterId = features[0].properties.cluster_id;
          (map.current.getSource("producers") as any).getClusterExpansionZoom(
            clusterId,
            (err: any, zoom: number) => {
              if (err) return;
              map.current.easeTo({
                center: (features[0].geometry as any).coordinates,
                zoom: zoom,
                duration: 500,
              });
            }
              );
              });

              // Add click handler - show detailed popup
              map.current.on("click", "producers-circles", (e: any) => {
          if (e.features && e.features.length > 0) {
            const producerId = e.features[0].properties.id;
            const producer = filteredProducers.find((p) => p.id === producerId);
            if (producer) {
              setSelectedProducer(producer);
              // Smooth zoom to producer
              map.current.easeTo({
                center: [producer.lon, producer.lat],
                zoom: Math.min(map.current.getZoom() + 1, 12),
                duration: 500,
              });
              }
            }
          });

          // Add hover effect for individual markers
          map.current.on("mouseenter", "producers-circles", () => {
            map.current!.getCanvas().style.cursor = "pointer";
          });

          map.current.on("mouseleave", "producers-circles", () => {
            map.current!.getCanvas().style.cursor = "";
          });

          // Add hover effect for clusters
          map.current.on("mouseenter", "producers-clusters", () => {
            map.current!.getCanvas().style.cursor = "pointer";
          });

          map.current.on("mouseleave", "producers-clusters", () => {
            map.current!.getCanvas().style.cursor = "";
          });

          // Add hover to show producer info
          map.current.on("mousemove", "producers-circles", (e: any) => {
            if (e.features && e.features.length > 0) {
              const producerId = e.features[0].properties.id;
              setHoveredProducer(producerId);
            }
          });

          map.current.on("mouseleave", "producers-circles", () => {
            setHoveredProducer(null);
          });

            listenersAdded.current = true;
          }
          };
          
          // Start checking for source readiness
          addLayersWhenReady();
        }
      } catch (error) {
        console.error("Error adding source:", error);
        return;
      }
    }

    return () => {
      if (map.current) {
        // Remove event listeners
        try {
          map.current.off("click", "producers-circles");
          map.current.off("click", "producers-clusters");
          map.current.off("mouseenter", "producers-circles");
          map.current.off("mouseleave", "producers-circles");
          map.current.off("mousemove", "producers-circles");
          map.current.off("mouseenter", "producers-clusters");
          map.current.off("mouseleave", "producers-clusters");
          listenersAdded.current = false;
        } catch (e) {
          // Ignore errors if layers don't exist
        }

        // Remove layers and source
        if (map.current.getLayer("producers-circles")) {
          map.current.removeLayer("producers-circles");
        }
        if (map.current.getLayer("producers-clusters")) {
          map.current.removeLayer("producers-clusters");
        }
        if (map.current.getSource("producers")) {
          map.current.removeSource("producers");
        }
      }
    };
  }, [mapLoaded, filteredProducers]);

  // Add zones as circles - DISABLED (user requested to remove)
  useEffect(() => {
    // Zones are disabled - return early
    return;
    
    if (!map.current || !mapLoaded || zones.length === 0) {
      return;
    }

    const sources: string[] = [];
    const layers: string[] = [];

    for (const zone of zones) {
      const sourceId = `zone-source-${zone.id}`;
      const layerId = `zone-layer-${zone.id}`;
      const hoverLayerId = `zone-hover-${zone.id}`;

      // Convert radius from km to approximate degrees (rough conversion)
      // 1 degree latitude ≈ 111 km
      const radiusDegrees = zone.radius_km / 111;

      // Create circle geometry
      const circle = createCircle([zone.center_lon, zone.center_lat], radiusDegrees, 64);

      // Add source
      try {
        // Remove existing source if it exists
        if (map.current!.getSource(sourceId)) {
          try {
            if (map.current!.getLayer(`zone-layer-${zone.id}`)) {
              map.current!.removeLayer(`zone-layer-${zone.id}`);
            }
            if (map.current!.getLayer(`zone-hover-${zone.id}`)) {
              map.current!.removeLayer(`zone-hover-${zone.id}`);
            }
            map.current!.removeSource(sourceId);
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        map.current!.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [circle],
            },
          },
        });
        sources.push(sourceId);

        // Small delay to ensure source is ready
        setTimeout(() => {
          if (!map.current) return;

          // Add layer with better colors
          try {
            if (map.current.getLayer(layerId)) {
              map.current.removeLayer(layerId);
            }
            map.current.addLayer({
        id: layerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": zone.zone_type === "delivery" ? "#000" : "#4a5568",
              "fill-opacity": 0.08,
            },
            });
            layers.push(layerId);
          } catch (error) {
            console.error(`Error adding zone layer ${layerId}:`, error);
            return;
          }

          // Add outline with better visibility
          try {
            if (map.current.getLayer(hoverLayerId)) {
              map.current.removeLayer(hoverLayerId);
            }
            map.current.addLayer({
        id: hoverLayerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": zone.zone_type === "delivery" ? "#000" : "#4a5568",
          "line-width": zone.zone_type === "delivery" ? 2.5 : 1.5,
          "line-dasharray": zone.zone_type === "pickup" ? [3, 3] : undefined,
              "line-opacity": 0.4,
            },
            });
            layers.push(hoverLayerId);
          } catch (error) {
            console.error(`Error adding zone hover layer ${hoverLayerId}:`, error);
            return;
          }

          // Add click handler for zones
          try {
            map.current.on("click", layerId, () => {
        setHoveredZone(zone.id);
        // Smooth zoom to zone center
        map.current!.easeTo({
          center: [zone.center_lon, zone.center_lat],
          zoom: Math.min(map.current!.getZoom() + 0.5, 10),
          duration: 500,
            });
            });
          } catch (error) {
            console.error(`Error adding zone click handler ${layerId}:`, error);
          }

          // Add hover effect
          try {
            map.current.on("mouseenter", layerId, () => {
              setHoveredZone(zone.id);
              map.current!.setPaintProperty(layerId, "fill-opacity", 0.15);
              map.current!.setPaintProperty(hoverLayerId, "line-opacity", 0.7);
              map.current!.getCanvas().style.cursor = "pointer";
            });

            map.current.on("mouseleave", layerId, () => {
              setHoveredZone(null);
              map.current!.setPaintProperty(layerId, "fill-opacity", 0.08);
              map.current!.setPaintProperty(hoverLayerId, "line-opacity", 0.4);
              map.current!.getCanvas().style.cursor = "";
            });
          } catch (error) {
            console.error(`Error adding zone hover handlers ${layerId}:`, error);
          }
        }, 50);
      } catch (error) {
        console.error(`Error adding zone source ${sourceId}:`, error);
      }
    }

    return () => {
      // Remove event listeners first
      zones.forEach((zone) => {
        const layerId = `zone-layer-${zone.id}`;
        try {
          map.current?.off("click", layerId);
          map.current?.off("mouseenter", layerId);
          map.current?.off("mouseleave", layerId);
        } catch (e) {
          // Ignore errors
        }
      });

      // Remove layers
      layers.forEach((layerId) => {
        try {
          if (map.current?.getLayer(layerId)) {
            map.current.removeLayer(layerId);
          }
        } catch (e) {
          // Ignore errors
        }
      });

      // Remove sources
      sources.forEach((sourceId) => {
        try {
          if (map.current?.getSource(sourceId)) {
            map.current.removeSource(sourceId);
          }
        } catch (e) {
          // Ignore errors
        }
      });
    };
  }, [mapLoaded, zones]);

  // Helper function to create circle geometry
  const createCircle = (center: [number, number], radius: number, segments: number): [number, number][] => {
    const points: [number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const lat = center[1] + radius * Math.cos(angle);
      const lon = center[0] + (radius * Math.sin(angle)) / Math.cos((center[1] * Math.PI) / 180);
      points.push([lon, lat]);
    }
    return points;
  };

  // Helper function to generate producer handle from name
  const getProducerHandle = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, "-");
  };

  if (loading) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-muted/30 rounded-2xl border border-border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Laddar karta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[600px] bg-muted/30 rounded-2xl overflow-hidden border border-border">
      {/* Map container */}
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: '600px' }}
      />

      {/* Producer hover info overlay */}
      <AnimatePresence>
        {hoveredProducer && !selectedProducer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-4 text-xs max-w-sm text-center z-10"
          >
            <h4 className="font-medium text-foreground mb-1">
              {(producers.find((p) => p.id === hoveredProducer) || {}).name}
            </h4>
            <p className="text-muted-foreground">
              {(producers.find((p) => p.id === hoveredProducer) || {}).reservedBottles}{" "}
              flaskor reserverade
            </p>
            <p className="text-muted-foreground text-[10px] mt-1">
              Klicka för mer information
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed producer popup */}
      <AnimatePresence>
        {selectedProducer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedProducer(null);
              }
            }}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="bg-background border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative p-6 border-b border-border">
                <button
                  onClick={() => setSelectedProducer(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
                  aria-label="Stäng"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="flex items-start gap-4 pr-8">
                  {selectedProducer.logo_image_path && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={selectedProducer.logo_image_path}
                        alt={selectedProducer.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-foreground mb-1">
                      <Link
                        href={`/shop/${getProducerHandle(selectedProducer.name)}`}
                        className="hover:underline transition-colors"
                        onClick={() => setSelectedProducer(null)}
                      >
                        {selectedProducer.name}
                      </Link>
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{selectedProducer.region}</span>
                      {selectedProducer.address_city && (
                        <>
                          <span>•</span>
                          <span>{selectedProducer.address_city}</span>
                        </>
                      )}
                    </div>
                    {selectedProducer.short_description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedProducer.short_description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-foreground">Viner</h3>
                    <span className="text-sm text-muted-foreground">
                      {selectedProducer.reservedBottles} flaskor reserverade
                    </span>
                  </div>
                  
                  {selectedProducer.wines && selectedProducer.wines.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedProducer.wines.map((wine) => (
                        <Link
                          key={wine.id}
                          href={`/product/${wine.handle}`}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                        >
                          {wine.label_image_path && (
                            <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={wine.label_image_path}
                                alt={wine.wine_name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground group-hover:underline truncate">
                              {wine.wine_name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {wine.vintage} • {wine.color}
                            </p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {Math.round(wine.base_price_cents / 100)} SEK
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Inga viner tillgängliga för denna producent
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone info overlay */}
      <AnimatePresence>
        {hoveredZone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-4 text-xs max-w-sm text-center z-10"
          >
            <h4 className="font-medium text-foreground mb-1">
              {(zones.find((z) => z.id === hoveredZone) || {}).name}
            </h4>
            <p className="text-muted-foreground">
              {(zones.find((z) => z.id === hoveredZone) || {}).radius_km} km{" "}
              {(zones.find((z) => z.id === hoveredZone) || {}).zone_type === "delivery"
                ? "delivery"
                : "pickup"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter panel */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 hover:bg-background transition-colors flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter</span>
          {(selectedRegions.length > 0 ||
            selectedColors.length > 0 ||
            priceRange[0] > 0 ||
            priceRange[1] < maxPrice ||
            bottlesRange[0] > 0 ||
            bottlesRange[1] < maxBottles ||
            searchQuery) && (
            <span className="w-2 h-2 bg-foreground rounded-full"></span>
          )}
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 w-80 max-h-[70vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">Filter</h3>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedRegions([]);
                    setSelectedColors([]);
                    setPriceRange([0, maxPrice]);
                    setBottlesRange([0, maxBottles]);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Återställ
                </button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Sök
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Sök producenter..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
              </div>

              {/* Region filter */}
              <div className="mb-4">
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Region
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uniqueRegions.map((region) => (
                    <label
                      key={region}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRegions.includes(region)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRegions([...selectedRegions, region]);
                          } else {
                            setSelectedRegions(
                              selectedRegions.filter((r) => r !== region)
                            );
                          }
                        }}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-muted-foreground">{region}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Color filter */}
              <div className="mb-4">
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Vintyp
                </label>
                <div className="space-y-2">
                  {["red", "white", "rosé"].map((color) => (
                    <label
                      key={color}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColors.includes(color)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedColors([...selectedColors, color]);
                          } else {
                            setSelectedColors(
                              selectedColors.filter((c) => c !== color)
                            );
                          }
                        }}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-muted-foreground capitalize">{color}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div className="mb-4">
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Pris: {priceRange[0]} - {priceRange[1]} SEK
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([parseInt(e.target.value), priceRange[1]])
                    }
                    className="w-full"
                  />
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], parseInt(e.target.value)])
                    }
                    className="w-full"
                  />
                </div>
              </div>

              {/* Bottles range */}
              <div className="mb-4">
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Reserverade flaskor: {bottlesRange[0]} - {bottlesRange[1]}
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={maxBottles}
                    value={bottlesRange[0]}
                    onChange={(e) =>
                      setBottlesRange([parseInt(e.target.value), bottlesRange[1]])
                    }
                    className="w-full"
                  />
                  <input
                    type="range"
                    min="0"
                    max={maxBottles}
                    value={bottlesRange[1]}
                    onChange={(e) =>
                      setBottlesRange([bottlesRange[0], parseInt(e.target.value)])
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                {filteredProducers.length} av {producers.length} producenter
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


    </div>
  );
}
