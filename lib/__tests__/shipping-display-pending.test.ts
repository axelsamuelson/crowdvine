import { describe, expect, it } from "vitest";
import {
  resolveShippingDisplayPending,
  resolveShippingPreviewRetryVisible,
} from "@/lib/checkout/shipping-display-pending";

describe("resolveShippingDisplayPending", () => {
  it("is false before postal", () => {
    expect(
      resolveShippingDisplayPending({
        hasPostalCode: false,
        shippingSek: null,
        shippingPreviewStatus: "idle",
      }),
    ).toBe(false);
  });

  it("shows skeleton only while public shipping-preview is in flight", () => {
    expect(
      resolveShippingDisplayPending({
        hasPostalCode: true,
        shippingSek: null,
        shippingPreviewStatus: "loading",
      }),
    ).toBe(true);
    expect(
      resolveShippingDisplayPending({
        hasPostalCode: true,
        shippingSek: null,
        shippingPreviewStatus: "idle",
      }),
    ).toBe(true);
  });

  it("does not keep skeleton after preview settles (even without amount)", () => {
    // Root cause: waiting on quote/address left gray placeholders >25s.
    expect(
      resolveShippingDisplayPending({
        hasPostalCode: true,
        shippingSek: null,
        shippingPreviewStatus: "missing",
      }),
    ).toBe(false);
    expect(
      resolveShippingDisplayPending({
        hasPostalCode: true,
        shippingSek: null,
        shippingPreviewStatus: "ready",
      }),
    ).toBe(false);
  });

  it("clears pending as soon as preview (or quote) amount exists", () => {
    expect(
      resolveShippingDisplayPending({
        hasPostalCode: true,
        shippingSek: 99,
        shippingPreviewStatus: "loading",
      }),
    ).toBe(false);
    expect(
      resolveShippingDisplayPending({
        hasPostalCode: true,
        shippingSek: 149,
        shippingPreviewStatus: "idle",
      }),
    ).toBe(false);
  });

  it("never takes quoteStatus / channelTotalsPending as inputs (postal-first)", () => {
    // Guard: the helper API must stay free of authenticated quote fields so
    // guests are not blocked until ensure-session after full address.
    expect(resolveShippingDisplayPending.length).toBe(1);
    const src = resolveShippingDisplayPending.toString();
    expect(src).not.toMatch(/quoteStatus|channelTotalsPending|authReady/);
  });
});

describe("resolveShippingPreviewRetryVisible", () => {
  it("offers retry when postal known, no amount, preview missing", () => {
    expect(
      resolveShippingPreviewRetryVisible({
        hasPostalCode: true,
        shippingSek: null,
        shippingPreviewStatus: "missing",
      }),
    ).toBe(true);
  });

  it("hides retry while loading or when amount exists", () => {
    expect(
      resolveShippingPreviewRetryVisible({
        hasPostalCode: true,
        shippingSek: null,
        shippingPreviewStatus: "loading",
      }),
    ).toBe(false);
    expect(
      resolveShippingPreviewRetryVisible({
        hasPostalCode: true,
        shippingSek: 99,
        shippingPreviewStatus: "missing",
      }),
    ).toBe(false);
  });
});
