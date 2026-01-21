"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MapTopoThemeProvider, useMapTopoTheme } from "./theme-provider";

function ShellInner({ children }: { children: React.ReactNode }) {
  const { theme } = useMapTopoTheme();

  return (
    <div className={cn("map-topo-theme min-h-screen")} data-theme={theme}>
      {children}
    </div>
  );
}

export function MapTopoShell({
  children,
  defaultTheme,
}: {
  children: React.ReactNode;
  defaultTheme?: "dark" | "light";
}) {
  return (
    <MapTopoThemeProvider defaultTheme={defaultTheme}>
      <ShellInner>{children}</ShellInner>
    </MapTopoThemeProvider>
  );
}

