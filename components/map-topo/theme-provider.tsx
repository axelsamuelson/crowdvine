"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type MapTopoTheme = "dark" | "light";

type Ctx = {
  theme: MapTopoTheme;
  setTheme: (t: MapTopoTheme) => void;
  toggle: () => void;
};

const MapTopoThemeContext = createContext<Ctx | null>(null);

export function MapTopoThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "map-topo-theme",
}: {
  children: React.ReactNode;
  defaultTheme?: MapTopoTheme;
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<MapTopoTheme>(defaultTheme);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "dark" || stored === "light") setThemeState(stored);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = (t: MapTopoTheme) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(storageKey, t);
    } catch {
      // ignore
    }
  };

  const value = useMemo<Ctx>(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme],
  );

  return (
    <MapTopoThemeContext.Provider value={value}>
      {children}
    </MapTopoThemeContext.Provider>
  );
}

export function useMapTopoTheme() {
  const ctx = useContext(MapTopoThemeContext);
  if (!ctx) {
    throw new Error("useMapTopoTheme must be used within MapTopoThemeProvider");
  }
  return ctx;
}

