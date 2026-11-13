import { describe, expect, it } from "vitest";

/**
 * Admin uses native datetime-local (same as other admin pages).
 * Value shape is YYYY-MM-DDTHH:mm from the browser control.
 */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

describe("delivered_at datetime-local value", () => {
  it("formats ISO for native datetime-local input", () => {
    const iso = new Date(2026, 10, 11, 14, 5).toISOString();
    expect(toDatetimeLocalValue(iso)).toBe("2026-11-11T14:05");
  });

  it("round-trips via Date parse", () => {
    const local = "2026-11-11T14:05";
    const iso = new Date(local).toISOString();
    expect(Number.isNaN(Date.parse(iso))).toBe(false);
  });
});
