"use client";

import dynamic from "next/dynamic";

// Dynamically import MapOfMakersVisualization to prevent SSR issues with Mapbox
const MapOfMakersVisualization = dynamic(
  () =>
    import("./map-of-makers-visualization").then(
      (mod) => mod.MapOfMakersVisualization
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-muted/30 rounded-2xl border border-border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Laddar karta...</p>
        </div>
      </div>
    ),
  }
);

export function MapClientWrapper() {
  return <MapOfMakersVisualization />;
}


