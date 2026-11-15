import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * Fokus month trend must not use the wide min-w table below Tailwind `sm`
 * (640px), so 390px viewports have no horizontal scroll.
 */
describe("Drift Fokus month trend mobile layout", () => {
  const src = readFileSync(
    resolve(
      process.cwd(),
      "components/admin/operations/drift/fokus-tab.tsx",
    ),
    "utf8",
  )

  it("stacks week rows below sm and keeps the desktop table from sm up", () => {
    expect(src).toMatch(/data-fokus-trend-mobile/)
    expect(src).toMatch(/data-fokus-trend-desktop/)
    expect(src).toMatch(
      /className="space-y-3 sm:hidden" data-fokus-trend-mobile/,
    )
    expect(src).toMatch(
      /className="hidden overflow-x-auto sm:block" data-fokus-trend-desktop/,
    )
    expect(src).toMatch(/min-w-\[36rem\]/)
    expect(src).toMatch(/mål 1–2:/)
  })

  it("stacks effect metric weeks below sm", () => {
    expect(src).toMatch(/mt-2 space-y-1 sm:hidden/)
    expect(src).toMatch(
      /mt-2 hidden grid-cols-6 gap-1[\s\S]*?sm:grid/,
    )
  })
})
