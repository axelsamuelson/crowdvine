"use client"

import { createContext, useContext, type ReactNode } from "react"

type EdgeDeleteContextValue = {
  onEdgeDeleteClick: (edgeId: string) => void
}

const EdgeDeleteContext = createContext<EdgeDeleteContextValue | null>(null)

export function EdgeDeleteProvider({
  children,
  onEdgeDeleteClick,
}: {
  children: ReactNode
  onEdgeDeleteClick: (edgeId: string) => void
}) {
  return (
    <EdgeDeleteContext.Provider value={{ onEdgeDeleteClick }}>
      {children}
    </EdgeDeleteContext.Provider>
  )
}

export function useEdgeDelete() {
  const ctx = useContext(EdgeDeleteContext)
  if (!ctx) {
    return { onEdgeDeleteClick: (_id: string) => {} }
  }
  return ctx
}
