"use client";

import { createContext, useContext, type ReactNode } from "react";

const DEFAULT_FEW_LEFT_THRESHOLD = 5;

type WineSettingsContextValue = {
  fewLeftThreshold: number;
};

const WineSettingsContext = createContext<WineSettingsContextValue>({
  fewLeftThreshold: DEFAULT_FEW_LEFT_THRESHOLD,
});

/**
 * Site-wide wine display settings from the server (not user-specific).
 * StockBadge and other consumers read this instead of fetching /api/wine-settings.
 */
export function WineSettingsProvider({
  fewLeftThreshold,
  children,
}: {
  fewLeftThreshold: number;
  children: ReactNode;
}) {
  return (
    <WineSettingsContext.Provider value={{ fewLeftThreshold }}>
      {children}
    </WineSettingsContext.Provider>
  );
}

export function useWineFewLeftThreshold(): number {
  return useContext(WineSettingsContext).fewLeftThreshold;
}
