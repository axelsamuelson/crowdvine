import { describe, expect, it } from "vitest";
import {
  matchesImageFilter,
  matchesLiveFilter,
  matchesSourceFilter,
} from "@/lib/admin/admin-wine-list-filters";

describe("admin wine list filters", () => {
  it("filters source as producer or wholesaler", () => {
    expect(matchesSourceFilter("producer", "producer")).toBe(true);
    expect(matchesSourceFilter("wholesaler", "producer")).toBe(false);
    expect(matchesSourceFilter("wholesaler", "wholesaler")).toBe(true);
    expect(matchesSourceFilter("wholesale", "wholesaler")).toBe(true);
    expect(matchesSourceFilter(null, "producer")).toBe(false);
    expect(matchesSourceFilter("producer", "all")).toBe(true);
  });

  it("filters live and hidden, treating unset as live", () => {
    expect(matchesLiveFilter(true, "live")).toBe(true);
    expect(matchesLiveFilter(undefined, "live")).toBe(true);
    expect(matchesLiveFilter(false, "live")).toBe(false);
    expect(matchesLiveFilter(false, "hidden")).toBe(true);
    expect(matchesLiveFilter(true, "hidden")).toBe(false);
    expect(matchesLiveFilter(false, "all")).toBe(true);
  });

  it("filters wines with and without an image", () => {
    expect(matchesImageFilter(true, "with")).toBe(true);
    expect(matchesImageFilter(false, "with")).toBe(false);
    expect(matchesImageFilter(false, "without")).toBe(true);
    expect(matchesImageFilter(true, "without")).toBe(false);
    expect(matchesImageFilter(false, "all")).toBe(true);
  });
});