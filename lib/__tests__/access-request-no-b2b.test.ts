import { describe, expect, it } from "vitest";

import { shouldShowNoB2bAccessMessage } from "@/lib/access-request/no-b2b";
import { translate } from "@/lib/i18n/messages";

describe("shouldShowNoB2bAccessMessage", () => {
  it("is false on pactwines.com even with reason=no_b2b", () => {
    expect(
      shouldShowNoB2bAccessMessage({
        reason: "no_b2b",
        host: "pactwines.com",
      }),
    ).toBe(false);
    expect(
      shouldShowNoB2bAccessMessage({
        reason: "no_b2b",
        host: "www.pactwines.com",
      }),
    ).toBe(false);
  });

  it("is true on dirtywine.se with reason=no_b2b", () => {
    expect(
      shouldShowNoB2bAccessMessage({
        reason: "no_b2b",
        host: "dirtywine.se",
      }),
    ).toBe(true);
    expect(
      shouldShowNoB2bAccessMessage({
        reason: "no_b2b",
        host: "www.dirtywine.se",
      }),
    ).toBe(true);
  });

  it("requires reason=no_b2b on Dirty Wine", () => {
    expect(
      shouldShowNoB2bAccessMessage({
        reason: undefined,
        host: "dirtywine.se",
      }),
    ).toBe(false);
  });

  it("on localhost requires ?b2b=1 plus reason=no_b2b", () => {
    expect(
      shouldShowNoB2bAccessMessage({
        reason: "no_b2b",
        host: "localhost",
        searchParams: { get: () => null },
      }),
    ).toBe(false);
    expect(
      shouldShowNoB2bAccessMessage({
        reason: "no_b2b",
        host: "localhost",
        searchParams: {
          get: (key) => (key === "b2b" ? "1" : null),
        },
      }),
    ).toBe(true);
  });
});

describe("accessRequest copy (handoff)", () => {
  it("matches Margaux SV strings and EN meta description", () => {
    expect(translate("en", "accessRequest.membersOnly")).toBe("Members only");
    expect(translate("sv", "accessRequest.membersOnly")).toBe(
      "Endast för medlemmar",
    );
    expect(translate("en", "accessRequest.tagline")).toBe(
      "Wine, but not like this.",
    );
    expect(translate("sv", "accessRequest.tagline")).toBe(
      "Vin, men inte så här.",
    );
    expect(translate("en", "accessRequest.invitationLine")).toBe(
      "Membership by invitation.",
    );
    expect(translate("sv", "accessRequest.invitationLine")).toBe(
      "Medlemskap via inbjudan.",
    );
    expect(translate("en", "accessRequest.goToPact")).toBe(
      "Go to pactwines.com",
    );
    expect(translate("sv", "accessRequest.goToPact")).toBe(
      "Gå till pactwines.com",
    );
    expect(translate("en", "accessRequest.noB2bMessage")).toBe(
      "Your account is not set up for Dirty Wine.",
    );
    expect(translate("sv", "accessRequest.noB2bMessage")).toBe(
      "Ditt konto är inte kopplat till Dirty Wine.",
    );
    expect(translate("en", "accessRequest.metaDescription")).toBe(
      "Wine club where members share pallets of natural wine from France.",
    );
    expect(translate("sv", "accessRequest.metaDescription")).toBe(
      "Vinklubb där medlemmarna delar pallar med naturvin från Frankrike.",
    );
  });
});
