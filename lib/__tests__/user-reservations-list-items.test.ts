import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("GET /api/user/reservations list items", () => {
  it("loads order_reservation_items via batch wines join, not nested producer_decision_*", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/user/reservations/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/from\("order_reservation_items"\)/);
    expect(src).toMatch(/confirmationDisplayTotalSek/);
    expect(src).toMatch(/resolveWineImageSrc/);
    // Nested select of optional producer decision columns 42703'd on Preview.
    expect(src).not.toMatch(/producer_decision_status,/);
    expect(src).not.toMatch(/producer_approved_quantity,/);
    expect(src).toMatch(/isSharedPallet/);
    expect(src).toMatch(/shortReservationReference/);
  });

  it("profile reservations maps pending_producer_approval to waiting pallet copy", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/profile/reservations/page.tsx"),
      "utf8",
    );
    expect(page).toMatch(/waiting_pallet/);
    expect(page).toMatch(/resStatusWaitingPallet/);
    expect(page).toMatch(/successOnPallet/);
    expect(page).toMatch(/yourReservation/);
    expect(page).not.toMatch(/reservationsSubtitle/);

    const sv = JSON.parse(
      readFileSync(resolve(process.cwd(), "messages/sv.json"), "utf8"),
    );
    const en = JSON.parse(
      readFileSync(resolve(process.cwd(), "messages/en.json"), "utf8"),
    );
    expect(sv.profile.resStatusWaitingPallet).toBe(
      "Väntar på att pallen stänger",
    );
    expect(en.profile.resStatusWaitingPallet).toBe(
      "Waiting for the pallet to close",
    );
    expect(sv.profile.yourReservation).toBe("Din reservation");
  });
});
