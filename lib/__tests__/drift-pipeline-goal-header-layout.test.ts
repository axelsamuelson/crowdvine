import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * Pipeline goal headers must stack below Tailwind `sm` (640px) and keep the
 * single-row desktop layout from `sm` and up.
 */
describe("Drift pipeline goal header mobile layout", () => {
  const src = readFileSync(
    resolve(
      process.cwd(),
      "components/admin/operations/drift/drift-overview-client.tsx",
    ),
    "utf8",
  )

  it("stacks goal header below sm without a three-column mobile row", () => {
    expect(src).toMatch(
      /flex w-full flex-col gap-1 px-4 py-3 text-left sm:flex-row sm:items-center sm:gap-2/,
    )
    expect(src).toMatch(/whitespace-nowrap font-semibold/)
    expect(src).toMatch(/hidden min-w-0 text-sm text-gray-500 sm:inline/)
    expect(src).toMatch(/pl-6 text-sm text-gray-500 sm:hidden/)
    expect(src).toMatch(
      /pl-6 text-xs text-gray-500 sm:ml-auto sm:pl-0 sm:shrink-0/,
    )
  })

  it("keeps the desktop em-dash title only from sm and up", () => {
    expect(src).toMatch(/— \{obj\.title\}/)
    expect(src).toMatch(/sm:inline/)
    // Mobile full title has no leading dash
    expect(src).toMatch(
      /pl-6 text-sm text-gray-500 sm:hidden[\s\S]{0,80}\{obj\.title\}/,
    )
  })
})
