import { z } from "zod";

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

const optionalEmail = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Ogiltig e-post",
    )
    .transform((value) => (value === "" ? null : value)),
);

export const invoiceContactInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Varje kontaktperson måste ha ett namn"),
  email: optionalEmail.optional().default(""),
  phone: optionalText.optional().default(""),
  title: optionalText.optional().default(""),
  is_primary: z.boolean().default(false),
});

export const saveInvoiceRecipientSchema = z
  .object({
    id: z.string().uuid().optional(),
    company_name: z.string().trim().default(""),
    email: z
      .string()
      .trim()
      .min(1, "Fakturamejl krävs")
      .email("Fakturamejl måste vara en giltig e-postadress"),
    address: z.string().trim().default(""),
    postal_code: z.string().trim().default(""),
    city: z.string().trim().default(""),
    org_number: z.string().trim().default(""),
    profile_id: z
      .string()
      .uuid()
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    contacts: z.array(invoiceContactInputSchema).default([]),
  })
  .refine(
    (value) => value.contacts.filter((contact) => contact.is_primary).length <= 1,
    "Högst en kontakt kan vara primär",
  );

export type SaveInvoiceRecipientInput = z.infer<typeof saveInvoiceRecipientSchema>;

export const contactRowSchema = z.object({
  id: z.string().uuid(),
  recipient_id: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  title: z.string().nullable(),
  is_primary: z.boolean(),
  created_at: z.string().optional(),
});

export type InvoiceContact = z.infer<typeof contactRowSchema>;

export const recipientRowSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  profile_id: z.string().uuid().nullable(),
  company_name: z.string(),
  email: z.string(),
  address: z.string(),
  postal_code: z.string().nullable().optional().transform((value) => value ?? ""),
  city: z.string().nullable().optional().transform((value) => value ?? ""),
  org_number: z.string().nullable().optional().transform((value) => value ?? ""),
  invoice_recipient_contacts: z.array(contactRowSchema).optional().default([]),
});

export type InvoiceRecipientRecord = z.infer<typeof recipientRowSchema> & {
  contacts: InvoiceContact[];
  primary_contact: Pick<InvoiceContact, "name" | "email" | "phone" | "title"> | null;
};

const shipToSchema = z.object({
  name: z.string().trim().default(""),
  address: z.string().trim().default(""),
  postal_code: z.string().trim().default(""),
  city: z.string().trim().default(""),
  contact: optionalText.nullable().optional().transform((value) => value ?? null),
  country: optionalText.nullable().optional().transform((value) => value ?? null),
});

export const invoiceLineInputSchema = z
  .object({
    wine_id: z.string().uuid().optional(),
    description: z.string().trim().optional(),
    quantity: z.number().positive("Antal måste vara större än 0"),
    unit_price_sek: z.number().nonnegative("À-pris kan inte vara negativt"),
    vat_rate: z.number().min(0, "Momssats kan inte vara negativ").max(100).optional(),
  })
  .refine(
    (line) => Boolean(line.wine_id) || Boolean(line.description && line.description.length > 0),
    "Varje rad behöver wine_id eller description",
  );

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ska vara YYYY-MM-DD");

export const createInvoiceDraftSchema = z.object({
  recipient_id: z.string().uuid("Ogiltigt mottagar-id"),
  delivery_date: dateSchema.nullable().optional(),
  payment_terms_days: z.number().int().min(0).max(365).optional(),
  ship_to: shipToSchema.nullable().optional(),
  notes: optionalText.nullable().optional(),
  lines: z.array(invoiceLineInputSchema).min(1, "Fakturan behöver minst en rad"),
});

export const updateInvoiceDraftSchema = z.object({
  invoice_id: z.string().uuid("Ogiltigt faktura-id"),
  recipient_id: z.string().uuid().optional(),
  delivery_date: dateSchema.nullable().optional(),
  payment_terms_days: z.number().int().min(0).max(365).optional(),
  ship_to: shipToSchema.nullable().optional(),
  notes: optionalText.nullable().optional(),
  lines: z.array(invoiceLineInputSchema).min(1, "Fakturan behöver minst en rad").optional(),
});

export const listInvoicesSchema = z.object({
  status: z.enum(["draft", "issued", "paid", "void"]).optional(),
  recipient_id: z.string().uuid().optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const createRecipientToolSchema = z
  .object({
    company_name: z.string().trim().min(1, "Företagsnamn krävs"),
    org_number: z.string().trim().default(""),
    email: z
      .string()
      .trim()
      .min(1, "Fakturamejl krävs")
      .email("Fakturamejl måste vara en giltig e-postadress"),
    address: z.string().trim().default(""),
    postal_code: z.string().trim().default(""),
    city: z.string().trim().default(""),
    contacts: z.array(invoiceContactInputSchema).default([]),
  })
  .refine(
    (value) => value.contacts.filter((contact) => contact.is_primary).length <= 1,
    "Högst en kontakt kan vara primär",
  );

export const addContactToolSchema = invoiceContactInputSchema.extend({
  recipient_id: z.string().uuid("Ogiltigt mottagar-id"),
});

export const updateContactToolSchema = z.object({
  contact_id: z.string().uuid("Ogiltigt kontakt-id"),
  name: z.string().trim().min(1, "Kontaktperson måste ha ett namn").optional(),
  email: optionalEmail.optional(),
  phone: optionalText.nullable().optional(),
  title: optionalText.nullable().optional(),
  is_primary: z.boolean().optional(),
});

export function zodMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}
