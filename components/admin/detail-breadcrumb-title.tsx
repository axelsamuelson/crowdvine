"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useOptionalAdminBreadcrumbDetail } from "@/components/admin/admin-breadcrumb-detail-context"

/**
 * Sätter sista breadcrumb-etiketten till t.ex. task-/projektnamn (admin top bar).
 */
export function DetailBreadcrumbTitle({ title }: { title: string }) {
  const pathname = usePathname()
  const ctx = useOptionalAdminBreadcrumbDetail()
  /** Måste vara stabil ref från provider (useCallback) — inte hela `ctx`, den ändras när detail uppdateras och orsakar update loop. */
  const setDetail = ctx?.setDetail

  useEffect(() => {
    if (!setDetail) return
    const path = pathname ?? ""
    setDetail({ path, title })
    return () => setDetail(null)
  }, [pathname, title, setDetail])

  return null
}
