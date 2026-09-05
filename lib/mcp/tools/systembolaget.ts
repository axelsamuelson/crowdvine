import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { mcpErrorResult, mcpJsonResult } from "../utils/tool-result";
import { mcpWriteTool } from "../utils/write-tool";

const categorySchema = z.enum([
  "red",
  "white",
  "orange",
  "sparkling",
  "rose",
  "budget",
]);

const verdictSchema = z.enum(["recommended", "avoid"]);

const CURATED_SELECT = [
  "id",
  "product_number",
  "verdict",
  "category",
  "editorial_note_sv",
  "editorial_note_en",
  "producer_note_sv",
  "producer_note_en",
  "top_100_producer_name",
  "sort_order",
  "is_published",
  "previous_sort_order",
  "first_published_at",
  "last_reviewed_at",
  "created_at",
  "updated_at",
].join(", ");

const HARDCODED_RANK_RE = /Rankad\s*#|Ranked\s*#|#\d+/i;

/** Systembolaget category_level_2 filters for curated category enums. */
const CATEGORY_LEVEL_2_PATTERNS: Record<
  z.infer<typeof categorySchema>,
  string | null
> = {
  red: "%Rött%",
  white: "%Vitt%",
  orange: "%Orange%",
  sparkling: "%Mousserande%",
  rose: "%Rosé%",
  budget: null,
};

function findTop100Exact(name: string) {
  return TOP_100_PRODUCERS.find((p) => p.name === name) ?? null;
}

function nearTop100Matches(input: string): string[] {
  const q = input.toLowerCase().trim();
  if (!q) return [];
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const hits = TOP_100_PRODUCERS.filter((p) => {
    const n = p.name.toLowerCase();
    if (n.includes(q) || q.includes(n)) return true;
    return words.some((w) => n.includes(w));
  });
  return hits.slice(0, 8).map((p) => `#${p.rank} ${p.name}`);
}

function rejectHardcodedRanks(
  producerNoteSv: string | null | undefined,
  producerNoteEn: string | null | undefined,
): string | null {
  for (const note of [producerNoteSv, producerNoteEn]) {
    if (!note) continue;
    // Allow {{rank}} token; reject literal numbers / "Rankad #".
    const withoutToken = note.replaceAll("{{rank}}", "");
    if (HARDCODED_RANK_RE.test(withoutToken)) {
      return 'Producer notes must use {{rank}} instead of a hardcoded number (e.g. "#12" or "Rankad #").';
    }
  }
  return null;
}

function validateTop100Name(name: string | null | undefined): string | null {
  if (name == null || name.trim() === "") return null;
  const trimmed = name.trim();
  if (findTop100Exact(trimmed)) return null;
  const near = nearTop100Matches(trimmed);
  const nearText =
    near.length > 0
      ? ` Near matches: ${near.join("; ")}.`
      : " No near matches in TOP_100_PRODUCERS.";
  return `top_100_producer_name must be an exact TOP_100_PRODUCERS name (got "${trimmed}").${nearText}`;
}

function sanitizeSearchQuery(q: string): string {
  return q.replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();
}

