import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { mcpErrorResult, mcpJsonResult } from "../utils/tool-result";
import {
  findTop100ProducerExact,
  nearTop100ProducerMatches,
} from "../utils/top-100-match";
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
  if (findTop100ProducerExact(trimmed)) return null;
  const near = nearTop100ProducerMatches(trimmed);
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
    "search_systembolaget_products",
    {
      description:
        "Search/browse systembolaget_products for curation. query is optional when another filter is set. Returns count + results (cap 50).",
      inputSchema: {
        query: z
          .string()
          .min(2)
          .optional()
          .describe("Ilike on producer_name / name_bold / name_thin."),
        category: categorySchema.optional(),
        country: z
          .string()
          .optional()
          .describe("Exact country match, case-insensitive."),
        origin: z.string().optional().describe("Ilike on origin_level_1."),
        grapes: z
          .string()
          .optional()
          .describe("Ilike against any grape in the grapes array."),
        min_price: z.number().nonnegative().optional(),
        max_price: z.number().positive().optional(),
        is_organic: z.boolean().optional(),
        assortment: z
          .string()
          .optional()
          .describe("Ilike on assortment_text (e.g. Ordervaror, Tillfälligt)."),
        exclude_curated: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "When true, omit products already in systembolaget_curated.",
          ),
        vintage: z.number().int().optional(),
        min_alcohol: z.number().nonnegative().optional(),
        max_alcohol: z.number().positive().optional(),
      },
    },
    async (args) => {
      try {
        const {
          query,
          category,
          country,
          origin,
          grapes,
          min_price,
          max_price,
          is_organic,
          assortment,
          exclude_curated = false,
          vintage,
          min_alcohol,
          max_alcohol,
        } = args;

        const hasQuery = Boolean(query && query.trim().length >= 2);
        const hasOtherFilter = Boolean(
          category ||
            country ||
            origin ||
            grapes ||
            min_price != null ||
            max_price != null ||
            is_organic != null ||
            assortment ||
            exclude_curated ||
            vintage != null ||
            min_alcohol != null ||
            max_alcohol != null,
        );

        if (!hasQuery && !hasOtherFilter) {
          return mcpErrorResult(
            "Provide query and/or at least one filter (country, origin, grapes, price, is_organic, assortment, exclude_curated, vintage, alcohol, category).",
            "search_systembolaget_products",
          );
        }

        const RESULT_CAP = 50;
        // When grapes is filtered client-side, over-fetch then trim.
        const FETCH_CAP = grapes ? 400 : RESULT_CAP + 1;

        let q = sb
          .from("systembolaget_products")
          .select(
            [
              "product_number",
              "name_bold",
              "name_thin",
              "producer_name",
              "country",
              "origin_level_1",
              "price",
              "vintage",
              "alcohol_percentage",
              "grapes",
              "assortment_text",
              "is_available",
              "is_organic",
              "category_level_2",
            ].join(", "),
            { count: grapes ? undefined : "exact" },
          )
          .order("producer_name", { ascending: true })
          .limit(FETCH_CAP);

        if (hasQuery) {
          const safe = sanitizeSearchQuery(query!);
          if (safe.length < 2) {
            return mcpErrorResult(
              "query must be at least 2 characters after sanitising.",
              "search_systembolaget_products",
            );
          }
          const pattern = `%${safe}%`;
          const quoted = `"${pattern.replace(/"/g, "")}"`;
          q = q.or(
            `producer_name.ilike.${quoted},name_bold.ilike.${quoted},name_thin.ilike.${quoted}`,
          );
        }

        if (category) {
          const pat = CATEGORY_LEVEL_2_PATTERNS[category];
          if (pat) q = q.ilike("category_level_2", pat);
        }
        if (country) {
          // ILIKE without wildcards = case-insensitive exact match
          q = q.ilike("country", country.trim());
        }
        if (origin) {
          q = q.ilike("origin_level_1", `%${sanitizeSearchQuery(origin)}%`);
        }
        if (assortment) {
          q = q.ilike(
            "assortment_text",
            `%${sanitizeSearchQuery(assortment)}%`,
          );
        }
        if (min_price != null) q = q.gte("price", min_price);
        if (max_price != null) q = q.lte("price", max_price);
        if (is_organic != null) q = q.eq("is_organic", is_organic);
        if (vintage != null) q = q.eq("vintage", vintage);
        if (min_alcohol != null) q = q.gte("alcohol_percentage", min_alcohol);
        if (max_alcohol != null) q = q.lte("alcohol_percentage", max_alcohol);

        if (exclude_curated) {
          const { data: curatedRows, error: curatedError } = await sb
            .from("systembolaget_curated")
            .select("product_number");
          if (curatedError) {
            return mcpErrorResult(
              curatedError.message,
              "search_systembolaget_products",
            );
          }
          const taken = (curatedRows ?? [])
            .map((r) => r.product_number as string)
            .filter(Boolean);
          if (taken.length > 0) {
            q = q.not(
              "product_number",
              "in",
              `(${taken.map((n) => `"${n.replace(/"/g, "")}"`).join(",")})`,
            );
          }
        }

        // grapes is text[] — Postgres has no ilike on arrays; exclude empty when filtering
        if (grapes) {
          q = q.not("grapes", "eq", "{}");
        }

        const { data, error, count } = await q;
        if (error) {
          return mcpErrorResult(error.message, "search_systembolaget_products");
        }

        const grapeNeedle = grapes?.trim().toLowerCase() ?? "";
        let rows = data ?? [];
        if (grapeNeedle) {
          rows = rows.filter((row) => {
            const list = row.grapes as string[] | null;
            if (!list || list.length === 0) return false;
            return list.some((g) => g.toLowerCase().includes(grapeNeedle));
          });
        }

        const truncated =
          grapeNeedle
            ? (data?.length ?? 0) >= FETCH_CAP || rows.length > RESULT_CAP
            : (count ?? 0) > RESULT_CAP;

        const totalCount = grapeNeedle
          ? rows.length >= RESULT_CAP && (data?.length ?? 0) >= FETCH_CAP
            ? rows.length // lower bound when over-fetch saturated
            : rows.length
          : (count ?? rows.length);

        const sliced = rows.slice(0, RESULT_CAP);
        const results = sliced.map((row) => {
          const name = [row.name_bold, row.name_thin]
            .filter((p): p is string => Boolean(p && String(p).trim()))
            .join(" ")
            .trim();
          return {
            product_number: row.product_number,
            name: name || null,
            producer_name: row.producer_name,
            country: row.country,
            origin_level_1: row.origin_level_1,
            price: row.price,
            vintage: row.vintage,
            alcohol_percentage: row.alcohol_percentage,
            grapes: row.grapes,
            assortment_text: row.assortment_text,
            is_available: row.is_available,
            is_organic: row.is_organic,
          };
        });

        return mcpJsonResult(
          {
            count: grapeNeedle ? rows.length : totalCount,
            truncated,
            truncated_note: truncated
              ? `Results capped at ${RESULT_CAP}${grapeNeedle ? ` (grapes filter applied after fetch of up to ${FETCH_CAP})` : ""}.`
              : null,
            results,
          },
          {
            tool: "search_systembolaget_products",
            rowCount: results.length,
          },
        );
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
