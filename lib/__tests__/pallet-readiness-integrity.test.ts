import { describe, expect, it } from "vitest";
import { decidePalletShipReadinessSync } from "../pallet-completion";
import { computePalletShipProgress } from "../pallet-ship-progress";
import { computePalletContributionProgress } from "../pallet-contribution";

describe("decidePalletShipReadinessSync — integrity", () => {
  it("119 bottles → not ready (noop when already consolidating)", () => {
    const d = decidePalletShipReadinessSync({
      status: "consolidating",
      currentlyComplete: false,
      bottlesFilled: 119,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(d.action).toBe("noop");
    expect(d.isReady).toBe(false);
  });

  it("30 bottles + open + auto → align consolidating (not open)", () => {
    const d = decidePalletShipReadinessSync({
      status: "open",
      currentlyComplete: false,
      bottlesFilled: 30,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(d.action).toBe("align_status");
    if (d.action === "align_status") {
      expect(d.nextStatus).toBe("consolidating");
    }
  });

  it("fill unavailable must not revert", () => {
    const d = decidePalletShipReadinessSync({
      status: "complete",
      currentlyComplete: true,
      bottlesFilled: 0,
      minBottlesToShip: 120,
      fillUnavailable: true,
      fillError: "db down",
    });
    expect(d.action).toBe("unavailable");
  });

  it("120 bottles → complete when not yet marked", () => {
    const d = decidePalletShipReadinessSync({
      status: "consolidating",
      currentlyComplete: false,
      bottlesFilled: 120,
      minBottlesToShip: 120,
    });
    expect(d.action).toBe("complete");
    expect(d.isReady).toBe(true);
  });

  it("120 → true then drop to 119 → revert before shipping", () => {
    const ready = decidePalletShipReadinessSync({
      status: "complete",
      currentlyComplete: true,
      bottlesFilled: 120,
      minBottlesToShip: 120,
    });
    expect(ready.action).toBe("noop");
    expect(ready.isReady).toBe(true);

    const drop = decidePalletShipReadinessSync({
      status: "complete",
      currentlyComplete: true,
      bottlesFilled: 119,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(drop.action).toBe("revert");
    expect(drop.isReady).toBe(false);
    if (drop.action === "revert") {
      expect(drop.nextStatus).toBe("consolidating");
    }
  });

  it("120 → true then drop to 30 → revert", () => {
    const drop = decidePalletShipReadinessSync({
      status: "consolidating",
      currentlyComplete: true,
      bottlesFilled: 30,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(drop.action).toBe("revert");
    expect(drop.isReady).toBe(false);
  });

  it("30 / 720 physical → not ready (capacity irrelevant)", () => {
    const ship = computePalletShipProgress(30, 120, 720);
    expect(ship.isReadyToShip).toBe(false);
    const d = decidePalletShipReadinessSync({
      status: "consolidating",
      currentlyComplete: false,
      bottlesFilled: 30,
      minBottlesToShip: 120,
    });
    expect(d.isReady).toBe(false);
  });

  it("720 / 720 → ready because >= 120, not because capacity", () => {
    const ship = computePalletShipProgress(720, 120, 720);
    expect(ship.isReadyToShip).toBe(true);
    expect(ship.minBottlesToShip).toBe(120);
  });

  it("economics irrelevant: 119 + funded → not ready; 120 + underfunded → ready", () => {
    const under = decidePalletShipReadinessSync({
      status: "consolidating",
      currentlyComplete: false,
      bottlesFilled: 119,
      minBottlesToShip: 120,
    });
    expect(under.isReady).toBe(false);
    const econReady = computePalletContributionProgress({
      bottlesFilled: 119,
      bottlesWithSnapshot: 119,
      accumulatedContributionCents: 999999,
      freightTargetCents: 100,
      minBottlesToShip: 120,
    });
    expect(econReady.isEconomicallyReady).toBe(true);

    const liveReady = decidePalletShipReadinessSync({
      status: "consolidating",
      currentlyComplete: false,
      bottlesFilled: 120,
      minBottlesToShip: 120,
    });
    expect(liveReady.action).toBe("complete");
    const econUnder = computePalletContributionProgress({
      bottlesFilled: 120,
      bottlesWithSnapshot: 120,
      accumulatedContributionCents: 1,
      freightTargetCents: 500000,
      minBottlesToShip: 120,
    });
    expect(econUnder.isEconomicallyReady).toBe(false);
  });

  it("shipping_ordered lock: fill drop does not revert", () => {
    const d = decidePalletShipReadinessSync({
      status: "shipping_ordered",
      currentlyComplete: true,
      bottlesFilled: 30,
      minBottlesToShip: 120,
    });
    expect(d.action).toBe("locked");
    expect(d.isReady).toBe(true);
  });

  it("explicit revert-shipping semantics: after unlock to open, 30 bottles → revert", () => {
    // After admin sets status open, sync runs with unlocked status.
    const d = decidePalletShipReadinessSync({
      status: "open",
      currentlyComplete: true,
      bottlesFilled: 30,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(d.action).toBe("revert");
    expect(d.isReady).toBe(false);
    if (d.action === "revert") {
      expect(d.nextStatus).toBe("consolidating");
    }
  });

  it("admin delete 120 → 114 before shipping → revert", () => {
    const d = decidePalletShipReadinessSync({
      status: "complete",
      currentlyComplete: true,
      bottlesFilled: 114,
      minBottlesToShip: 120,
      statusMode: "auto",
    });
    expect(d.action).toBe("revert");
  });

  it("admin reset to 0 → revert to open", () => {
    const d = decidePalletShipReadinessSync({
      status: "complete",
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

  it("quantity edit 120 → 119 → revert; 119 → 120 → complete", () => {
    expect(
      decidePalletShipReadinessSync({
        status: "complete",
        currentlyComplete: true,
        bottlesFilled: 119,
        minBottlesToShip: 120,
      }).action,
    ).toBe("revert");
    expect(
      decidePalletShipReadinessSync({
        status: "consolidating",
        currentlyComplete: false,
        bottlesFilled: 120,
        minBottlesToShip: 120,
      }).action,
    ).toBe("complete");
  });
});
