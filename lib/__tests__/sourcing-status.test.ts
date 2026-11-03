import { describe, expect, it } from "vitest";

import {
  WineNotSourceableError,
  sourcingPublishResult,
} from "@/lib/sourcing-status";
import { producerPublicDocumentTitle } from "@/lib/seo/producer-profile-metadata";

describe("sourcing publish guard", () => {
  it("rejects unavailable wines that are set live", () => {
    expect(() => sourcingPublishResult(true, "unavailable")).toThrow(
      WineNotSourceableError,
    );
  });

  it("allows allocation with a warning and leaves other writes alone", () => {
    expect(sourcingPublishResult(true, "allocation")).toEqual({
      warning: "sourcing_allocation",
    });
    expect(sourcingPublishResult(false, "unavailable")).toEqual({});
    expect(sourcingPublishResult(true, "available")).toEqual({});
  });
});

describe("producer display name", () => {
  it("uses display name in the title and keeps the estate title otherwise", () => {
    expect(
      producerPublicDocumentTitle("Domaine Romaneaux-Destezet", "sv", "Rhône", {
        displayName: "Hervé Souhaut",
      }),
    ).toBe("Hervé Souhaut (Domaine Romaneaux-Destezet)");
    expect(
      producerPublicDocumentTitle("Domaine Romaneaux-Destezet", "sv", "Rhône"),
    ).toBe("Domaine Romaneaux-Destezet — naturvinproducent i Rhône");
  });
});
