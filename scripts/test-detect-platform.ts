/**
 * Test platform detection from CLI. Run: pnpm exec tsx scripts/test-detect-platform.ts [url]
 * Default: https://www.cavepurjus.com/en
 */
import { detectPlatform } from "../lib/external-prices/detect-platform";

const url = process.argv[2] ?? "https://www.cavepurjus.com/en";

async function main() {
  console.log("Testing platform detection for:", url);
  try {
    const result = await detectPlatform(url);
    console.log("Result:", result ?? "null (ingen plattform identifierad)");
    process.exit(result ? 0 : 1);
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

main();
