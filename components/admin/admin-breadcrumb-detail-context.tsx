"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type Detail = { path: string; title: string }

type AdminBreadcrumbDetailContextValue = {
  detail: Detail | null
  setDetail: (next: Detail | null) => void
}

export const AdminBreadcrumbDetailContext =
  createContext<AdminBreadcrumbDetailContextValue | null>(null)

export function AdminBreadcrumbDetailProvider({
  children,
}: {
  children: ReactNode
}) {
  const [detail, setDetailState] = useState<Detail | null>(null)
  const setDetail = useCallback((next: Detail | null) => {
    setDetailState(next)
  }, [])

  const value = useMemo(
    () => ({ detail, setDetail }),
    [detail, setDetail]
  )

  return (
    <AdminBreadcrumbDetailContext.Provider value={value}>
      {children}
    </AdminBreadcrumbDetailContext.Provider>
  )
}

export function useAdminBreadcrumbDetail(): AdminBreadcrumbDetailContextValue {
  const v = useContext(AdminBreadcrumbDetailContext)
  if (!v) {
    throw new Error(
      "useAdminBreadcrumbDetail must be used within AdminBreadcrumbDetailProvider"
    )
  }
  return v
}

export function useOptionalAdminBreadcrumbDetail(): AdminBreadcrumbDetailContextValue | null {
  return useContext(AdminBreadcrumbDetailContext)
}
