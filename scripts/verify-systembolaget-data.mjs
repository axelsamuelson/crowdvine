import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const PRODUCERS = [
  "Occhipinti",
  "Binner",
  "Colombaia",
  "Aphros",
  "La Baronne",
  "Sandrine Henriot",
  "Lissner",
  "Pranzegg",
];

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const total = await sb
    .from("systembolaget_products")
    .select("*", { count: "exact", head: true });
  const available = await sb
    .from("systembolaget_products")
    .select("*", { count: "exact", head: true })
    .eq("is_available", true);
  const staging = await sb
    .from("systembolaget_products_staging")
    .select("*", { count: "exact", head: true });
  const guide = await sb
    .from("systembolaget_guide_wines")
    .select("*", { count: "exact", head: true });

  console.log(
    JSON.stringify(
      {
        total: total.count,
        available: available.count,
        staging: staging.count,
        guide_wines: guide.count,
      },
      null,
      2,
    ),
  );

  for (const name of PRODUCERS) {
    const { data, error } = await sb
      .from("systembolaget_products")
      .select(
        "product_number, name_bold, name_thin, price, category_level_2, assortment_text, is_available, producer_name",
      )
      .ilike("producer_name", `%${name}%`)
      .order("price", { ascending: true });
    console.log(`\n== ${name} (${data?.length ?? 0})`, error?.message ?? "");
    for (const row of data ?? []) {
      console.log(
        [
          row.product_number,
          row.producer_name,
          row.name_bold,
          row.name_thin,
          row.price,
          row.category_level_2,
          row.assortment_text,
          `avail=${row.is_available}`,
        ].join(" | "),
      );
    }
  }

  // Admin search smoke (same query shape as API)
  const { data: searchHits, error: searchErr } = await sb
    .from("systembolaget_products")
    .select(
      "product_number, producer_name, name_bold, name_thin, price, is_available",
    )
    .or(
      'producer_name.ilike."%Occhipinti%",name_bold.ilike."%Occhipinti%",name_thin.ilike."%Occhipinti%"',
    )
    .limit(5);
  console.log("\n== admin search Occhipinti", {
    error: searchErr?.message,
    hits: searchHits?.length,
    sample: searchHits?.[0],
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
