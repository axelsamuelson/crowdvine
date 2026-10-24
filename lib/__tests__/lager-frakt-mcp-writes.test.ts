import { describe, expect, it, vi } from "vitest";
import { requireConfirm } from "@/lib/mcp/utils/write-tool";
import { registerLagerFraktWriteTools } from "@/lib/mcp/tools/lager-frakt-writes";
import { registerPalletTools } from "@/lib/mcp/tools/pallets";

describe("Lager & Frakt MCP write tools", () => {
  it("requireConfirm blocks without confirm:true", () => {
    expect(() =>
      requireConfirm(
        { bottle_capacity: 600 },
        { whenPresent: ["bottle_capacity"], label: "Capacity change" },
      ),
    ).toThrow(/confirm: true/);
    expect(() =>
      requireConfirm(
        { bottle_capacity: 600, confirm: true },
        { whenPresent: ["bottle_capacity"] },
      ),
    ).not.toThrow();
  });

  it("registers config write tools", () => {
    const registered: string[] = [];
    registerLagerFraktWriteTools(
      { registerTool: (name: string) => registered.push(name) } as never,
      {} as never,
    );
    expect(registered).toEqual(
      expect.arrayContaining([
        "create_geo_zone",
        "update_geo_zone",
        "delete_geo_zone",
        "create_shipping_region",
        "update_shipping_region",
        "delete_shipping_region",
        "create_pickup_zone",
        "update_pickup_zone",
        "delete_pickup_zone",
        "create_customer_shipping_rate",
        "update_customer_shipping_rate",
        "create_freight_catalogue_entry",
        "update_freight_catalogue_entry",
        "create_pallet",
        "update_pallet",
        "delete_pallet",
        "select_pallet_freight_quote",
      ]),
    );
  });

  it("registers B2B write tools including refactored create", () => {
    const registered: string[] = [];
    registerPalletTools(
      {
        registerTool: (name: string) => {
          registered.push(name);
        },
      } as never,
      { from: vi.fn() } as never,
    );
    expect(registered).toEqual(
      expect.arrayContaining([
        "create_b2b_pallet",
        "add_wine_to_b2b_pallet",
        "update_b2b_pallet_item",
        "update_b2b_pallet",
        "delete_b2b_pallet",
        "update_b2b_producer_status",
        "replace_b2b_producer_wines",
        "create_b2b_share_link",
        "create_b2b_producer_share_link",
      ]),
    );
  });
});
