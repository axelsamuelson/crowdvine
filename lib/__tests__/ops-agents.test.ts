import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  formatOpsCompanyLabel,
  getOpsAgentByAgentId,
  isOpsAgentCompany,
  isOpsCompany,
  listOpsAgents,
  parseTaskSourceMarker,
  resolveInheritedCompany,
} from "@/lib/operations/ops-agents"

const fromMock = vi.fn()
const getSupabaseAdminMock = vi.fn(() => ({ from: fromMock }))

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}))

function chainable(result: { data: unknown; error: null | { message: string } }) {
  const api: Record<string, unknown> = {}
  const self = () => api
  api.select = vi.fn(self)
  api.order = vi.fn(self)
  api.eq = vi.fn(self)
  api.in = vi.fn(self)
  api.maybeSingle = vi.fn(async () => result)
  api.then = undefined
  // Make awaitable as a PostgrestBuilder-like thenable
  Object.assign(api, {
    then(
      resolve: (v: { data: unknown; error: null | { message: string } }) => unknown,
    ) {
      return Promise.resolve(result).then(resolve)
    },
  })
  return api
}

describe("ops company helpers", () => {
  it("validates company enums", () => {
    expect(isOpsCompany("pact")).toBe(true)
    expect(isOpsCompany("dirtywine")).toBe(true)
    expect(isOpsCompany("both")).toBe(false)
    expect(isOpsAgentCompany("both")).toBe(true)
    expect(isOpsAgentCompany("other")).toBe(false)
  })

  it("formats Swedish labels without raw DB keys", () => {
    expect(formatOpsCompanyLabel("pact")).toBe("PACT")
    expect(formatOpsCompanyLabel("dirtywine")).toBe("Dirty Wine")
    expect(formatOpsCompanyLabel("both")).toBe("Båda")
    expect(formatOpsCompanyLabel(null)).toBe("PACT")
  })

  it("resolves inherited company: explicit → project → pact", () => {
    expect(
      resolveInheritedCompany({ company: "dirtywine", projectCompany: "pact" }),
    ).toBe("dirtywine")
    expect(resolveInheritedCompany({ company: null, projectCompany: "dirtywine" })).toBe(
      "dirtywine",
    )
    expect(resolveInheritedCompany({ company: "weird", projectCompany: null })).toBe(
      "pact",
    )
    expect(resolveInheritedCompany({})).toBe("pact")
  })
})

describe("parseTaskSourceMarker", () => {
  it("parses PR and ops_agent_log markers on the first line only", () => {
    expect(parseTaskSourceMarker("källa: PR #233\nbody")).toEqual({
      kind: "pr",
      prNumber: 233,
    })
    expect(
      parseTaskSourceMarker(
        "källa: ops_agent_log 4d64093d-6485-4e65-9479-b73eb5551ddc\nmore",
      ),
    ).toEqual({
      kind: "ops_agent_log",
      logId: "4d64093d-6485-4e65-9479-b73eb5551ddc",
    })
  })

  it("rejects near-misses and markers not on the first line", () => {
    expect(parseTaskSourceMarker("källa: pr #233")).toBeNull()
    expect(parseTaskSourceMarker("källa: log 4d64093d-6485-4e65-9479-b73eb5551ddc")).toBeNull()
    expect(parseTaskSourceMarker("intro\nkälla: PR #233")).toBeNull()
    expect(parseTaskSourceMarker(null)).toBeNull()
  })
})

describe("listOpsAgents / getOpsAgentByAgentId", () => {
  beforeEach(() => {
    fromMock.mockReset()
    getSupabaseAdminMock.mockClear()
  })

  it("lists active agents ordered by name and maps rows", async () => {
    const row = {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Hugo",
      agent_id: "hugo",
      company: "both",
      area: "CTO",
      active: true,
      created_at: "2026-11-13T00:00:00Z",
      updated_at: "2026-11-13T00:00:00Z",
    }
    const api = chainable({ data: [row], error: null })
    fromMock.mockReturnValue(api)

    const agents = await listOpsAgents()
    expect(fromMock).toHaveBeenCalledWith("ops_agents")
    expect(api.eq).toHaveBeenCalledWith("active", true)
    expect(agents).toEqual([
      {
        id: row.id,
        name: "Hugo",
        agent_id: "hugo",
        company: "both",
        area: "CTO",
        active: true,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    ])
  })

  it("filters brand agents including both", async () => {
    const api = chainable({ data: [], error: null })
    fromMock.mockReturnValue(api)
    await listOpsAgents({ company: "pact" })
    expect(api.in).toHaveBeenCalledWith("company", ["pact", "both"])
  })

  it("loads one agent by agent_id", async () => {
    const row = {
      id: "22222222-2222-2222-2222-222222222222",
      name: "Elsa",
      agent_id: "elsa",
      company: "both",
      area: null,
      active: true,
      created_at: "2026-11-13T00:00:00Z",
      updated_at: "2026-11-13T00:00:00Z",
    }
    const api = chainable({ data: row, error: null })
    fromMock.mockReturnValue(api)
    const agent = await getOpsAgentByAgentId("elsa")
    expect(api.eq).toHaveBeenCalledWith("agent_id", "elsa")
    expect(agent?.name).toBe("Elsa")
  })

  it("returns null when agent_id is missing", async () => {
    const api = chainable({ data: null, error: null })
    fromMock.mockReturnValue(api)
    await expect(getOpsAgentByAgentId("missing")).resolves.toBeNull()
  })
})
