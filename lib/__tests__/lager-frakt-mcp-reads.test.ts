import { describe, expect, it, vi } from "vitest";
import { previewOutboundFreight } from "@/lib/admin/lager-frakt-reads";
import { registerLagerFraktReadTools } from "@/lib/mcp/tools/lager-frakt";

describe("Lager & Frakt MCP read tools", () => {
  it("registers all PR B read tool names", () => {
    const registered: string[] = [];
    const server = {
      registerTool: (name: string) => {
        registered.push(name);
      },
    };
    registerLagerFraktReadTools(
      server as never,
      {} as never,
    );
    expect(registered).toEqual(
      expect.arrayContaining([
        "list_geo_zones",
        "get_geo_zone",
        "list_shipping_regions",
        "get_shipping_region",
        "list_customer_shipping_rates",
        "list_freight_catalogue",
        "preview_outbound_freight",
        "list_pickup_zones",
        "get_pickup_zone",
        "list_pallet_freight_quotes",
        "list_b2b_producer_status",
      ]),
    );
    expect(registered).toHaveLength(11);
  });

  it("preview_outbound_freight dry-run returns SEK breakdown (admin calculator)", () => {
    const breakdown = previewOutboundFreight({
      destination_country: "SE",
      bottle_count: 6,
      max_bottles: 6,
      length_m: 0.3,
      width_m: 0.2,
      height_m: 0.35,
      as_of_date: "2026-08-01",
    });
    expect(breakdown.currency).toBe("SEK");
    expect(typeof breakdown.totalAmountCents).toBe("number");
    expect(breakdown.canCalculate === true || Array.isArray(breakdown.incompleteReasons)).toBe(
      true,
    );
  });

  it("list_pallets / get_pallet stay registered via registerPalletTools", async () => {
    const { registerPalletTools } = await import("@/lib/mcp/tools/pallets");
    const registered: string[] = [];
    const server = {
      registerTool: (name: string, _meta: unknown, handler?: unknown) => {
        registered.push(name);
        void handler;
      },
    };
    registerPalletTools(server as never, {
      from: vi.fn(),
    } as never);
    expect(registered).toContain("list_pallets");
    expect(registered).toContain("get_pallet");
  });
});
