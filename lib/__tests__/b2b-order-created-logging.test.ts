import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const logB2bOrderCreated = vi.fn();
const resolveIsFirstB2bOrder = vi.fn();

vi.mock("@/lib/analytics/b2b-events", async () => {
  const actual = await vi.importActual<typeof import("@/lib/analytics/b2b-events")>(
    "@/lib/analytics/b2b-events",
  );
  return {
    ...actual,
    logB2bOrderCreated: (...args: unknown[]) => logB2bOrderCreated(...args),
    resolveIsFirstB2bOrder: (...args: unknown[]) => resolveIsFirstB2bOrder(...args),
  };
});

import { createInvoiceDraft } from "@/lib/invoices/drafts";
import { createB2bOrderFromInvoice } from "@/lib/delivery-notes/b2b-orders";

const RECIPIENT_ID = "11111111-2222-4333-8444-555555555555";
const INVOICE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const USER_ID = "99999999-aaaa-4bbb-8ccc-dddddddddddd";
const LINE_ID = "cccccccc-dddd-4eee-8fff-000000000001";
const ORDER_ROW_ID = "dddddddd-eeee-4fff-8000-111111111111";

const recipientRow = {
  id: RECIPIENT_ID,
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  profile_id: null,
  company_name: "Test AB",
  email: "b2b@example.com",
  address: "Gatan 1",
  postal_code: "11122",
  city: "Stockholm",
  org_number: "556677-8899",
  invoice_recipient_contacts: [
    {
      id: "eeeeeeee-ffff-4000-8000-222222222222",
      recipient_id: RECIPIENT_ID,
      name: "Kontakt",
      email: "kontakt@example.com",
      phone: null,
      title: null,
      is_primary: true,
      created_at: "2026-09-01T00:00:00.000Z",
    },
  ],
};

function invoiceDbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_ID,
    invoice_number: "INV-100",
    status: "draft",
    recipient_id: RECIPIENT_ID,
    recipient_snapshot: null,
    sender_snapshot: {
      company_name: "Dirty Wine",
      from_name: "Dirty Wine",
      from_email: "orders@dirtywine.se",
      from_address: "Adress",
      from_postal_code: "11122",
      from_city: "Stockholm",
      from_country: "SE",
    },
    ship_to: null,
    invoice_date: null,
    delivery_date: null,
    payment_terms_days: 30,
    due_date: null,
    currency: "SEK",
    subtotal_ore: 10000,
    vat_ore: 2500,
    total_ore: 12500,
    notes: null,
    created_via: "admin",
    created_at: "2026-09-12T10:00:00.000Z",
    updated_at: "2026-09-12T10:00:00.000Z",
    issued_at: null,
    invoice_lines: [
      {
        id: LINE_ID,
        invoice_id: INVOICE_ID,
        position: 1,
        wine_id: null,
        description: "Testvin",
        vintage: null,
        quantity: 6,
        unit_price_ore: 10000,
        vat_rate: 25,
        line_total_ore: 10000,
      },
    ],
    invoice_recipients: {
      company_name: recipientRow.company_name,
      org_number: recipientRow.org_number,
      email: recipientRow.email,
      address: recipientRow.address,
      postal_code: recipientRow.postal_code,
      city: recipientRow.city,
      invoice_recipient_contacts: recipientRow.invoice_recipient_contacts,
    },
    ...overrides,
  };
}

function orderSummaryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ROW_ID,
    order_id: "INV-100",
    order_date: "2026-09-12",
    customer_name: "Test AB",
    customer_email: "b2b@example.com",
    total_cents: 12500,
    status: "Manuell faktura",
    created_at: "2026-09-12T11:00:00.000Z",
    ...overrides,
  };
}

type QueryResult = { data: unknown; error: null };

type FromHandler = (table: string, payload?: unknown) => QueryResult;

function makeSb(handler: FromHandler): SupabaseClient {
  return {
    from: (table: string) => {
      const state: { payload?: unknown } = {};
      const query: Record<string, unknown> = {};
      const chain = () => query;
      const resolve = () => handler(table, state.payload);
      Object.assign(query, {
        select: chain,
        insert: (payload: unknown) => {
          state.payload = payload;
          return query;
        },
        update: chain,
        eq: chain,
        in: chain,
        neq: chain,
        ilike: chain,
        gte: chain,
        lte: chain,
        order: chain,
        limit: chain,
        maybeSingle: async () => resolve(),
        single: async () => resolve(),
        then: (
          onFulfilled: (v: QueryResult) => unknown,
          onRejected?: (e: unknown) => unknown,
        ) => Promise.resolve(resolve()).then(onFulfilled, onRejected),
      });
      return query;
    },
  } as unknown as SupabaseClient;
}

