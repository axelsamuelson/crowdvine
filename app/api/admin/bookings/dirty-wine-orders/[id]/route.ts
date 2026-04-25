import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { computeInvoiceGrandTotal } from "@/lib/invoice-total";
import type { InvoiceData } from "@/types/invoice";
import {
  validateInvoiceForOrder,
  mapDbRowToDirtyWineOrder,
  parseInvoiceDataFromRow,
  type DirtyWineOrderDbRow,
} from "@/lib/dirty-wine-orders-server";

/**
 * GET /api/admin/bookings/dirty-wine-orders/[id]
 * Single order with full invoice_data.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data: row, error } = await sb
      .from("dirty_wine_orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("dirty_wine_orders GET [id]:", error);
      return NextResponse.json({ error: "Failed to fetch order", details: error.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const invoiceData = parseInvoiceDataFromRow(row.invoice_data);
    if (!invoiceData) {
      return NextResponse.json({ error: "Order has no invoice data" }, { status: 422 });
    }

    const order = mapDbRowToDirtyWineOrder(row as DirtyWineOrderDbRow);
    return NextResponse.json({
      order: { ...order, invoiceData },
    });
  } catch (error) {
    console.error("Error fetching dirty wine order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/bookings/dirty-wine-orders/[id]
 * Body: { invoice: InvoiceData }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const invoice = (body as { invoice?: InvoiceData }).invoice;
    if (!invoice || typeof invoice !== "object") {
      return NextResponse.json({ error: "Missing invoice" }, { status: 400 });
    }

    const err = validateInvoiceForOrder(invoice);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const totalSek = computeInvoiceGrandTotal(invoice);
    const totalCents = Math.max(0, Math.round(totalSek * 100));

    const sb = getSupabaseAdmin();
    const { data: existing } = await sb
      .from("dirty_wine_orders")
      .select("order_type")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (existing.order_type !== "offline") {
      return NextResponse.json({ error: "Only offline orders can be edited" }, { status: 403 });
    }

    const { data: updated, error } = await sb
      .from("dirty_wine_orders")
      .update({
        invoice_data: invoice as unknown as Record<string, unknown>,
        order_id: invoice.invoiceNumber.trim(),
        order_date: invoice.date || new Date().toISOString().slice(0, 10),
        customer_name: (invoice.toName ?? "").trim(),
        customer_email: (invoice.toEmail ?? "").trim(),
        total_cents: totalCents,
      })
      .eq("id", id)
      .select(
        "id, order_type, order_id, order_date, customer_name, customer_email, total_cents, status, created_at, invoice_data",
      )
      .maybeSingle();

    if (error) {
      console.error("dirty_wine_orders PATCH:", error);
      return NextResponse.json({ error: "Failed to update order", details: error.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order: mapDbRowToDirtyWineOrder(updated as DirtyWineOrderDbRow) });
  } catch (error) {
    console.error("Error updating dirty wine order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
