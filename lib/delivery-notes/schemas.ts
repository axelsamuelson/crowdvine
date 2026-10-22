import { z } from "zod";
import { zodMessage } from "@/lib/invoices/schemas";

const emptyToNull = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return value;
};

const optionalText = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value)),
);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ska vara YYYY-MM-DD");

const shipToSchema = z.object({
  name: z.string().trim().default(""),
  address: z.string().trim().default(""),
  postal_code: z.string().trim().default(""),
  city: z.string().trim().default(""),
  contact: optionalText.nullable().optional().transform((value) => value ?? null),
  country: optionalText.nullable().optional().transform((value) => value ?? null),
});

export const deliveryLineInputSchema = z
  .object({
    wine_id: z.string().uuid().optional(),
    description: z.string().trim().optional(),
    vintage: z.string().trim().optional(),
    quantity: z.number().positive("Antal måste vara större än 0"),
  })
  .refine(
    (line) => Boolean(line.wine_id) || Boolean(line.description && line.description.length > 0),
    "Varje rad behöver wine_id eller description",
  );

export const createDeliveryNoteObject = z.object({
  invoice_id: z.string().uuid("Ogiltigt faktura-id").optional(),
  recipient_id: z.string().uuid("Ogiltigt mottagar-id").optional(),
  delivery_date: dateSchema.optional(),
  notes: optionalText.nullable().optional(),
  ship_to: shipToSchema.nullable().optional(),
  lines: z.array(deliveryLineInputSchema).optional(),
});

export const createDeliveryNoteSchema = createDeliveryNoteObject.superRefine((value, ctx) => {
    if (!value.invoice_id && !value.recipient_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "invoice_id eller recipient_id krävs",
      });
    }
    if (!value.invoice_id && (!value.lines || value.lines.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Leveranssedeln behöver minst en rad",
      });
    }
  });

export const listDeliveryNotesSchema = z.object({
  recipient_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
});

export { zodMessage };
