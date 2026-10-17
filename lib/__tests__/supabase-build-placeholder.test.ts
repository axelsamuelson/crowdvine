import { describe, expect, it } from "vitest";
import { isPlaceholderSupabaseUrl } from "@/lib/supabase-build-placeholder";

describe("isPlaceholderSupabaseUrl", () => {
  it("matches only the CI placeholder host", () => {
    expect(
      isPlaceholderSupabaseUrl("https://placeholder.supabase.co"),
    ).toBe(true);
    expect(
      isPlaceholderSupabaseUrl("https://abrnvjqwpdkodgrtezeg.supabase.co"),
    ).toBe(false);
    expect(isPlaceholderSupabaseUrl("")).toBe(false);
    expect(isPlaceholderSupabaseUrl("not a url")).toBe(false);
  });
});
