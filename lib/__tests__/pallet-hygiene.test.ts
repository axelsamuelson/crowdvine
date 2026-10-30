import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMPTY_PALLET_CANCEL_AFTER_MS,
  namePalletForRoute,
  palletHasHistoryForCleanup,
  reservationEmptyActivityAt,
  resolveEmptySinceIso,
  shouldCancelEmptyPallet,
} from "@/lib/pallet-hygiene";

describe("namePalletForRoute", () => {
  it("names the first pallet without a number", () => {
    expect(namePalletForRoute("Languedoc", "Stockholm", 0)).toBe(
      "Languedoc to Stockholm",
    );
  });

  it("numbers a new pallet when the route already has older pallets", () => {
    expect(namePalletForRoute("Languedoc", "Stockholm", 1)).toBe(
      "Languedoc to Stockholm #2",
    );
    expect(namePalletForRoute("Region", "Zone", 3)).toBe("Region to Zone #4");
  });
});

describe("palletHasHistoryForCleanup", () => {
  it("treats reservations or bookings as history", () => {
    expect(
      palletHasHistoryForCleanup({ reservationCount: 1, bookingCount: 0 }),
    ).toBe(true);
    expect(
      palletHasHistoryForCleanup({ reservationCount: 0, bookingCount: 2 }),
    ).toBe(true);
  });

  it("allows delete only for virgin empties", () => {
    expect(
      palletHasHistoryForCleanup({ reservationCount: 0, bookingCount: 0 }),
    ).toBe(false);
  });
});

describe("empty-since + cancel decision", () => {
  const now = Date.parse("2026-10-30T12:00:00.000Z");

  it("uses reservation activity when present, else pallet created_at", () => {
    expect(
      resolveEmptySinceIso({
        palletCreatedAt: "2026-01-01T00:00:00.000Z",
        latestReservationActivityAt: "2026-10-01T00:00:00.000Z",
      }),
    ).toBe("2026-10-01T00:00:00.000Z");

    expect(
      resolveEmptySinceIso({
        palletCreatedAt: "2026-01-01T00:00:00.000Z",
        latestReservationActivityAt: null,
      }),
    ).toBe("2026-01-01T00:00:00.000Z");
  });

  it("picks the latest reservation activity fields", () => {
    expect(
      reservationEmptyActivityAt({
        created_at: "2026-01-01T00:00:00.000Z",
        cancelled_at: "2026-10-20T00:00:00.000Z",
        archived_at: null,
        producer_rejected_at: "2026-10-10T00:00:00.000Z",
      }),
    ).toBe("2026-10-20T00:00:00.000Z");
  });

  it("cancels when empty ≥ 7 days regardless of status (except cancelled)", () => {
    const emptySince = new Date(
      now - EMPTY_PALLET_CANCEL_AFTER_MS - 1000,
    ).toISOString();

    for (const status of [
      "open",
      "consolidating",
      "complete",
      "shipping_ordered",
      "awaiting_pickup",
    ]) {
      expect(
        shouldCancelEmptyPallet({
          status,
          bottles: 0,
          emptySinceIso: emptySince,
          nowMs: now,
        }),
      ).toBe(true);
    }

    expect(
      shouldCancelEmptyPallet({
        status: "cancelled",
        bottles: 0,
        emptySinceIso: emptySince,
        nowMs: now,
      }),
    ).toBe(false);
  });

  it("does not cancel when bottles remain or empty window is short", () => {
    const recent = new Date(now - EMPTY_PALLET_CANCEL_AFTER_MS + 60_000).toISOString();
    expect(
      shouldCancelEmptyPallet({
        status: "open",
        bottles: 1,
        emptySinceIso: "2020-01-01T00:00:00.000Z",
        nowMs: now,
      }),
    ).toBe(false);
    expect(
      shouldCancelEmptyPallet({
        status: "consolidating",
        bottles: 0,
        emptySinceIso: recent,
        nowMs: now,
      }),
    ).toBe(false);
  });
});

describe("migration 249_pallet_one_active_per_route", () => {
  const sql = readFileSync(
    join(process.cwd(), "migrations/249_pallet_one_active_per_route.sql"),
    "utf8",
  );

  it("fails clearly when duplicate accepting pallets exist on a route", () => {
    expect(sql).toContain("249_pallet_one_active_per_route aborted");
    expect(sql).toContain("duplicate route");
    expect(sql).toContain("RAISE EXCEPTION");
  });

  it("extends the unique index to open, consolidating, and complete", () => {
    expect(sql).toContain("uniq_pallets_open_shipping_region_delivery");
    expect(sql).toMatch(
      /WHERE status IN \('open', 'consolidating', 'complete'\)/,
    );
  });
});
