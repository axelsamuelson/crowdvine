import { describe, expect, it } from "vitest";
import {
  allowedDispatchTransitions,
  assertDispatchTransition,
  canTransitionDispatchStatus,
  DISPATCH_STATUS_LABELS_SV,
  normalizeDispatchStatus,
} from "@/lib/commerce/direct-box-dispatch";

describe("direct-box dispatch transitions", () => {
  it("normalizes null/unknown to pending_manual_handoff", () => {
    expect(normalizeDispatchStatus(null)).toBe("pending_manual_handoff");
    expect(normalizeDispatchStatus(undefined)).toBe("pending_manual_handoff");
    expect(normalizeDispatchStatus("nope")).toBe("pending_manual_handoff");
  });

  it("allows pending_manual_handoff → booked | skipped | cancelled", () => {
    expect(allowedDispatchTransitions("pending_manual_handoff")).toEqual([
      "booked",
      "skipped",
      "cancelled",
    ]);
    expect(canTransitionDispatchStatus(null, "booked")).toBe(true);
    expect(canTransitionDispatchStatus("pending_manual_handoff", "skipped")).toBe(
      true,
    );
    expect(
      canTransitionDispatchStatus("pending_manual_handoff", "cancelled"),
    ).toBe(true);
    expect(
      canTransitionDispatchStatus("pending_manual_handoff", "completed"),
    ).toBe(false);
  });

  it("allows booked → completed | cancelled", () => {
    expect(allowedDispatchTransitions("booked")).toEqual([
      "completed",
      "cancelled",
    ]);
    expect(canTransitionDispatchStatus("booked", "completed")).toBe(true);
    expect(canTransitionDispatchStatus("booked", "cancelled")).toBe(true);
    expect(canTransitionDispatchStatus("booked", "skipped")).toBe(false);
    expect(canTransitionDispatchStatus("booked", "pending_manual_handoff")).toBe(
      false,
    );
  });

  it("blocks transitions from terminal statuses", () => {
    for (const terminal of ["completed", "cancelled", "skipped"] as const) {
      expect(allowedDispatchTransitions(terminal)).toEqual([]);
      expect(canTransitionDispatchStatus(terminal, "booked")).toBe(false);
    }
  });

  it("assertDispatchTransition throws on illegal moves", () => {
    expect(() =>
      assertDispatchTransition("pending_manual_handoff", "completed"),
    ).toThrow(/Illegal/);
    expect(() => assertDispatchTransition("booked", "skipped")).toThrow(
      /Illegal/,
    );
    expect(assertDispatchTransition("booked", "completed")).toBe("completed");
  });

  it("uses Swedish ops labels without developer jargon", () => {
    expect(DISPATCH_STATUS_LABELS_SV.pending_manual_handoff).toBe(
      "Väntar på upphämtning",
    );
    expect(DISPATCH_STATUS_LABELS_SV.skipped).toBe("Skippad");
    expect(DISPATCH_STATUS_LABELS_SV.cancelled).toBe("Avbruten");
  });
});

describe("cancel dispatch dialog copy", () => {
  it("keeps question and uses Behåll / Avbryt leveransen", async () => {
    const { CANCEL_DISPATCH_DIALOG } = await import(
      "@/components/admin/direct-box-fulfillment-panel"
    );
    expect(CANCEL_DISPATCH_DIALOG.question).toBe(
      "Är du säker på att du vill avbryta den här direktleveransen?",
    );
    expect(CANCEL_DISPATCH_DIALOG.keep).toBe("Behåll");
    expect(CANCEL_DISPATCH_DIALOG.confirm).toBe("Avbryt leveransen");
  });
});
