import { describe, expect, it } from "vitest";

import {
  FETCH_TIMEOUT_MS,
  isOrdervarorPartitionKey,
  largestOrdervarorPartition,
  ORDERVAROR_PARTITION_CAP,
  shrinkExceedsLimit,
} from "@/lib/systembolaget/sync";

describe("FETCH_TIMEOUT_MS", () => {
  it("aborts the fetch phase at 220s for the measured post-fetch budget", () => {
    // 300s route − 55s measured post-fetch − 25s safety = 220s
    expect(FETCH_TIMEOUT_MS).toBe(220_000);
  });
});

describe("ordervaror partition cap", () => {
  it("is 9000 hits", () => {
    expect(ORDERVAROR_PARTITION_CAP).toBe(9_000);
  });

  it("recognises price-band and country keys", () => {
    expect(isOrdervarorPartitionKey("Ordervaror ≤250")).toBe(true);
    expect(isOrdervarorPartitionKey("Ordervaror · Frankrike")).toBe(true);
    expect(isOrdervarorPartitionKey("Fast sortiment")).toBe(false);
  });

  it("picks the largest partition by apiDocCount", () => {
    expect(
      largestOrdervarorPartition([
        { key: "Ordervaror · Italien", apiDocCount: 3130 },
        { key: "Ordervaror ≤250", apiDocCount: 6463 },
        { key: "Ordervaror · Frankrike", apiDocCount: 4066 },
      ]),
    ).toEqual({ key: "Ordervaror ≤250", apiDocCount: 6463 });
  });
});

describe("shrinkExceedsLimit", () => {
  it("allows an empty live table", () => {
    expect(shrinkExceedsLimit(0, 0)).toBe(false);
    expect(shrinkExceedsLimit(0, 100)).toBe(false);
  });

  it("allows a drop of exactly 5 percent", () => {
    expect(shrinkExceedsLimit(1000, 950)).toBe(false);
    expect(shrinkExceedsLimit(11640, 11058)).toBe(false);
  });

  it("refuses a drop of more than 5 percent", () => {
    expect(shrinkExceedsLimit(1000, 949)).toBe(true);
    expect(shrinkExceedsLimit(12799, 11640)).toBe(true);
  });

  it("allows a larger catalog", () => {
    expect(shrinkExceedsLimit(11640, 11651)).toBe(false);
  });
});
