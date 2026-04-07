"use client"

import { createContext, useContext } from "react"
import type { StrategyMapSubtreeFocus } from "./utils/subtree-focus"

export type StrategyMapFocusContextValue = {
  focus: StrategyMapSubtreeFocus | null
  toggleObjectiveFocus: (id: string) => void
  toggleProjectFocus: (id: string) => void
  clearFocus: () => void
}

const StrategyMapFocusContext =
  createContext<StrategyMapFocusContextValue | null>(null)

export function StrategyMapFocusProvider({
  value,
  children,
}: {
  value: StrategyMapFocusContextValue
  children: React.ReactNode
}) {
  return (
    <StrategyMapFocusContext.Provider value={value}>
      {children}
    </StrategyMapFocusContext.Provider>
  )
}

export function useStrategyMapFocus(): StrategyMapFocusContextValue {
  const v = useContext(StrategyMapFocusContext)
  if (!v) {
    throw new Error(
      "useStrategyMapFocus must be used within StrategyMapFocusProvider"
    )
  }
  return v
}
