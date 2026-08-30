import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { runSystembolagetSync } = await import("../lib/systembolaget/sync");
  const result = await runSystembolagetSync();
  console.log("RESULT_JSON=" + JSON.stringify(result));
  if (!result.ok) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
