import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  directBoxDropoffDeadlines,
  formatIsoDateUTC,
} from "@/lib/admin/direct-box-business-days";
import {
  boxesFromBottles,
  buildDirectBoxPickList,
} from "@/lib/admin/direct-box-pick-list";
import {
  ADDRESS_MISSING_LABEL,
  EMAIL_MISSING_LABEL,
} from "@/lib/admin/direct-box-pickup-addresses";

describe("direct-box business days", () => {
  it("skips weekends when adding business days", () => {
    // Friday 2026-11-06 → +1 = Monday 2026-11-09
    const fri = new Date(Date.UTC(2026, 10, 6));
    expect(formatIsoDateUTC(addBusinessDays(fri, 1))).toBe("2026-11-09");
    // +3 from Friday → Wed 2026-11-11
    expect(formatIsoDateUTC(addBusinessDays(fri, 3))).toBe("2026-11-11");
    // +5 from Friday → Fri 2026-11-13
    expect(formatIsoDateUTC(addBusinessDays(fri, 5))).toBe("2026-11-13");
  });

  it("computes target (+3) and latest (+5) Access Point dropoff deadlines", () => {
    const order = new Date(Date.UTC(2026, 10, 9)); // Monday
    const { targetDropoffAt, latestDropoffAt } =
      directBoxDropoffDeadlines(order);
    expect(formatIsoDateUTC(targetDropoffAt)).toBe("2026-11-12");
    expect(formatIsoDateUTC(latestDropoffAt)).toBe("2026-11-16"); // skips Sat/Sun
  });
});

describe("direct-box pick list boxes", () => {
  it("ceil-divides bottles by 6", () => {
    expect(boxesFromBottles(0)).toBe(0);
    expect(boxesFromBottles(1)).toBe(1);
    expect(boxesFromBottles(6)).toBe(1);
    expect(boxesFromBottles(7)).toBe(2);
    expect(boxesFromBottles(12)).toBe(2);
    expect(boxesFromBottles(18)).toBe(3);
  });

  it("groups by packing source and formats sender addresses + email", () => {
    const list = buildDirectBoxPickList({
      reservationId: "res-1",
      orderDate: "2026-11-09T10:00:00.000Z",
      items: [
        {
          wineId: "w1",
          wineName: "Syrah",
          vintage: "2022",
          quantity: 6,
          sourceType: "producer",
          producerId: "p1",
          producerName: "Domaine Alpha",
          producerAddressStreet: "12 Rue du Vin",
          producerAddressPostcode: "34000",
          producerAddressCity: "Montpellier",
          producerContactEmail: "alpha@example.com",
        },
        {
          wineId: "w2",
          wineName: "Grenache",
          quantity: 6,
          sourceType: "wholesaler",
          sourceName: "Le Clos Saint Gabriel",
          producerId: "p2",
          producerName: "Ignored for wholesaler key",
        },
        {
          wineId: "w3",
          wineName: "Carignan",
          quantity: 6,
          sourceType: "producer",
          producerId: "p3",
          producerName: "Sans Adress",
          // empty address + email → saknas
        },
      ],
    });

    expect(list.totalBottles).toBe(18);
    expect(list.totalBoxes).toBe(3);
    expect(list.targetDropoffIso).toBe("2026-11-12");
    expect(list.latestDropoffIso).toBe("2026-11-16");

    const alpha = list.sources.find((s) => s.sourceLabel === "Domaine Alpha");
    expect(alpha?.boxes).toBe(1);
    expect(alpha?.senderAddress).toBe("12 Rue du Vin, 34000 Montpellier");
    expect(alpha?.contactEmail).toBe("alpha@example.com");
    expect(alpha?.emailMissing).toBe(false);

    const clos = list.sources.find((s) =>
      s.sourceKey.includes("le clos saint gabriel"),
    );
    expect(clos?.senderAddress).toBe("Marché de Gros, Béziers");
    expect(clos?.boxes).toBe(1);
    expect(clos?.emailMissing).toBe(true);
    expect(clos?.contactEmail).toBeNull();

    const missing = list.sources.find((s) => s.sourceLabel === "Sans Adress");
    expect(missing?.senderAddress).toBe(ADDRESS_MISSING_LABEL);
    expect(missing?.addressMissing).toBe(true);
    expect(missing?.emailMissing).toBe(true);
    expect(missing?.producerId).toBe("p3");
    expect(EMAIL_MISSING_LABEL).toBe("E-post saknas");
    expect(alpha?.addressMissing).toBe(false);
    expect(clos?.addressMissing).toBe(false);
  });

  it("sums boxes per source when one source has 12 bottles", () => {
    const list = buildDirectBoxPickList({
      reservationId: "res-2",
      orderDate: new Date(Date.UTC(2026, 10, 10)),
      items: [
        {
          wineId: "a",
          wineName: "A",
          quantity: 8,
          sourceType: "producer",
          producerId: "px",
          producerName: "P",
          producerAddressStreet: "X",
          producerAddressCity: "Y",
          producerContactEmail: "p@example.com",
        },
        {
          wineId: "b",
          wineName: "B",
          quantity: 4,
          sourceType: "producer",
          producerId: "px",
          producerName: "P",
          producerAddressStreet: "X",
          producerAddressCity: "Y",
          producerContactEmail: "p@example.com",
        },
      ],
    });
    expect(list.sources).toHaveLength(1);
    expect(list.sources[0]!.bottles).toBe(12);
    expect(list.sources[0]!.boxes).toBe(2);
    expect(list.sources[0]!.wines).toHaveLength(2);
  });
});
