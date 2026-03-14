import { describe, it, expect } from "vitest";
import { sha256Hex } from "../checksum";

describe("sha256Hex", () => {
  it("returns hex string of 64 characters", () => {
    const hash = sha256Hex(Buffer.from("hello"));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for same input", () => {
    const buf = Buffer.from("same content");
    expect(sha256Hex(buf)).toBe(sha256Hex(buf));
  });

  it("differs for different input", () => {
    const h1 = sha256Hex(Buffer.from("a"));
    const h2 = sha256Hex(Buffer.from("b"));
    expect(h1).not.toBe(h2);
  });

  it("empty buffer produces valid hash", () => {
    const hash = sha256Hex(Buffer.alloc(0));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