describe("b2b_order_created logging", () => {
  beforeEach(() => {
    logB2bOrderCreated.mockReset();
    resolveIsFirstB2bOrder.mockReset();
    logB2bOrderCreated.mockResolvedValue(undefined);
    resolveIsFirstB2bOrder.mockResolvedValue(true);
  });

  it("does not log b2b_order_created when saving an invoice draft", async () => {
    const sb = makeSb((table, payload) => {
      if (table === "invoice_recipients") {
        return { data: recipientRow, error: null };
      }
      if (table === "invoices") {
        if (payload) return { data: { id: INVOICE_ID }, error: null };
        return { data: invoiceDbRow({ invoice_number: null }), error: null };
      }
      if (table === "invoice_lines") {
        return { data: null, error: null };
      }
      throw new Error(`unexpected table ${table}`);
    });

    await createInvoiceDraft(
      sb,
      {
        recipient_id: RECIPIENT_ID,
        lines: [
          {
            description: "Testvin",
            quantity: 6,
            unit_price_sek: 100,
          },
        ],
      },
      { createdVia: "admin", createdBy: USER_ID },
    );

    expect(logB2bOrderCreated).not.toHaveBeenCalled();
  });

  it("logs b2b_order_created exactly once for draft then create_b2b_order", async () => {
    let dirtyWineExists = false;

    const draftSb = makeSb((table, payload) => {
      if (table === "invoice_recipients") {
        return { data: recipientRow, error: null };
      }
      if (table === "invoices") {
        if (payload) return { data: { id: INVOICE_ID }, error: null };
        return { data: invoiceDbRow({ invoice_number: null }), error: null };
      }
      if (table === "invoice_lines") {
        return { data: null, error: null };
      }
      throw new Error(`unexpected table ${table}`);
    });

    await createInvoiceDraft(
      draftSb,
      {
        recipient_id: RECIPIENT_ID,
        lines: [
          {
            description: "Testvin",
            quantity: 6,
            unit_price_sek: 100,
          },
        ],
      },
      { createdVia: "admin", createdBy: USER_ID },
    );
    expect(logB2bOrderCreated).not.toHaveBeenCalled();

    const orderSb = makeSb((table, payload) => {
      if (table === "invoices") {
        return {
          data: invoiceDbRow({
            invoice_number: "INV-100",
            status: "issued",
            invoice_date: "2026-09-12",
          }),
          error: null,
        };
      }
      if (table === "dirty_wine_orders") {
        if (payload) {
          dirtyWineExists = true;
          return { data: orderSummaryRow(), error: null };
        }
        return {
          data: dirtyWineExists ? orderSummaryRow() : null,
          error: null,
        };
      }
      if (table === "invoice_sender_defaults") {
        return { data: null, error: null };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const created = await createB2bOrderFromInvoice(
      orderSb,
      { invoice_id: INVOICE_ID },
      USER_ID,
    );
    expect(created.already_exists).toBeUndefined();
    expect(logB2bOrderCreated).toHaveBeenCalledTimes(1);
    expect(logB2bOrderCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "INV-100",
        invoiceId: INVOICE_ID,
        orderType: "offline",
      }),
    );
  });

  it("does not log again when create_b2b_order returns already_exists", async () => {
    const orderSb = makeSb((table) => {
      if (table === "invoices") {
        return {
          data: invoiceDbRow({
            invoice_number: "INV-100",
            status: "issued",
            invoice_date: "2026-09-12",
          }),
          error: null,
        };
      }
      if (table === "dirty_wine_orders") {
        return { data: orderSummaryRow(), error: null };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const first = await createB2bOrderFromInvoice(
      orderSb,
      { invoice_id: INVOICE_ID },
      USER_ID,
    );
    expect(first.already_exists).toBe(true);
    expect(logB2bOrderCreated).not.toHaveBeenCalled();

    const second = await createB2bOrderFromInvoice(
      orderSb,
      { invoice_id: INVOICE_ID },
      USER_ID,
    );
    expect(second.already_exists).toBe(true);
    expect(logB2bOrderCreated).not.toHaveBeenCalled();
  });
});
