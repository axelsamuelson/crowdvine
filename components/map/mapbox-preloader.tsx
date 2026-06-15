"use client";

import { useEffect } from "react";
import { preloadMapboxGl } from "@/lib/mapbox-client";

export function MapboxPreloader() {
  useEffect(() => {
    preloadMapboxGl();
  }, []);
  return null;
}
