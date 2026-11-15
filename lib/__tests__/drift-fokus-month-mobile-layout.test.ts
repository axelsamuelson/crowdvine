import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * Fokus month trend must not use the wide min-w table below Tailwind `sm`
 * (640px), so 390px viewports have no horizontal scroll.
 * Effektmått shares the same week-column desktop grid; sparkline lives in Summa.
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
      /className="space-y-2 sm:hidden" data-fokus-trend-mobile/,
    )
    expect(src).toMatch(/data-fokus-trend-desktop/)
    expect(src).toMatch(/hidden overflow-x-auto sm:block/)
    expect(src).toMatch(/min-w-\[36rem\]/)
    // Mobile: week | stacked bar | total (text-xs = 12px)
    expect(src).toMatch(/text-xs font-medium tabular-nums/)
    expect(src).toMatch(/w-10 shrink-0 text-right text-xs tabular-nums/)
  })

  it("stacks effect metric weeks below sm and aligns desktop to week columns", () => {
    expect(src).toMatch(/data-fokus-effekt-desktop/)
    expect(src).toMatch(/space-y-4 sm:hidden/)
    expect(src).toMatch(/data-fokus-effekt-desktop/)
    expect(src).toMatch(/hidden overflow-x-auto sm:block[\s\S]*?data-fokus-effekt-desktop/)
    // Sparkline belongs in the Summa column, not a detached right float
    // (hidden when trendInsufficient — "För lite data för trend")
    expect(src).toMatch(/<th className="py-2 pl-3 font-medium">Summa<\/th>/)
    expect(src).toMatch(
      /<td className="py-2 pl-3 align-middle">[\s\S]*?\{!m\.trendInsufficient \? \([\s\S]*?<Sparkline values=\{m\.values\} \/>/,
    )
    expect(src).toMatch(/För lite data för trend/)
  })
})
