import { describe, expect, it, vi } from "vitest";
import {
  decidePalletShipReadinessSync,
} from "../pallet-completion";
import {
  derivePreShippingAutoStatus,
  computePalletShipProgress,
} from "../pallet-ship-progress";

describe("derivePreShippingAutoStatus — canonical fill", () => {
  it("0 bottles → open", () => {
    expect(
      derivePreShippingAutoStatus({ bottlesFilled: 0, minBottlesToShip: 120 }),
    ).toBe("open");
  });

  it("1 bottle → consolidating", () => {
    expect(
      derivePreShippingAutoStatus({ bottlesFilled: 1, minBottlesToShip: 120 }),
    ).toBe("consolidating");
  });

  it("30 bottles → consolidating (production regression)", () => {
    expect(
      derivePreShippingAutoStatus({ bottlesFilled: 30, minBottlesToShip: 120 }),
    ).toBe("consolidating");
  });

  it("119 bottles → consolidating", () => {
    expect(
      derivePreShippingAutoStatus({
        bottlesFilled: 119,
        minBottlesToShip: 120,
      }),
    ).toBe("consolidating");
  });

  it("120 bottles → complete", () => {
    expect(
      derivePreShippingAutoStatus({
        bottlesFilled: 120,
        minBottlesToShip: 120,
      }),
    ).toBe("complete");
  });

  it("720 bottles → complete (ready because >=120)", () => {
    expect(
      derivePreShippingAutoStatus({
        bottlesFilled: 720,
        minBottlesToShip: 120,
      }),
    ).toBe("complete");
    expect(computePalletShipProgress(720, 120, 720).isReadyToShip).toBe(true);
  });
});

describe("decidePalletShipReadinessSync — status integrity", () => {
  it("auto + 30 bottles + status open → align consolidating (zone metadata irrelevant)", () => {
    const d = decidePalletShipReadinessSync({
      status: "open",
      currentlyComplete: false,
      bottlesFilled: 30,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(d.action).toBe("align_status");
    expect(d.isReady).toBe(false);
    if (d.action === "align_status") {
      expect(d.nextStatus).toBe("consolidating");
    }
  });

  it("auto + 0 bottles + status consolidating → align open", () => {
    const d = decidePalletShipReadinessSync({
      status: "consolidating",
      currentlyComplete: false,
      bottlesFilled: 0,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(d.action).toBe("align_status");
    if (d.action === "align_status") {
      expect(d.nextStatus).toBe("open");
    }
  });

  it("auto + 30 already consolidating → noop", () => {
    const d = decidePalletShipReadinessSync({
      status: "consolidating",
      currentlyComplete: false,
      bottlesFilled: 30,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(d.action).toBe("noop");
  });

  it("manual + 30 + status open → readiness false, status preserved", () => {
    const d = decidePalletShipReadinessSync({
      status: "open",
      currentlyComplete: false,
      bottlesFilled: 30,
      minBottlesToShip: 120,
      statusMode: "manual",
    });
    expect(d.action).toBe("noop");
    expect(d.isReady).toBe(false);
  });

  it("manual + stale complete + 30 → revert readiness, do not force status", () => {
    const d = decidePalletShipReadinessSync({
      status: "open",
      currentlyComplete: true,
      bottlesFilled: 30,
      minBottlesToShip: 120,
      statusMode: "manual",
    });
    expect(d.action).toBe("revert");
    if (d.action === "revert") {
      expect(d.nextStatus).toBeNull();
    }
  });

  it("fill unavailable → no mutation decision", () => {
    const d = decidePalletShipReadinessSync({
      status: "open",
      currentlyComplete: true,
      bottlesFilled: 0,
      minBottlesToShip: 120,
      statusMode: "auto",
      fillUnavailable: true,
      fillError: "query failed",
    });
    expect(d.action).toBe("unavailable");
    expect(d.reverted).toBe(false);
    expect(d.becameReady).toBe(false);
  });

  it("shipping_ordered + 30 → locked", () => {
    expect(
      decidePalletShipReadinessSync({
        status: "shipping_ordered",
        currentlyComplete: true,
        bottlesFilled: 30,
        minBottlesToShip: 120,
      }).action,
    ).toBe("locked");
  });

  it("delivered + 30 → locked", () => {
    expect(
      decidePalletShipReadinessSync({
        status: "delivered",
        currentlyComplete: true,
        bottlesFilled: 30,
        minBottlesToShip: 120,
      }).action,
    ).toBe("locked");
  });

  it("cancelled + 30 → locked", () => {
    expect(
      decidePalletShipReadinessSync({
        status: "cancelled",
        currentlyComplete: true,
        bottlesFilled: 30,
        minBottlesToShip: 120,
      }).action,
    ).toBe("locked");
  });

  it("revert-shipping unlock: open + complete flag + 30 → consolidating", () => {
    const d = decidePalletShipReadinessSync({
      status: "open",
      currentlyComplete: true,
      bottlesFilled: 30,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(d.action).toBe("revert");
    if (d.action === "revert") {
      expect(d.nextStatus).toBe("consolidating");
    }
  });

  it("revert-shipping unlock: open + complete flag + 0 → open", () => {
    const d = decidePalletShipReadinessSync({
      status: "open",
      currentlyComplete: true,
      bottlesFilled: 0,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(d.action).toBe("revert");
    if (d.action === "revert") {
      expect(d.nextStatus).toBe("open");
    }
  });

  it("auto + 120 → complete action", () => {
    expect(
      decidePalletShipReadinessSync({
        status: "consolidating",
        currentlyComplete: false,
        bottlesFilled: 120,
        minBottlesToShip: 120,
        statusMode: "auto",
      }).action,
    ).toBe("complete");
  });
});

describe("sumReservedBottlesOnPalletResult — fail closed", () => {
  it("distinguishes query failure from real zero via Result type contract", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase-admin", () => ({
      getSupabaseAdmin: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              in: async () => ({
                data: null,
                error: { message: "simulated reservation query failure" },
              }),
            }),
          }),
        }),
      }),
    }));

    const { sumReservedBottlesOnPalletResult, sumReservedBottlesOnPallet } =
      await import("../pallet-fill-count");

    const result = await sumReservedBottlesOnPalletResult("pallet-x");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/simulated reservation query failure/);
    }

    await expect(sumReservedBottlesOnPallet("pallet-x")).rejects.toThrow(
      /simulated reservation query failure/,
    );

    // Fail-closed decision: unavailable must not look like empty pallet.
    const decision = decidePalletShipReadinessSync({
      status: "consolidating",
      currentlyComplete: true,
      bottlesFilled: 0,
      minBottlesToShip: 120,
      statusMode: "auto",
      fillUnavailable: true,
      fillError: "simulated reservation query failure",
    });
    expect(decision.action).toBe("unavailable");

    vi.doUnmock("@/lib/supabase-admin");
    vi.resetModules();
  });
});
