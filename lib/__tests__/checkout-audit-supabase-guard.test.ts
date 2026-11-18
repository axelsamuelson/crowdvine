/**
 * Characterization: isolated Supabase ref guard (no network).
 */
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const script = join(
  process.cwd(),
  "scripts/checkout-audit/assert-isolated-supabase.mjs",
);

function run(arg: string) {
  return spawnSync(process.execPath, [script, arg], { encoding: "utf8" });
}

describe("checkout audit — isolated Supabase project guard", () => {
  it("accepts exact authorized ref msdfjrrokcmjifetuwgc", () => {
    const r = run("msdfjrrokcmjifetuwgc");
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.projectRef).toBe("msdfjrrokcmjifetuwgc");
  });

  it("accepts authorized project URL", () => {
    const r = run("https://msdfjrrokcmjifetuwgc.supabase.co");
    expect(r.status).toBe(0);
  });

  it("refuses production abrnvjqwpdkodgrtezeg", () => {
    const r = run("abrnvjqwpdkodgrtezeg");
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/REFUSED/);
  });

  it("refuses production supabase host URL", () => {
    const r = run("https://abrnvjqwpdkodgrtezeg.supabase.co");
    expect(r.status).toBe(2);
  });
});
