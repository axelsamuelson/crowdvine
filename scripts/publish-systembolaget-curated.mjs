import { config } from "dotenv";
config({ path: ".env.local" });

const IDS = [
  118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132,
];

async function main() {
  const { publishCuratedById } =
    await import("../lib/systembolaget/publish-curated.ts");

  const published = [];
  const skipped = [];

  for (const id of IDS) {
    const result = await publishCuratedById(id);
    if (result.ok) {
      published.push(result);
      console.log("PUBLISHED", result);
    } else {
      skipped.push(result);
      console.log("SKIPPED", result);
    }
  }

  console.log(
    "RESULT_JSON=" +
      JSON.stringify({
        publishedCount: published.length,
        skippedCount: skipped.length,
        published,
        skipped,
      }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