export function registerSystembolagetTools(
  server: McpServer,
  sb: SupabaseClient,
) {
  server.registerTool(
    "list_curated_entries",
    {
      description:
        "List systembolaget_curated rows (including unpublished). Returns every editorial column plus updated_at so another session can see what was already written and how fresh it is.",
      inputSchema: {
        category: categorySchema.optional(),
        verdict: verdictSchema.optional(),
        published: z
          .boolean()
          .optional()
          .describe("Filter by is_published. Omit to return both."),
      },
    },
    async ({ category, verdict, published }) => {
      try {
        let query = sb
          .from("systembolaget_curated")
          .select(CURATED_SELECT)
          .order("category", { ascending: true })
          .order("sort_order", { ascending: true });

        if (category) query = query.eq("category", category);
        if (verdict) query = query.eq("verdict", verdict);
        if (published !== undefined) {
          query = query.eq("is_published", published);
        }

        const { data, error } = await query;
        if (error) return mcpErrorResult(error.message, "list_curated_entries");
        const rows = data ?? [];
        return mcpJsonResult(rows, {
          tool: "list_curated_entries",
          rowCount: rows.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_curated_entries",
        );
      }
    },
  );

  server.registerTool(
    "list_guide_wines",
    {
      description:
        "List wines as visitors see them via systembolaget_guide_wines (published + available only).",
      inputSchema: {
        category: categorySchema,
        verdict: verdictSchema.optional().default("recommended"),
      },
    },
    async ({ category, verdict }) => {
      try {
        const { data, error } = await sb
          .from("systembolaget_guide_wines")
          .select("*")
          .eq("category", category)
          .eq("verdict", verdict ?? "recommended")
          .order("sort_order", { ascending: true })
          .order("price", { ascending: true });

        if (error) return mcpErrorResult(error.message, "list_guide_wines");
        const rows = data ?? [];
        return mcpJsonResult(rows, {
          tool: "list_guide_wines",
          rowCount: rows.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_guide_wines",
        );
      }
    },
  );

  server.registerTool(
    "get_top_100_producer",
    {
      description:
        "Look up an exact name in TOP_100_PRODUCERS. No fuzzy matching — used to validate top_100_producer_name before write.",
      inputSchema: {
        name: z.string().min(1).describe("Exact TopProducer.name"),
      },
    },
    async ({ name }) => {
      const match = findTop100Exact(name.trim());
      if (!match) {
        return mcpJsonResult(null, { tool: "get_top_100_producer", rowCount: 0 });
      }
      return mcpJsonResult(
        {
          rank: match.rank,
          name: match.name,
          region: match.region,
          country: match.country,
          grapes: match.grapes,
        },
        { tool: "get_top_100_producer", rowCount: 1 },
      );
    },
  );

  server.registerTool(
    "search_systembolaget_products",
    {
      description:
        "Search systembolaget_products by producer or wine name (ilike). Returns product_number needed to curate a wine.",
      inputSchema: {
        query: z.string().min(2),
        category: categorySchema.optional(),
        max_price: z.number().positive().optional(),
      },
    },
    async ({ query, category, max_price }) => {
      try {
        const safe = sanitizeSearchQuery(query);
        if (safe.length < 2) {
          return mcpJsonResult([], {
            tool: "search_systembolaget_products",
            rowCount: 0,
          });
        }

        const pattern = `%${safe}%`;
        const quoted = `"${pattern.replace(/"/g, "")}"`;

        let q = sb
          .from("systembolaget_products")
          .select(
            [
              "product_number",
              "name_bold",
              "name_thin",
              "producer_name",
              "price",
              "vintage",
              "is_available",
              "is_organic",
              "category_level_2",
            ].join(", "),
          )
          .or(
            `producer_name.ilike.${quoted},name_bold.ilike.${quoted},name_thin.ilike.${quoted}`,
          )
          .order("producer_name", { ascending: true })
          .limit(40);

        if (category) {
          const pat = CATEGORY_LEVEL_2_PATTERNS[category];
          if (pat) q = q.ilike("category_level_2", pat);
        }
        if (max_price != null) {
          q = q.lte("price", max_price);
        }

        const { data, error } = await q;
        if (error) {
          return mcpErrorResult(error.message, "search_systembolaget_products");
        }

        const rows = (data ?? []).map((row) => {
          const name = [row.name_bold, row.name_thin]
            .filter((p): p is string => Boolean(p && String(p).trim()))
            .join(" ")
            .trim();
          return {
            product_number: row.product_number,
            name: name || null,
            producer_name: row.producer_name,
            price: row.price,
            vintage: row.vintage,
            is_available: row.is_available,
            is_organic: row.is_organic,
          };
        });

        return mcpJsonResult(rows, {
          tool: "search_systembolaget_products",
          rowCount: rows.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "search_systembolaget_products",
        );
      }
    },
  );

  server.registerTool(
    "add_curated_wine",
    {
      description:
        "Insert a draft curated Systembolaget wine (always is_published=false). Publishing is done in /admin/systembolaget.",
      inputSchema: {
        product_number: z.string().min(1),
        category: categorySchema,
        verdict: verdictSchema,
        editorial_note_sv: z.string().min(1),
        editorial_note_en: z.string().optional().nullable(),
        producer_note_sv: z.string().optional().nullable(),
        producer_note_en: z.string().optional().nullable(),
        top_100_producer_name: z.string().optional().nullable(),
        sort_order: z.number().int().optional(),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "add_curated_wine",
        args as Record<string, unknown>,
        async () => {
          const productNumber = args.product_number.trim();

          const { data: product, error: productError } = await sb
            .from("systembolaget_products")
            .select("product_number")
            .eq("product_number", productNumber)
            .maybeSingle();

          if (productError) throw new Error(productError.message);
          if (!product) {
            throw new Error(
              `product_number "${productNumber}" does not exist in systembolaget_products.`,
            );
          }

          const { data: existing, error: existingError } = await sb
            .from("systembolaget_curated")
            .select(CURATED_SELECT)
            .eq("product_number", productNumber)
            .maybeSingle();

          if (existingError) throw new Error(existingError.message);
          if (existing) {
            throw new Error(
              `product_number "${productNumber}" is already curated. Existing row: ${JSON.stringify(existing)}`,
            );
          }

          const top100Error = validateTop100Name(args.top_100_producer_name);
          if (top100Error) throw new Error(top100Error);

          const rankError = rejectHardcodedRanks(
            args.producer_note_sv,
            args.producer_note_en,
          );
          if (rankError) throw new Error(rankError);

          const top100 =
            args.top_100_producer_name?.trim() || null;

          const { data, error } = await sb
            .from("systembolaget_curated")
            .insert({
              product_number: productNumber,
              category: args.category,
              verdict: args.verdict,
              editorial_note_sv: args.editorial_note_sv,
              editorial_note_en: args.editorial_note_en ?? null,
              producer_note_sv: args.producer_note_sv ?? null,
              producer_note_en: args.producer_note_en ?? null,
              top_100_producer_name: top100,
              sort_order: args.sort_order ?? 100,
              is_published: false,
            })
            .select(CURATED_SELECT)
            .single();

          if (error) throw new Error(error.message);
          return data;
        },
      );
    },
  );

  server.registerTool(
    "update_curated_wine",
    {
      description:
        "Update a curated Systembolaget wine by id. is_published cannot be changed here — use /admin/systembolaget.",
      inputSchema: {
        id: z.number().int().positive(),
        product_number: z.string().min(1).optional(),
        category: categorySchema.optional(),
        verdict: verdictSchema.optional(),
        editorial_note_sv: z.string().min(1).optional(),
        editorial_note_en: z.string().optional().nullable(),
        producer_note_sv: z.string().optional().nullable(),
        producer_note_en: z.string().optional().nullable(),
        top_100_producer_name: z.string().optional().nullable(),
        sort_order: z.number().int().optional(),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "update_curated_wine",
        args as Record<string, unknown>,
        async () => {
          const patch: Record<string, unknown> = {};

          if (args.product_number !== undefined) {
            const productNumber = args.product_number.trim();
            const { data: product, error: productError } = await sb
              .from("systembolaget_products")
              .select("product_number")
              .eq("product_number", productNumber)
              .maybeSingle();
            if (productError) throw new Error(productError.message);
            if (!product) {
              throw new Error(
                `product_number "${productNumber}" does not exist in systembolaget_products.`,
              );
            }

            const { data: conflict, error: conflictError } = await sb
              .from("systembolaget_curated")
              .select(CURATED_SELECT)
              .eq("product_number", productNumber)
              .neq("id", args.id)
              .maybeSingle();
            if (conflictError) throw new Error(conflictError.message);
            if (conflict) {
              throw new Error(
                `product_number "${productNumber}" is already curated on another row. Existing row: ${JSON.stringify(conflict)}`,
              );
            }
            patch.product_number = productNumber;
          }

          if (args.category !== undefined) patch.category = args.category;
          if (args.verdict !== undefined) patch.verdict = args.verdict;
          if (args.editorial_note_sv !== undefined) {
            patch.editorial_note_sv = args.editorial_note_sv;
          }
          if (args.editorial_note_en !== undefined) {
            patch.editorial_note_en = args.editorial_note_en;
          }
          if (args.producer_note_sv !== undefined) {
            patch.producer_note_sv = args.producer_note_sv;
          }
          if (args.producer_note_en !== undefined) {
            patch.producer_note_en = args.producer_note_en;
          }
          if (args.sort_order !== undefined) {
            patch.sort_order = args.sort_order;
          }

          if (args.top_100_producer_name !== undefined) {
            const top100Error = validateTop100Name(args.top_100_producer_name);
            if (top100Error) throw new Error(top100Error);
            patch.top_100_producer_name =
              args.top_100_producer_name?.trim() || null;
          }

          const rankError = rejectHardcodedRanks(
            args.producer_note_sv,
            args.producer_note_en,
          );
          if (rankError) throw new Error(rankError);

          if (Object.keys(patch).length === 0) {
            throw new Error("No updatable fields provided.");
          }

          const { data, error } = await sb
            .from("systembolaget_curated")
            .update(patch)
            .eq("id", args.id)
            .select(CURATED_SELECT)
            .single();

          if (error) throw new Error(error.message);
          if (!data) {
            throw new Error(`No curated row with id ${args.id}.`);
          }
          return data;
        },
      );
    },
  );
}
